// src/lib/recipeApi.ts
import { compressImage } from './aiApi';
import type { RecipeIngredient } from '../types/recipe';

export interface ImportedRecipe {
  name: string;
  emoji: string;
  meal_types: string[];
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes: string | null;
  source_url: string | null;
  /** Cover image to store: the link's preview image, or the uploaded photo Claude picked as the dish */
  cover: Blob | null;
}

export class RecipeImportError extends Error {
  constructor(message: string, public readonly suggestFallback: boolean) {
    super(message);
  }
}

function base64ToBlob(base64: string, mediaType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mediaType });
}

async function requestImport(body: Record<string, unknown>, photos: File[] = []): Promise<{ recipe: ImportedRecipe; warnings: string[] }> {
  const res = await fetch('/api/import-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new RecipeImportError(err.error || `Import failed (${res.status})`, err.fallback === 'paste_or_screenshot');
  }

  const { recipe, warnings } = await res.json();
  const cover = recipe.image_base64
    ? base64ToBlob(recipe.image_base64, recipe.image_media_type || 'image/jpeg')
    : recipe.cover_image_index != null
      ? photos[recipe.cover_image_index] ?? null
      : null;

  return {
    recipe: {
      name: recipe.name,
      emoji: recipe.emoji,
      meal_types: recipe.meal_types,
      servings: recipe.servings,
      prep_minutes: recipe.prep_minutes,
      cook_minutes: recipe.cook_minutes,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      notes: recipe.notes,
      source_url: recipe.source_url,
      cover,
    },
    warnings: warnings ?? [],
  };
}

export function importRecipeFromUrl(url: string) {
  return requestImport({ url });
}

export async function importRecipeFromPhotos(files: File[]) {
  const photos = files.slice(0, 4);
  // Four photos must fit in one 4.5MB request body, so shrink them a little more than a single scan
  const images = await Promise.all(
    photos.map(async (file) => {
      const { base64, mediaType } = await compressImage(file, 1400, 0.75);
      return { data: base64, mediaType };
    })
  );
  return requestImport({ images }, photos);
}

export function importRecipeFromText(text: string) {
  return requestImport({ text });
}
