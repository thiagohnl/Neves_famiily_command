/*
  # Consolidated Family Chore Board Database Schema
  
  This migration creates all necessary tables, relationships, and policies
  for the Family Chore Board application.

  1. New Tables
    - `family_members` - Store family member information and points
    - `chores` - Store chore tasks and assignments
    - `app_settings` - Store application configuration
    - `meals` - Store meal information
    - `meal_plans` - Store meal planning data
    - `activities` - Store activity information
    - `activity_plans` - Store activity planning data
    - `planned_activities` - Store planned activities

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (demo purposes)

  3. Sample Data
    - Create sample family members
    - Add sample chores with various assignments
*/

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS planned_activities CASCADE;
DROP TABLE IF EXISTS activity_plans CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS chores CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- Create family_members table
CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '👤',
  points integer NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Create chores table
CREATE TABLE chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assigned_to uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  is_completed boolean NOT NULL DEFAULT false,
  day text,
  time_of_day text,
  emoji text DEFAULT '📋',
  scheduled_time text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create app_settings table
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT 'Family Chore Board',
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'kids')),
  email_summaries boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meals table
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '🍽️',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create meal_plans table
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Lunch', 'Dinner')),
  created_at timestamptz DEFAULT now()
);

-- Create activities table
CREATE TABLE activities (
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
  created_at timestamptz DEFAULT now()
);

-- Create activity_plans table
CREATE TABLE activity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create planned_activities table
CREATE TABLE planned_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables (allow all operations for demo)
CREATE POLICY "Allow all family member operations"
  ON family_members FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all chore operations"
  ON chores FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all app settings operations"
  ON app_settings FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all meal operations"
  ON meals FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all meal plan operations"
  ON meal_plans FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all activity operations"
  ON activities FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all activity plan operations"
  ON activity_plans FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all planned activity operations"
  ON planned_activities FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_chores_assigned_to ON chores(assigned_to);
CREATE INDEX idx_chores_is_completed ON chores(is_completed);
CREATE INDEX idx_chores_created_at ON chores(created_at);
CREATE INDEX idx_family_members_points ON family_members(points DESC);
CREATE INDEX idx_meal_plans_date ON meal_plans(date);
CREATE INDEX idx_meal_plans_meal_type ON meal_plans(meal_type);
CREATE INDEX idx_meals_name ON meals(name);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_name ON activities(name);
CREATE INDEX idx_activity_plans_date ON activity_plans(date);
CREATE INDEX idx_activity_plans_activity_id ON activity_plans(activity_id);
CREATE INDEX idx_planned_activities_date ON planned_activities(date);
CREATE INDEX idx_planned_activities_activity_id ON planned_activities(activity_id);

-- Insert sample family members
INSERT INTO family_members (name, avatar, points) VALUES
  ('Mom', '👩', 150),
  ('Dad', '👨', 120),
  ('Emma', '👧', 85),
  ('Jack', '👦', 95);

-- Insert sample chores
INSERT INTO chores (name, assigned_to, points, day, time_of_day, emoji, scheduled_time) 
SELECT 
  task_name,
  (SELECT id FROM family_members WHERE name = assigned_member),
  points,
  day,
  time_period,
  emoji_icon,
  scheduled_time
FROM (
  VALUES 
    ('Take out trash', 'Jack', 5, 'Monday', 'morning', '🗑️', '08:00'),
    ('Load dishwasher', 'Emma', 5, NULL, 'evening', '🍽️', '19:00'),
    ('Vacuum living room', 'Dad', 10, 'Saturday', 'afternoon', '🧹', '14:00'),
    ('Clean bathroom', 'Mom', 20, NULL, 'morning', '🚿', '09:00'),
    ('Mow the lawn', 'Dad', 20, 'Sunday', 'morning', '🌱', '10:00'),
    ('Fold laundry', 'Emma', 10, NULL, 'afternoon', '👕', '15:00'),
    ('Feed the pets', 'Jack', 5, NULL, 'morning', '🐕', '07:30'),
    ('Wipe down kitchen counters', 'Mom', 5, NULL, 'evening', '🧽', '20:00')
) AS sample_chores(task_name, assigned_member, points, day, time_period, emoji_icon, scheduled_time)
WHERE EXISTS (SELECT 1 FROM family_members WHERE name = assigned_member);

-- Insert default app settings
INSERT INTO app_settings (title, theme, email_summaries) 
VALUES ('Family Chore Board', 'light', false);