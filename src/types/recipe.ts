// src/types/recipe.ts
import type { PantryCategory } from '../constants/pantry';

export interface RecipeIngredient {
  text: string;             // original line in the source language, e.g. "2 dentes de alho picados"
  name: string;             // generic English pantry-style name, e.g. "Garlic"
  quantity: number | null;
  unit: string | null;      // pantry units (g, kg, can...) or cooking units (tsp, tbsp, cup, clove)
  emoji: string;
  category: PantryCategory;
  staple?: boolean;         // salt, pepper, water, oil: skipped for grocery list + pantry deduction
}

export interface SavedMeal {
  id: string;
  name: string;
  emoji: string | null;
  notes: string | null;
  meal_types: string[] | null;
  ingredients: RecipeIngredient[] | null;
  steps: string[] | null;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  recipe_source_url: string | null;
  recipe_image_url: string | null;
  created_at?: string;
}

// Recipe fields shared by create/update and the editor form
export interface RecipeFields {
  ingredients: RecipeIngredient[];
  steps: string[];
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  recipe_source_url: string | null;
  recipe_image_url: string | null;
}

export type SavedMealInput = {
  name: string;
  emoji?: string;
  notes?: string | null;
  meal_types?: string[];
} & Partial<RecipeFields>;

export function hasRecipe(meal: Pick<SavedMeal, 'ingredients' | 'steps'> | null | undefined): boolean {
  return !!meal && ((meal.ingredients?.length ?? 0) > 0 || (meal.steps?.length ?? 0) > 0);
}
