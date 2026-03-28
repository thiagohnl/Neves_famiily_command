// src/hooks/useAIMealSuggestions.ts
import { useState } from 'react';
import { getAIMealSuggestions, type DaySuggestion } from '@/lib/aiApi';

export function useAIMealSuggestions() {
  const [suggestions, setSuggestions] = useState<DaySuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSuggestions(context: {
    pantryItems: any[];
    savedMeals: any[];
    recentMealPlan: any[];
    favorites: string[];
    expiringItems: any[];
  }) {
    setLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const response = await getAIMealSuggestions(context);
      setSuggestions(response.suggestions.days);
      return response.suggestions.days;
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to get AI suggestions';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function clearSuggestions() {
    setSuggestions(null);
    setError(null);
  }

  return { suggestions, loading, error, generateSuggestions, clearSuggestions };
}
