/*
  # Create activities system

  1. New Tables
    - `activities`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `category` (text, not null)
      - `location` (text, optional)
      - `duration` (text, optional)
      - `age_range` (text, optional)
      - `cost` (text, optional)
      - `description` (text, optional)
      - `emoji` (text, default '🎯')
      - `weather_dependent` (boolean, default false)
      - `difficulty` (text, default 'Easy')
      - `is_favorite` (boolean, default false)
      - `created_at` (timestamp)
    - `activity_plans`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key)
      - `date` (date, not null)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated and anonymous users
*/

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
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all activity operations"
  ON activities
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all activity plan operations"
  ON activity_plans
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name);
CREATE INDEX IF NOT EXISTS idx_activity_plans_date ON activity_plans(date);
CREATE INDEX IF NOT EXISTS idx_activity_plans_activity_id ON activity_plans(activity_id);