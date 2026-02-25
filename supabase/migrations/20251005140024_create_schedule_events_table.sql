/*
  # Create Schedule Events Table

  1. New Tables
    - `schedule_events` - Store family schedule events like dentist appointments, playdates, etc.
      - `id` (uuid, primary key)
      - `title` (text) - Event name
      - `date` (date) - Event date
      - `start_time` (text) - Start time (HH:MM format)
      - `end_time` (text) - End time (HH:MM format)
      - `assigned_member_ids` (text[]) - Array of family member IDs
      - `is_recurring` (boolean) - Whether event repeats
      - `recurring_days` (text[]) - Array of weekday names for recurring events
      - `color` (text) - Color for the event display
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `schedule_events` table
    - Add policy for public access (consistent with other tables)

  3. Indexes
    - Add index on date for better query performance
*/

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

ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all schedule event operations"
  ON schedule_events FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON schedule_events(date);
CREATE INDEX IF NOT EXISTS idx_schedule_events_created_at ON schedule_events(created_at);