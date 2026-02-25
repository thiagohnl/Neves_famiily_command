// src/hooks/useMeals.ts
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  listSavedMeals,
  createSavedMeal,
  deleteSavedMeal,
  listFreezer,
  addFreezerItem,
  deleteFreezerItem,
  updateFreezerQty,
  getPlannedWeek,
  planMeal,
  getTodayPlan,
  MealSlot,
} from '@/lib/mealsApi';

// ---------- Saved Meals ----------
export function useSavedMeals() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await listSavedMeals());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load saved meals');
    } finally {
      setLoading(false);
    }
  }

  async function add(name: string, emoji?: string, notes?: string) {
    const created = await createSavedMeal({ name, emoji, notes });
    setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
  }
  
  async function remove(id: string) {
    await deleteSavedMeal(id);
    setItems((prev) => prev.filter(item => item.id !== id));
  }

  useEffect(() => {
    refetch();
  }, []);

  return { items, loading, error, refetch, add, remove };
}

// ---------- Freezer ----------
export function useFreezerMeals() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await listFreezer());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load freezer');
    } finally {
      setLoading(false);
    }
  }

  async function add(input: { name: string; emoji?: string; notes?: string; quantity?: number; unit?: string; category?: string }) {
    const created = await addFreezerItem(input);
    setItems((prev) => [created, ...prev]);
  }

  async function adjustQty(id: string, delta: number) {
    const updated = await updateFreezerQty(id, delta);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }
  
  async function remove(id: string) {
    await deleteFreezerItem(id);
    setItems((prev) => prev.filter(item => item.id !== id));
  }

  useEffect(() => {
    refetch();
  }, []);

  return { items, loading, error, refetch, add, adjustQty, remove };
}

// ---------- Week Plan ----------
export type { MealSlot } from '@/lib/mealsApi';

export function useWeekMealPlan(weekStartISO: string) {
  const weekStart = useMemo(() => dayjs(weekStartISO), [weekStartISO]);
  const weekEndISO = useMemo(() => weekStart.add(6, 'day').format('YYYY-MM-DD'), [weekStart]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await getPlannedWeek(weekStartISO, weekEndISO));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load week');
    } finally {
      setLoading(false);
    }
  }

  async function plan(dateISO: string, slot: MealSlot, meal: { id?: string | null; name: string; emoji?: string | null }) {
    const saved = await planMeal(dateISO, slot, {
      id: meal.id ?? null,
      name: meal.name,
      emoji: meal.emoji ?? '🍽️',
    });
    setItems((prev) => {
      const without = prev.filter((r) => !(r.date === dateISO && r.slot === slot));
      return [...without, saved];
    });
  }

  useEffect(() => {
    refetch();
  }, [weekStartISO, weekStart]);

  return { items, loading, error, refetch, plan };
}

// ---------- Today (for dashboard/timeline) ----------
export function useTodayMeal() {
  const todayISO = dayjs().format('YYYY-MM-DD');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    try {
      setLoading(true);
      setItems(await getTodayPlan(todayISO));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load today');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, []);

  const lunch = items.find((r) => r.slot === 'lunch') ?? null;
  const dinner = items.find((r) => r.slot === 'dinner') ?? null;

  return { lunch, dinner, items, loading, error, refetch };
}