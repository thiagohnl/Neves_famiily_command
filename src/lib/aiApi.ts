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
