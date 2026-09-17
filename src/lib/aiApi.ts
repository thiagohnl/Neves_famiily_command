// src/lib/aiApi.ts

export interface MealSuggestion {
  name: string;
  emoji: string;
  reason: string;
  is_new: boolean;
}

export interface DaySuggestion {
  day: string;
  breakfast: MealSuggestion;
  lunch: MealSuggestion;
  dinner: MealSuggestion;
}

export interface AISuggestionsResponse {
  suggestions: {
    days: DaySuggestion[];
  };
}

export interface ScannedPantryItem {
  name: string;
  emoji: string;
  category: string;
  location: 'fridge' | 'freezer' | 'cupboard';
  quantity: number;
  unit: string;
}

// Downscale + re-encode a photo so the upload stays small (phone photos can be 5MB+,
// and Vercel serverless bodies are capped at 4.5MB).
function drawScaled(bitmap: ImageBitmap, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function compressImage(image: Blob, maxDimension = 1568, quality = 0.8): Promise<{ base64: string; mediaType: string }> {
  const canvas = drawScaled(await createImageBitmap(image), maxDimension);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}

export async function compressImageToBlob(image: Blob, maxDimension = 1200, quality = 0.82): Promise<{ blob: Blob }> {
  const canvas = drawScaled(await createImageBitmap(image), maxDimension);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not process image');
  return { blob };
}

async function requestScan(body: Record<string, unknown>): Promise<ScannedPantryItem[]> {
  const res = await fetch('/api/scan-pantry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Scan failed (${res.status})`);
  }

  const data = await res.json();
  return (data.items ?? []) as ScannedPantryItem[];
}

export async function scanGroceriesPhoto(file: File): Promise<ScannedPantryItem[]> {
  const { base64, mediaType } = await compressImage(file);
  return requestScan({ image: base64, mediaType });
}

export async function parseGroceriesText(text: string): Promise<ScannedPantryItem[]> {
  return requestScan({ text });
}

export interface MealDeduction {
  id: string;
  name: string;
  quantity: number;
}

export async function getCookedMealDeductions(
  mealName: string,
  pantryItems: { id: string; name: string; quantity: number; unit: string; location: string }[]
): Promise<MealDeduction[]> {
  const res = await fetch('/api/cook-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealName, pantryItems }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  const data = await res.json();
  return (data.deductions ?? []) as MealDeduction[];
}

export async function getAIMealSuggestions(context: {
  pantryItems: any[];
  savedMeals: any[];
  recentMealPlan: any[];
  favorites: string[];
  expiringItems: any[];
}): Promise<AISuggestionsResponse> {
  const res = await fetch('/api/suggest-meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }

  return res.json();
}
