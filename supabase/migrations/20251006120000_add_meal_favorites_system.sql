/*
  # Add Meal Favorites System

  1. New Tables
    - `meal_favorites`
      - `id` (uuid, primary key)
      - `meal_id` (uuid, FK to saved_meals)
      - `user_id` (text, tracks who favorited)
      - `created_at` (timestamptz)
      - Unique constraint on (meal_id, user_id)

  2. Views
    - `meal_favorite_counts_90d` - Rolling 90-day favorite counts per meal
    - `meal_last_used` - Last planned date per meal from meal_plans

  3. Security
    - Enable RLS on meal_favorites
    - Policies for authenticated users to view/insert/delete their favorites

  4. Notes
    - Family Fave badge: favorite_count_90d >= 5
    - Bring Back: last_used IS NULL OR last_used <= today - 60 days
*/

-- Create meal_favorites table
CREATE TABLE IF NOT EXISTS meal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES saved_meals(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meal_favorites_unique'
  ) THEN
    ALTER TABLE meal_favorites
    ADD CONSTRAINT meal_favorites_unique
    UNIQUE (meal_id, user_id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_favorites_meal ON meal_favorites(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_user ON meal_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_created ON meal_favorites(created_at);

-- Enable RLS
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_favorites'
    AND policyname = 'Anyone can view favorites'
  ) THEN
    CREATE POLICY "Anyone can view favorites"
      ON meal_favorites FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_favorites'
    AND policyname = 'Anyone can add favorites'
  ) THEN
    CREATE POLICY "Anyone can add favorites"
      ON meal_favorites FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meal_favorites'
    AND policyname = 'Anyone can remove favorites'
  ) THEN
    CREATE POLICY "Anyone can remove favorites"
      ON meal_favorites FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create view for favorite counts in last 90 days
CREATE OR REPLACE VIEW meal_favorite_counts_90d AS
SELECT
  meal_id,
  COUNT(*) as favorite_count
FROM meal_favorites
WHERE created_at >= now() - interval '90 days'
GROUP BY meal_id;

-- Create view for last used date per meal
CREATE OR REPLACE VIEW meal_last_used AS
SELECT
  meal_id,
  MAX(date) as last_used
FROM meal_plans
WHERE meal_id IS NOT NULL
GROUP BY meal_id;
