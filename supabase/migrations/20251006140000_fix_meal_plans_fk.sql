/*
  # Fix meal_plans foreign key to reference saved_meals

  1. Changes
    - Drop FK constraint from meal_plans.meal_id to meals table
    - Add FK constraint from meal_plans.meal_id to saved_meals table
    - Update meal_type check constraint to support 'breakfast', 'lunch', 'dinner'

  2. Notes
    - Allows meal_plans to directly reference saved_meals
    - No data migration needed as we'll handle this in the app layer
*/

-- Drop the old FK constraint to meals table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_meal_id_fkey'
  ) THEN
    ALTER TABLE meal_plans DROP CONSTRAINT meal_plans_meal_id_fkey;
  END IF;
END $$;

-- Add new FK constraint to saved_meals table
ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_meal_id_fkey
FOREIGN KEY (meal_id)
REFERENCES saved_meals(id)
ON DELETE SET NULL;

-- Update meal_type check constraint to support breakfast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_meal_type_check'
  ) THEN
    ALTER TABLE meal_plans DROP CONSTRAINT meal_plans_meal_type_check;
  END IF;
END $$;

-- Add new check constraint with lowercase values and breakfast support
ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_meal_type_check
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'Breakfast', 'Lunch', 'Dinner'));

-- Update existing values to lowercase for consistency
UPDATE meal_plans SET meal_type = 'lunch' WHERE meal_type = 'Lunch';
UPDATE meal_plans SET meal_type = 'dinner' WHERE meal_type = 'Dinner';
UPDATE meal_plans SET meal_type = 'breakfast' WHERE meal_type = 'Breakfast';
