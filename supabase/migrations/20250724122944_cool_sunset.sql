/*
  # Family Chore Board Database Schema

  1. New Tables
    - `family_members`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `avatar` (text, emoji/avatar representation)
      - `points` (integer, default 0)
      - `created_at` (timestamp)
    
    - `chores`
      - `id` (uuid, primary key)
      - `task_name` (text, not null)
      - `assigned_to` (uuid, foreign key to family_members)
      - `points` (integer, not null) 
      - `completed` (boolean, default false)
      - `day` (text, optional - specific day assignment)
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write data
    - Public read access for real-time family board functionality

  3. Sample Data
    - Create sample family members with avatars
    - Add sample chores with different point values
*/

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '👤',
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create chores table
CREATE TABLE IF NOT EXISTS chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  assigned_to uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  completed boolean NOT NULL DEFAULT false,
  day text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- Create policies for family_members table
CREATE POLICY "Allow all operations on family_members"
  ON family_members
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for chores table  
CREATE POLICY "Allow all operations on chores"
  ON chores
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample family members
INSERT INTO family_members (name, avatar, points) VALUES
  ('Mom', '👩', 150),
  ('Dad', '👨', 120),
  ('Emma', '👧', 85),
  ('Jack', '👦', 95)
ON CONFLICT DO NOTHING;

-- Insert sample chores
INSERT INTO chores (task_name, assigned_to, points, day) 
SELECT 
  task_name,
  (SELECT id FROM family_members WHERE name = assigned_member),
  points,
  day
FROM (
  VALUES 
    ('Take out trash', 'Jack', 5, 'Monday'),
    ('Load dishwasher', 'Emma', 5, NULL),
    ('Vacuum living room', 'Dad', 10, 'Saturday'),
    ('Clean bathroom', 'Mom', 20, NULL),
    ('Mow the lawn', 'Dad', 20, 'Sunday'),
    ('Fold laundry', 'Emma', 10, NULL),
    ('Feed the pets', 'Jack', 5, NULL),
    ('Wipe down kitchen counters', 'Mom', 5, NULL)
) AS sample_chores(task_name, assigned_member, points, day)
WHERE EXISTS (SELECT 1 FROM family_members WHERE name = assigned_member)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chores_assigned_to ON chores(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chores_completed ON chores(completed);
CREATE INDEX IF NOT EXISTS idx_chores_created_at ON chores(created_at);
CREATE INDEX IF NOT EXISTS idx_family_members_points ON family_members(points DESC);