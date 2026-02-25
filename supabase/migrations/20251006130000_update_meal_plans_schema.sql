/*
  # Update meal_plans schema for breakfast support and saved_meals reference

  1. Changes
    - Drop FK constraint from meal_plans.meal_id to meals table
    - Add saved_meal_id column that references saved_meals
    - Update meal_type check constraint to include 'breakfast', 'lunch', 'dinner'
    - Add columns: meal_name (text) and meal_emoji (text) for custom meals
    - Keep meal_id temporarily for data migration

  2. Data Migration
    - Copy meal_id to saved_meal_id where meal exists in saved_meals
    - Update meal_type values to lowercase

  3. Security
    - No RLS changes needed - inherits existing meal_plans policies

  4. Notes
    - Allows storing custom meals without requiring saved_meal_id
    - Lowercase meal types: 'breakfast', 'lunch', 'dinner' for consistency
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

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'saved_meal_id'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN saved_meal_id uuid REFERENCES saved_meals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'meal_name'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN meal_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'meal_emoji'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN meal_emoji text;
  END IF;
END $$;

-- Migrate existing data: copy meal references from meals table to saved_meals
UPDATE meal_plans mp
SET saved_meal_id = m.id,
    meal_name = m.name,
    meal_emoji = m.emoji
FROM meals m
WHERE mp.meal_id = m.id AND mp.saved_meal_id IS NULL;

-- Drop the old meal_type check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_meal_type_check'
  ) THEN
    ALTER TABLE meal_plans DROP CONSTRAINT meal_plans_meal_type_check;
  END IF;
END $$;

-- Update meal_type values to lowercase for consistency
UPDATE meal_plans SET meal_type = 'lunch' WHERE LOWER(meal_type) = 'lunch';
UPDATE meal_plans SET meal_type = 'dinner' WHERE LOWER(meal_type) = 'dinner';

-- Add new check constraint that includes breakfast and uses lowercase
ALTER TABLE meal_plans ADD CONSTRAINT meal_plans_meal_type_check
  CHECK (meal_type IN ('breakfast', 'lunch', 'dinner'));

-- Drop unique constraint temporarily to recreate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_date_meal_type_unique'
  ) THEN
    ALTER TABLE meal_plans DROP CONSTRAINT meal_plans_date_meal_type_unique;
  END IF;
END $$;

-- Recreate unique constraint
ALTER TABLE meal_plans ADD CONSTRAINT meal_plans_date_meal_type_unique
  UNIQUE (date, meal_type);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_saved_meal ON meal_plans(saved_meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
