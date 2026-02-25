/*
  # Add meal_types to saved_meals

  1. Changes
    - Add meal_types column to saved_meals (array of text)
    - Default value for existing rows: ['lunch', 'dinner']
    - This enables filtering saved meals by breakfast/lunch/dinner

  2. Notes
    - Backward compatible
    - Existing meals will show up in lunch and dinner by default
*/

-- Add meal_types column to saved_meals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_meals' AND column_name = 'meal_types'
  ) THEN
    ALTER TABLE saved_meals ADD COLUMN meal_types text[] DEFAULT ARRAY['lunch', 'dinner']::text[];
  END IF;
END $$;

-- Update existing rows to have default meal types if null
UPDATE saved_meals
SET meal_types = ARRAY['lunch', 'dinner']::text[]
WHERE meal_types IS NULL OR meal_types = ARRAY[]::text[];
