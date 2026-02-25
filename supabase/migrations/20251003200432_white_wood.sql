/*
  # Add scheduled_time column to chores table

  1. Changes
    - Add `scheduled_time` column to `chores` table
    - Column type: text (to store time in HH:mm format)
    - Column is nullable to allow existing chores without scheduled times

  2. Notes
    - This resolves the "Could not find the 'scheduled_time' column" error
    - Existing chores will have null scheduled_time values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'scheduled_time'
  ) THEN
    ALTER TABLE chores ADD COLUMN scheduled_time text;
  END IF;
END $$;