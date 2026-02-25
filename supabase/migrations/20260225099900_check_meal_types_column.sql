-- Check if meal_types column exists in saved_meals
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'saved_meals'
ORDER BY ordinal_position;

-- If meal_types doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_meals' AND column_name = 'meal_types'
  ) THEN
    ALTER TABLE saved_meals ADD COLUMN meal_types text[] DEFAULT ARRAY['lunch', 'dinner']::text[];
    RAISE NOTICE 'Added meal_types column';
  ELSE
    RAISE NOTICE 'meal_types column already exists';
  END IF;
END $$;

-- Update existing rows to have default meal types if null or empty
UPDATE saved_meals
SET meal_types = ARRAY['lunch', 'dinner']::text[]
WHERE meal_types IS NULL OR meal_types = ARRAY[]::text[];

-- Show the updated schema
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'saved_meals'
ORDER BY ordinal_position;
