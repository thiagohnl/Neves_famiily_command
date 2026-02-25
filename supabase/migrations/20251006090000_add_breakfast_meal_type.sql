/*
  # Add Breakfast Meal Type

  1. Changes
    - Extend meal_plans.meal_type to include 'breakfast'
    - Keep existing data for 'lunch' and 'dinner' unchanged
    - Unique constraint (date, meal_type) now supports breakfast

  2. Notes
    - Backward compatible - existing lunch/dinner data unaffected
    - Applications should now handle 3 meal slots per day: breakfast, lunch, dinner
    - Meal type ordering: breakfast → lunch → dinner
*/

-- Drop the existing check constraint
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_meal_type_check;

-- Add updated check constraint that includes breakfast
ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_meal_type_check
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'Breakfast', 'Lunch', 'Dinner'));

-- Note: We include both lowercase and capitalized versions for backward compatibility
-- New code should use lowercase ('breakfast', 'lunch', 'dinner')
