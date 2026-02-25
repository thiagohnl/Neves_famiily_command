// src/lib/mealsApi.ts
import { supabase } from './supabase';

const FAMILY_ID = 'default';
const USER_ID = 'family';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

// -------- Saved Meals --------
export async function listSavedMeals() {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSavedMeal(input: { name: string; emoji?: string; notes?: string; meal_types?: string[] }) {
  const { data, error } = await supabase
    .from('saved_meals')
    .insert({
      family_id: FAMILY_ID,
      name: input.name,
      emoji: input.emoji ?? '🍽️',
      notes: input.notes ?? null,
      meal_types: input.meal_types ?? ['lunch', 'dinner'],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSavedMeal(id: string, input: { name?: string; emoji?: string; notes?: string; meal_types?: string[] }) {
  const { data, error } = await supabase
    .from('saved_meals')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.emoji !== undefined && { emoji: input.emoji }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.meal_types !== undefined && { meal_types: input.meal_types }),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSavedMeal(id: string) {
  const { error } = await supabase
    .from('saved_meals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// -------- Freezer --------
export async function listFreezer() {
  const { data, error } = await supabase
    .from('freezer_meals')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteFreezerItem(id: string) {
  const { error } = await supabase
    .from('freezer_meals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function addFreezerItem(input: {
  name: string;
  emoji?: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  category?: string;
}) {
  const { data, error } = await supabase
    .from('freezer_meals')
    .insert({
      family_id: FAMILY_ID,
      name: input.name,
      emoji: input.emoji ?? '🥶',
      notes: input.notes ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? 'meal',
      category: input.category ?? null,
      in_stock: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFreezerQty(id: string, delta: number) {
  const { data: current, error: getErr } = await supabase
    .from('freezer_meals')
    .select('quantity')
    .eq('id', id)
    .eq('family_id', FAMILY_ID)
    .single();
  if (getErr) throw getErr;

  const newQty = Math.max(0, (current?.quantity ?? 0) + delta);

  const { data, error } = await supabase
    .from('freezer_meals')
    .update({ quantity: newQty, in_stock: newQty > 0 })
    .eq('id', id)
    .eq('family_id', FAMILY_ID)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------- Week Planning --------

export async function planMeal(date: string, slot: MealSlot, meal: { id: string | null; name: string; emoji: string | null }) {
  const payload: Record<string, any> = {
    date,
    meal_type: slot,
    meal_id: meal.id,
  };

  if (meal.emoji) {
    payload.meal_emoji = meal.emoji;
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .upsert(payload, { onConflict: 'date,meal_type' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPlannedWeek(startISO: string, endISO: string) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, date, meal_type, meal_id, meal_emoji, saved_meals:meal_id(id,name,emoji)')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    date: item.date,
    meal_type: item.meal_type,
    slot: item.meal_type as MealSlot,
    saved_meal_id: item.meal_id,
    meal_name: item.saved_meals?.name || 'Unknown Meal',
    meal_emoji: item.meal_emoji || item.saved_meals?.emoji || '🍽️',
  }));
}

export async function deletePlannedMeal(date: string, slot: MealSlot) {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('date', date)
    .eq('meal_type', slot);
  if (error) throw error;
}

export async function changePlannedMealSlot(date: string, oldSlot: MealSlot, newSlot: MealSlot) {
  const { data: existing, error: fetchError } = await supabase
    .from('meal_plans')
    .select('meal_id, meal_emoji')
    .eq('date', date)
    .eq('meal_type', oldSlot)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return;

  await deletePlannedMeal(date, oldSlot);

  const payload: Record<string, any> = {
    date,
    meal_type: newSlot,
    meal_id: existing.meal_id,
  };

  if (existing.meal_emoji) {
    payload.meal_emoji = existing.meal_emoji;
  }

  const { error: upsertError } = await supabase
    .from('meal_plans')
    .upsert(payload, { onConflict: 'date,meal_type' });

  if (upsertError) throw upsertError;
}

export async function getTodayPlan(todayISO: string) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, date, meal_type, meal_id, meal_emoji, saved_meals:meal_id(id,name,emoji)')
    .eq('date', todayISO);

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    date: item.date,
    meal_type: item.meal_type,
    slot: item.meal_type as MealSlot,
    saved_meal_id: item.meal_id,
    meal_name: item.saved_meals?.name || 'Unknown Meal',
    meal_emoji: item.meal_emoji || item.saved_meals?.emoji || '🍽️',
  }));
}

// -------- Favorites --------

export async function toggleFavorite(mealId: string, isFavorited: boolean) {
  if (isFavorited) {
    const { error } = await supabase
      .from('meal_favorites')
      .delete()
      .eq('meal_id', mealId)
      .eq('user_id', USER_ID);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('meal_favorites')
      .insert({ meal_id: mealId, user_id: USER_ID });
    if (error) throw error;
  }
}

export async function checkFavoritesTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('meal_favorites')
      .select('count')
      .limit(0);
    return !error;
  } catch {
    return false;
  }
}
