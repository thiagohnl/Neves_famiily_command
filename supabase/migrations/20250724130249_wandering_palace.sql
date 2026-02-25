/*
  # Add time_of_day column to chores table

  1. Schema Changes
    - Add `time_of_day` column to chores table
    - Values: 'morning', 'afternoon', 'evening'
    - Add emoji column for chore icons

  2. Sample Data
    - Update existing chores with time_of_day values
    - Add emoji icons to existing chores
*/

-- Add time_of_day column to chores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'time_of_day'
  ) THEN
    ALTER TABLE chores ADD COLUMN time_of_day text;
  END IF;
END $$;

-- Add emoji column to chores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE chores ADD COLUMN emoji text DEFAULT '📋';
  END IF;
END $$;

-- Update existing chores with sample time_of_day and emoji values
UPDATE chores SET 
  time_of_day = CASE 
    WHEN name ILIKE '%breakfast%' OR name ILIKE '%morning%' THEN 'morning'
    WHEN name ILIKE '%lunch%' OR name ILIKE '%afternoon%' THEN 'afternoon'
    WHEN name ILIKE '%dinner%' OR name ILIKE '%evening%' OR name ILIKE '%night%' THEN 'evening'
    ELSE 'morning'
  END,
  emoji = CASE 
    WHEN name ILIKE '%trash%' THEN '🗑️'
    WHEN name ILIKE '%dish%' THEN '🍽️'
    WHEN name ILIKE '%bed%' THEN '🛏️'
    WHEN name ILIKE '%toy%' THEN '🧸'
    WHEN name ILIKE '%clean%' THEN '🧹'
    WHEN name ILIKE '%feed%' THEN '🐕'
    ELSE '📋'
  END
WHERE time_of_day IS NULL OR emoji = '📋';