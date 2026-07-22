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
async function compressImage(file: File, maxDimension = 1568, quality = 0.8): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
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
