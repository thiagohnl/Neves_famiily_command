-- Combined Supabase Schema for Family Dashboard
-- Clean setup for a fresh project
-- Run this entire script in the Supabase SQL Editor

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '👤',
  points integer NOT NULL DEFAULT 0,
  photo_url text,
  is_parent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT 'Family Chore Board',
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'kids')),
  email_summaries boolean DEFAULT false,
  parent_pin text DEFAULT '1234',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chores
CREATE TABLE IF NOT EXISTS chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assigned_to uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  is_completed boolean NOT NULL DEFAULT false,
  day text,
  time_of_day text,
  emoji text DEFAULT '📋',
  scheduled_time text,
  end_time text,
  recurring_days text[],
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============================================================
-- 2. MEAL SYSTEM
-- ============================================================

-- Saved meals library
CREATE TABLE IF NOT EXISTS saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🍽️',
  notes text,
  meal_types text[] DEFAULT ARRAY['lunch', 'dinner']::text[],
  created_at timestamptz DEFAULT now()
);

-- Legacy meals table (kept for compatibility)
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '🍽️',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Freezer meals
CREATE TABLE IF NOT EXISTS freezer_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🥶',
  notes text,
  quantity integer DEFAULT 1,
  unit text DEFAULT 'meal',
  category text,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES saved_meals(id) ON DELETE SET NULL,
  saved_meal_id uuid REFERENCES saved_meals(id) ON DELETE SET NULL,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  meal_name text,
  meal_emoji text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT meal_plans_date_meal_type_unique UNIQUE (date, meal_type)
);

-- Meal favorites
CREATE TABLE IF NOT EXISTS meal_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES saved_meals(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT meal_favorites_meal_user_unique UNIQUE (meal_id, user_id)
);

-- Meal votes
CREATE TABLE IF NOT EXISTS meal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES saved_meals(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  week_start_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT meal_votes_unique UNIQUE (meal_id, user_id, week_start_date)
);

-- ============================================================
-- 3. GAMIFICATION
-- ============================================================

-- XP log
CREATE TABLE IF NOT EXISTS meal_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('new_meal', 'freezer_use', 'challenge_complete')),
  value integer NOT NULL DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  key text PRIMARY KEY,
  title text NOT NULL,
  emoji text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  achievement_key text REFERENCES achievements(key) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_key)
);

-- Weekly challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
  week_start_date date PRIMARY KEY,
  key text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  progress_json jsonb DEFAULT '{}'::jsonb,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. ACTIVITIES & SCHEDULE
-- ============================================================

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Outdoor',
  location text,
  duration text,
  age_range text,
  cost text,
  description text,
  emoji text DEFAULT '🎯',
  weather_dependent boolean DEFAULT false,
  difficulty text DEFAULT 'Easy',
  is_favorite boolean DEFAULT false,
  start_time time,
  end_time time,
  color text DEFAULT 'blue',
  recurring_days text[],
  assigned_member_ids text[],
  created_at timestamptz DEFAULT now()
);

-- Activity plans
CREATE TABLE IF NOT EXISTS activity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Planned activities
CREATE TABLE IF NOT EXISTS planned_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Fun ideas
CREATE TABLE IF NOT EXISTS fun_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  notes text,
  emoji text DEFAULT '🎯',
  location text,
  cost text,
  google_maps_link text,
  is_favorite boolean DEFAULT false,
  scheduled_date date,
  created_at timestamptz DEFAULT now()
);

-- Schedule events
CREATE TABLE IF NOT EXISTS schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  start_time text NOT NULL,
  end_time text NOT NULL,
  assigned_member_ids text[] DEFAULT '{}',
  is_recurring boolean DEFAULT false,
  recurring_days text[] DEFAULT '{}',
  color text DEFAULT '#8B5CF6',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. PANTRY & GROCERY
-- ============================================================

-- Pantry items
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🥫',
  category text,
  location text NOT NULL DEFAULT 'cupboard',
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'item',
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grocery items
CREATE TABLE IF NOT EXISTS grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🛒',
  category text,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'item',
  target_location text DEFAULT 'cupboard',
  is_purchased boolean DEFAULT false,
  purchased_at timestamptz,
  added_to_pantry boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW meal_favorite_counts_90d AS
