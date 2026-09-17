// src/lib/mealsApi.ts
import { supabase } from './supabase';
import { compressImageToBlob } from './aiApi';
import { hasRecipe, type RecipeFields, type SavedMeal, type SavedMealInput } from '../types/recipe';

const FAMILY_ID = 'default';
const USER_ID = 'family';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

// -------- Saved Meals --------
export async function listSavedMeals(): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('family_id', FAMILY_ID)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavedMeal[];
}

export async function getSavedMeal(id: string): Promise<SavedMeal | null> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as SavedMeal) ?? null;
}

export async function createSavedMeal(input: SavedMealInput): Promise<SavedMeal> {
  const { data, error } = await supabase
    .from('saved_meals')
    .insert({
      family_id: FAMILY_ID,
      name: input.name,
      emoji: input.emoji ?? '🍽️',
      notes: input.notes ?? null,
      meal_types: input.meal_types ?? ['lunch', 'dinner'],
      ...recipeColumns(input),
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedMeal;
}

export async function updateSavedMeal(id: string, input: Partial<SavedMealInput>): Promise<SavedMeal> {
  const { data, error } = await supabase
    .from('saved_meals')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.emoji !== undefined && { emoji: input.emoji }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.meal_types !== undefined && { meal_types: input.meal_types }),
      ...recipeColumns(input),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SavedMeal;
}

// Only the recipe fields that were actually passed, so partial updates leave the rest untouched
function recipeColumns(input: Partial<RecipeFields>): Partial<RecipeFields> {
  const keys: (keyof RecipeFields)[] = [
    'ingredients', 'steps', 'servings', 'prep_minutes', 'cook_minutes', 'recipe_source_url', 'recipe_image_url',
  ];
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out as Partial<RecipeFields>;
}

export async function uploadRecipePhoto(image: Blob, mealId: string): Promise<string> {
  const { blob } = await compressImageToBlob(image, 1200, 0.82);
  const fileName = `${mealId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('recipe-photos')
    .upload(fileName, blob, { cacheControl: '31536000', contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(fileName);
  return data.publicUrl;
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
    meal_name: meal.name,
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

  return {
    id: data.id,
    date: data.date,
    meal_type: data.meal_type,
    slot: data.meal_type as MealSlot,
    saved_meal_id: data.meal_id,
    meal_name: data.meal_name || meal.name,
    meal_emoji: data.meal_emoji || meal.emoji || '🍽️',
    // sides are deliberately absent from the upsert payload: the partial
    // ON CONFLICT update leaves the existing value untouched
    sides: data.sides ?? [],
  };
}

export async function getPlannedWeek(startISO: string, endISO: string) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, date, meal_type, meal_id, meal_name, meal_emoji, sides, saved_meals:meal_id(id,name,emoji,ingredients,steps)')
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
    meal_name: item.saved_meals?.name || item.meal_name || 'Unknown Meal',
    meal_emoji: item.meal_emoji || item.saved_meals?.emoji || '🍽️',
    sides: item.sides ?? [],
    has_recipe: hasRecipe(item.saved_meals),
  }));
}

export async function updatePlannedMealSides(date: string, slot: MealSlot, sides: string[]) {
  const { data, error } = await supabase
    .from('meal_plans')
    .update({ sides })
    .eq('date', date)
    .eq('meal_type', slot)
    .select('sides')
    .single();
  if (error) throw error;
  return (data?.sides ?? []) as string[];
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
    .select('meal_id, meal_name, meal_emoji, sides')
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
    meal_name: existing.meal_name,
    sides: existing.sides ?? [],
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
    .select('id, date, meal_type, meal_id, meal_name, meal_emoji, sides, saved_meals:meal_id(id,name,emoji,ingredients,steps)')
    .eq('date', todayISO);

  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    id: item.id,
    date: item.date,
    meal_type: item.meal_type,
    slot: item.meal_type as MealSlot,
    saved_meal_id: item.meal_id,
    meal_name: item.saved_meals?.name || item.meal_name || 'Unknown Meal',
    meal_emoji: item.meal_emoji || item.saved_meals?.emoji || '🍽️',
    sides: item.sides ?? [],
    has_recipe: hasRecipe(item.saved_meals),
  }));
}

// -------- Week Actions --------

export async function copyWeekPlan(sourceStartISO: string, sourceEndISO: string, targetStartISO: string) {
  const sourcePlan = await getPlannedWeek(sourceStartISO, sourceEndISO);
  if (sourcePlan.length === 0) throw new Error('No meals to copy from last week');

  const sourceStartMs = new Date(sourceStartISO).getTime();
  const targetStartMs = new Date(targetStartISO).getTime();
  const dayMs = 86400000;

  const inserts = sourcePlan.map((item) => {
    const dayOffset = Math.round((new Date(item.date).getTime() - sourceStartMs) / dayMs);
    const targetDate = new Date(targetStartMs + dayOffset * dayMs);
    const targetDateISO = targetDate.toISOString().split('T')[0];

    return {
      date: targetDateISO,
      meal_type: item.meal_type,
      meal_id: item.saved_meal_id || null,
      meal_name: item.meal_name,
      meal_emoji: item.meal_emoji,
      sides: item.sides ?? [],
    };
  });

  const { error } = await supabase
    .from('meal_plans')
    .upsert(inserts, { onConflict: 'date,meal_type' });

  if (error) throw error;
}

export async function clearWeekPlan(startISO: string, endISO: string) {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .gte('date', startISO)
    .lte('date', endISO);

  if (error) throw error;
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
