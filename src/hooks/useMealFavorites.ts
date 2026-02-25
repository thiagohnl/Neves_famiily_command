import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toggleFavorite as toggleFavoriteAPI } from '../lib/mealsApi';

interface MealWithStats {
  id: string;
  name: string;
  emoji: string | null;
  favorite_count?: number;
  is_favorited?: boolean;
}

export const useMealFavorites = (userId: string = 'family') => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const [lastUsedDates, setLastUsedDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meal_favorites')
        .select('meal_id');

      if (error) throw error;

      const userFavorites = data
        ?.filter(f => f.meal_id)
        .map(f => f.meal_id) || [];

      setFavorites(new Set(userFavorites));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, []);

  const fetchFavoriteCounts = useCallback(async () => {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('meal_favorites')
        .select('meal_id')
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(f => {
        if (f.meal_id) {
          counts[f.meal_id] = (counts[f.meal_id] || 0) + 1;
        }
      });

      setFavoriteCounts(counts);
    } catch (error) {
      console.error('Error fetching favorite counts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLastUsed = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('saved_meal_id, date')
        .not('saved_meal_id', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;

      const lastUsed: Record<string, string> = {};
      data?.forEach(plan => {
        if (plan.saved_meal_id && !lastUsed[plan.saved_meal_id]) {
          lastUsed[plan.saved_meal_id] = plan.date;
        }
      });

      setLastUsedDates(lastUsed);
    } catch (error) {
      console.error('Error fetching last used dates:', error);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
    fetchFavoriteCounts();
    fetchLastUsed();
  }, [fetchFavorites, fetchFavoriteCounts, fetchLastUsed]);

  const toggleFavorite = async (mealId: string) => {
    const isFavorited = favorites.has(mealId);

    const optimisticFavorites = new Set(favorites);
    const optimisticCounts = { ...favoriteCounts };

    if (isFavorited) {
      optimisticFavorites.delete(mealId);
      optimisticCounts[mealId] = Math.max(0, (optimisticCounts[mealId] || 0) - 1);
    } else {
      optimisticFavorites.add(mealId);
      optimisticCounts[mealId] = (optimisticCounts[mealId] || 0) + 1;
    }

    setFavorites(optimisticFavorites);
    setFavoriteCounts(optimisticCounts);

    try {
      await toggleFavoriteAPI(mealId, isFavorited);
      await fetchFavoriteCounts();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setFavorites(favorites);
      setFavoriteCounts(favoriteCounts);
    }
  };

  const isFavorite = (mealId: string) => favorites.has(mealId);
  const getFavoriteCount = (mealId: string) => favoriteCounts[mealId] || 0;
  const isFamilyFave = (mealId: string) => getFavoriteCount(mealId) >= 5;

  const isBackInRotation = (mealId: string, currentWeekStart: string) => {
    const lastUsed = lastUsedDates[mealId];
    if (!lastUsed) return false;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const lastUsedDate = new Date(lastUsed);
    const weekStartDate = new Date(currentWeekStart);

    return lastUsedDate < sixtyDaysAgo && lastUsedDate < weekStartDate;
  };

  return {
    favorites,
    favoriteCounts,
    lastUsedDates,
    loading,
    toggleFavorite,
    isFavorite,
    getFavoriteCount,
    isFamilyFave,
    isBackInRotation,
    refetch: () => {
      fetchFavorites();
      fetchFavoriteCounts();
      fetchLastUsed();
    }
  };
};

export const useMealSuggestions = () => {
  const [topPicks, setTopPicks] = useState<MealWithStats[]>([]);
  const [recentMeals, setRecentMeals] = useState<MealWithStats[]>([]);
  const [bringBackMeals, setBringBackMeals] = useState<MealWithStats[]>([]);

  const fetchTopPicks = useCallback(async () => {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: favData, error: favError } = await supabase
        .from('meal_favorites')
        .select('meal_id')
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (favError) throw favError;

      const counts: Record<string, number> = {};
      favData?.forEach(f => {
        if (f.meal_id) {
          counts[f.meal_id] = (counts[f.meal_id] || 0) + 1;
        }
      });

      const topMealIds = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      if (topMealIds.length === 0) {
        setTopPicks([]);
        return;
      }

      const { data: meals, error: mealsError } = await supabase
        .from('saved_meals')
        .select('id, name, emoji')
        .in('id', topMealIds);

      if (mealsError) throw mealsError;

      const mealsWithCounts = meals?.map(meal => ({
        ...meal,
        favorite_count: counts[meal.id] || 0
      })).sort((a, b) => (b.favorite_count || 0) - (a.favorite_count || 0)) || [];

      setTopPicks(mealsWithCounts);
    } catch (error) {
      console.error('Error fetching top picks:', error);
    }
  }, []);

  const fetchRecentMeals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          meal_name,
          meal_emoji,
          saved_meal_id
        `)
        .not('saved_meal_id', 'is', null)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      const uniqueMeals = new Map<string, MealWithStats>();
      data?.forEach(plan => {
        if (plan.saved_meal_id && !uniqueMeals.has(plan.saved_meal_id)) {
          uniqueMeals.set(plan.saved_meal_id, {
            id: plan.saved_meal_id,
            name: plan.meal_name,
            emoji: plan.meal_emoji
          });
        }
      });

      setRecentMeals(Array.from(uniqueMeals.values()).slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent meals:', error);
    }
  }, []);

  const fetchBringBackMeals = useCallback(async () => {
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: allMeals, error: mealsError } = await supabase
        .from('saved_meals')
        .select('id, name, emoji');

      if (mealsError) throw mealsError;

      const { data: recentPlans, error: plansError } = await supabase
        .from('meal_plans')
        .select('saved_meal_id, date')
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
        .not('saved_meal_id', 'is', null);

      if (plansError) throw plansError;

      const recentMealIds = new Set(recentPlans?.map(p => p.saved_meal_id) || []);

      const oldMeals = allMeals?.filter(meal => !recentMealIds.has(meal.id)) || [];

      setBringBackMeals(oldMeals.slice(0, 10));
    } catch (error) {
      console.error('Error fetching bring back meals:', error);
    }
  }, []);

  useEffect(() => {
    fetchTopPicks();
    fetchRecentMeals();
    fetchBringBackMeals();
  }, [fetchTopPicks, fetchRecentMeals, fetchBringBackMeals]);

  return {
    topPicks,
    recentMeals,
    bringBackMeals,
    refetch: () => {
      fetchTopPicks();
      fetchRecentMeals();
      fetchBringBackMeals();
    }
  };
};
