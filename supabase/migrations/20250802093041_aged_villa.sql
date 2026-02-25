/*
  # Add scheduled_time column to chores table

  1. Changes
    - Add `scheduled_time` column to `chores` table
    - Column type: TEXT to store time strings (e.g., '14:30')
    - Column is nullable to support existing chores without specific times

  2. Security
    - No RLS changes needed as existing policies cover all columns
*/

-- Add scheduled_time column to chores table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE chores ADD COLUMN scheduled_time text;
  END IF;
END $$;