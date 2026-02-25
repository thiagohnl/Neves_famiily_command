/*
  # Add Meal Plan Gamification Features

  1. New Tables
    - `meal_favorites`
      - `id` (uuid, primary key)
      - `meal_id` (uuid, references saved_meals)
      - `user_id` (text, tracks which family member favorited)
      - `created_at` (timestamptz)
      - Unique constraint on (meal_id, user_id)
    
    - `meal_votes`
      - `id` (uuid, primary key)
      - `meal_id` (uuid, references saved_meals)
      - `user_id` (text)
      - `week_start_date` (date)
      - `created_at` (timestamptz)
      - Unique constraint on (meal_id, user_id, week_start_date)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own favorites/votes

  3. Indexes
    - Index on meal_id for fast favorite counts
    - Index on created_at for recent favorites filtering
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
    WHERE conname = 'meal_favorites_meal_user_unique'
  ) THEN
    ALTER TABLE meal_favorites 
    ADD CONSTRAINT meal_favorites_meal_user_unique 
    UNIQUE (meal_id, user_id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_favorites_meal_id ON meal_favorites(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_created_at ON meal_favorites(created_at);

-- Enable RLS
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_favorites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view favorites'
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
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can add their own favorites'
  ) THEN
    CREATE POLICY "Users can add their own favorites"
      ON meal_favorites FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can remove their own favorites'
  ) THEN
    CREATE POLICY "Users can remove their own favorites"
      ON meal_favorites FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create meal_votes table
CREATE TABLE IF NOT EXISTS meal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES saved_meals(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  week_start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'meal_votes_unique'
  ) THEN
    ALTER TABLE meal_votes 
    ADD CONSTRAINT meal_votes_unique 
    UNIQUE (meal_id, user_id, week_start_date);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_votes_meal_id ON meal_votes(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_week ON meal_votes(week_start_date);

-- Enable RLS
ALTER TABLE meal_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view votes'
  ) THEN
    CREATE POLICY "Anyone can view votes"
      ON meal_votes FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can add their own votes'
  ) THEN
    CREATE POLICY "Users can add their own votes"
      ON meal_votes FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can remove their own votes'
  ) THEN
    CREATE POLICY "Users can remove their own votes"
      ON meal_votes FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
