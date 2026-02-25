// src/data/mealPlans.ts
import { supabase } from '@/lib/supabase';
import type { PlanInsert } from '@/types/meal-plan';

export async function upsertMealPlanSafe(input: PlanInsert) {
  // Sanitize: build payload with only allowed keys
  const payload: Record<string, any> = {
    date: input.date,
    meal_type: input.meal_type,
    meal_id: input.meal_id ?? null,
  };

  // Only add meal_emoji if it's a string
  if (typeof input.meal_emoji === 'string') {
    payload.meal_emoji = input.meal_emoji;
  }

  const { error } = await supabase
    .from('meal_plans')
    .upsert(payload, { onConflict: 'date,meal_type' });

  if (error) {
    console.error('[upsertMealPlanSafe]', error);
    throw new Error(error.message);
  }
}
