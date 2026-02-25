-- Fix RLS policies to allow anon access (app uses anonymous Supabase access)
-- These tables may have policies that only allow 'authenticated', not 'anon'

-- meal_favorites
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view favorites" ON meal_favorites;
  DROP POLICY IF EXISTS "Users can manage own favorites" ON meal_favorites;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'meal_favorites') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'meal_favorites' AND policyname = 'Allow all meal_favorites operations'
    ) THEN
      CREATE POLICY "Allow all meal_favorites operations"
        ON meal_favorites FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- meal_votes
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view votes" ON meal_votes;
  DROP POLICY IF EXISTS "Users can manage own votes" ON meal_votes;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'meal_votes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'meal_votes' AND policyname = 'Allow all meal_votes operations'
    ) THEN
      CREATE POLICY "Allow all meal_votes operations"
        ON meal_votes FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- meal_xp_log
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view xp" ON meal_xp_log;
  DROP POLICY IF EXISTS "Users can add xp" ON meal_xp_log;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'meal_xp_log') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'meal_xp_log' AND policyname = 'Allow all meal_xp_log operations'
    ) THEN
      CREATE POLICY "Allow all meal_xp_log operations"
        ON meal_xp_log FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- achievements
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'achievements') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'Allow all achievements operations'
    ) THEN
      CREATE POLICY "Allow all achievements operations"
        ON achievements FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- user_achievements
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view user achievements" ON user_achievements;
  DROP POLICY IF EXISTS "Users can manage own achievements" ON user_achievements;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_achievements') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Allow all user_achievements operations'
    ) THEN
      CREATE POLICY "Allow all user_achievements operations"
        ON user_achievements FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- weekly_challenges
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view challenges" ON weekly_challenges;
  DROP POLICY IF EXISTS "Users can manage challenges" ON weekly_challenges;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'weekly_challenges') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'weekly_challenges' AND policyname = 'Allow all weekly_challenges operations'
    ) THEN
      CREATE POLICY "Allow all weekly_challenges operations"
        ON weekly_challenges FOR ALL TO anon, authenticated
        USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
