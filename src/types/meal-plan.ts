// src/types/meal-plan.ts

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type PlanInsert = {
  date: string;                 // 'YYYY-MM-DD'
  meal_type: MealType;
  meal_id: string | null;       // saved_meals.id or null
  meal_emoji?: string | null;   // optional, text column exists
};

export type MealPlanRow = {
  id: string;
  meal_id: string | null;
  date: string;
  meal_type: MealType;
  meal_emoji: string | null;
  created_at: string;
  updated_at: string | null;
};