SELECT
  meal_id,
  COUNT(*) as favorite_count
FROM meal_favorites
WHERE created_at >= now() - interval '90 days'
GROUP BY meal_id;

CREATE OR REPLACE VIEW meal_last_used AS
SELECT
  meal_id,
  MAX(date) as last_used
FROM meal_plans
WHERE meal_id IS NOT NULL
GROUP BY meal_id;

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION increment_points(member_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE family_members
  SET points = points + points_to_add
  WHERE id = member_id;
END;
$$;

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE freezer_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fun_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS POLICIES (allow all for anon + authenticated)
-- ============================================================

CREATE POLICY "Allow all family_members ops" ON family_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all chores ops" ON chores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all app_settings ops" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all meals ops" ON meals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all saved_meals ops" ON saved_meals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all freezer_meals ops" ON freezer_meals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all meal_plans ops" ON meal_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all meal_favorites ops" ON meal_favorites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all meal_votes ops" ON meal_votes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all meal_xp_log ops" ON meal_xp_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all achievements ops" ON achievements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_achievements ops" ON user_achievements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all weekly_challenges ops" ON weekly_challenges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all activities ops" ON activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all activity_plans ops" ON activity_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all planned_activities ops" ON planned_activities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all fun_ideas ops" ON fun_ideas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all schedule_events ops" ON schedule_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pantry_items ops" ON pantry_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all grocery_items ops" ON grocery_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 10. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chores_assigned_to ON chores(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chores_is_completed ON chores(is_completed);
CREATE INDEX IF NOT EXISTS idx_chores_created_at ON chores(created_at);
CREATE INDEX IF NOT EXISTS idx_family_members_points ON family_members(points DESC);
CREATE INDEX IF NOT EXISTS idx_saved_meals_family ON saved_meals(family_id);
CREATE INDEX IF NOT EXISTS idx_saved_meals_name ON saved_meals(name);
CREATE INDEX IF NOT EXISTS idx_meals_name ON meals(name);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_type ON meal_plans(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_saved_meal ON meal_plans(saved_meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_meal ON meal_favorites(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_user ON meal_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_favorites_created ON meal_favorites(created_at);
CREATE INDEX IF NOT EXISTS idx_meal_votes_meal_id ON meal_votes(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_week ON meal_votes(week_start_date);
CREATE INDEX IF NOT EXISTS idx_meal_xp_log_user ON meal_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_xp_log_created ON meal_xp_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name);
CREATE INDEX IF NOT EXISTS idx_activity_plans_date ON activity_plans(date);
CREATE INDEX IF NOT EXISTS idx_activity_plans_activity_id ON activity_plans(activity_id);
CREATE INDEX IF NOT EXISTS idx_planned_activities_date ON planned_activities(date);
CREATE INDEX IF NOT EXISTS idx_planned_activities_activity_id ON planned_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_planned_activities_member ON planned_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_fun_ideas_category ON fun_ideas(category);
CREATE INDEX IF NOT EXISTS idx_fun_ideas_is_favorite ON fun_ideas(is_favorite);
CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON schedule_events(date);
CREATE INDEX IF NOT EXISTS idx_schedule_events_created_at ON schedule_events(created_at);
CREATE INDEX IF NOT EXISTS idx_pantry_items_family ON pantry_items(family_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_location ON pantry_items(location);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiry ON pantry_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_grocery_items_family ON grocery_items(family_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_purchased ON grocery_items(is_purchased);

-- ============================================================
-- 11. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can upload profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can update profile photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can delete profile photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos');

-- ============================================================
-- 12. SEED DATA
-- ============================================================

-- Default app settings
INSERT INTO app_settings (title, theme, email_summaries, parent_pin)
VALUES ('Family Chore Board', 'light', false, '1234');

-- Seed achievements
INSERT INTO achievements (key, title, emoji, description) VALUES
  ('chef_week', 'Chef of the Week', '👨‍🍳', 'Complete this week''s meal challenge'),
  ('veggie_explorer', 'Veggie Explorer', '🥦', 'Try 3 different veggie meals in a week'),
  ('freezer_saver', 'Freezer Saver', '🧊', 'Use freezer items twice in a week')
ON CONFLICT (key) DO NOTHING;
