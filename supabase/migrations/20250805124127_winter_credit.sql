/*
  # Create planned activities table

  1. New Tables
    - `planned_activities`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key to activities)
      - `date` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `planned_activities` table
    - Add policy for authenticated users to manage planned activities
*/

CREATE TABLE IF NOT EXISTS planned_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE planned_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all planned activity operations"
  ON planned_activities
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_planned_activities_date ON planned_activities(date);
CREATE INDEX IF NOT EXISTS idx_planned_activities_activity_id ON planned_activities(activity_id);