/*
  # Add Meal Quest Gamification System

  1. New Tables
    - `meal_xp_log`
      - `id` (uuid, primary key)
      - `user_id` (text, tracks who earned XP)
      - `type` (text, 'new_meal' | 'freezer_use' | 'challenge_complete')
      - `value` (integer, XP points earned)
      - `meta` (jsonb, additional context)
      - `created_at` (timestamptz)
    
    - `achievements`
      - `key` (text, primary key)
      - `title` (text)
      - `emoji` (text)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (text)
      - `achievement_key` (text, references achievements)
      - `earned_at` (timestamptz)
      - Unique constraint on (user_id, achievement_key)
    
    - `weekly_challenges`
      - `week_start_date` (date, primary key)
      - `key` (text)
      - `target` (integer)
      - `progress_json` (jsonb)
      - `completed` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Seed Data
    - Pre-populate achievements table
*/

-- Create meal_xp_log table
CREATE TABLE IF NOT EXISTS meal_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('new_meal', 'freezer_use', 'challenge_complete')),
  value integer NOT NULL DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_xp_log_user ON meal_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_xp_log_created ON meal_xp_log(created_at);

ALTER TABLE meal_xp_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view XP logs'
  ) THEN
    CREATE POLICY "Anyone can view XP logs"
      ON meal_xp_log FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can add XP logs'
  ) THEN
    CREATE POLICY "Anyone can add XP logs"
      ON meal_xp_log FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  key text PRIMARY KEY,
  title text NOT NULL,
  emoji text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view achievements'
  ) THEN
    CREATE POLICY "Anyone can view achievements"
      ON achievements FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Seed achievements
INSERT INTO achievements (key, title, emoji, description) VALUES
  ('chef_week', 'Chef of the Week', '👨‍🍳', 'Complete this week''s meal challenge'),
  ('veggie_explorer', 'Veggie Explorer', '🥦', 'Try 3 different veggie meals in a week'),
  ('freezer_saver', 'Freezer Saver', '🧊', 'Use freezer items twice in a week')
ON CONFLICT (key) DO NOTHING;

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  achievement_key text REFERENCES achievements(key) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_unique'
  ) THEN
    ALTER TABLE user_achievements 
    ADD CONSTRAINT user_achievements_unique 
    UNIQUE (user_id, achievement_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view user achievements'
  ) THEN
    CREATE POLICY "Anyone can view user achievements"
      ON user_achievements FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can earn achievements'
  ) THEN
    CREATE POLICY "Anyone can earn achievements"
      ON user_achievements FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create weekly_challenges table
CREATE TABLE IF NOT EXISTS weekly_challenges (
  week_start_date date PRIMARY KEY,
  key text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  progress_json jsonb DEFAULT '{}'::jsonb,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view challenges'
  ) THEN
    CREATE POLICY "Anyone can view challenges"
      ON weekly_challenges FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update challenges'
  ) THEN
    CREATE POLICY "Anyone can update challenges"
      ON weekly_challenges FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can modify challenges'
  ) THEN
    CREATE POLICY "Anyone can modify challenges"
      ON weekly_challenges FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;
