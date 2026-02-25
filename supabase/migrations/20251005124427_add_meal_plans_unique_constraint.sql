/*
  # Add unique constraint to meal_plans

  1. Changes
    - Add unique constraint on (date, meal_type) in meal_plans table
    - This allows upsert operations to work correctly when planning meals
  
  2. Notes
    - The constraint ensures only one meal can be planned per date per meal type
    - This prevents duplicate entries for the same lunch or dinner on the same day
*/

-- Add unique constraint on date and meal_type
ALTER TABLE meal_plans 
ADD CONSTRAINT meal_plans_date_meal_type_unique 
UNIQUE (date, meal_type);
