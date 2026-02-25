/*
  # Update chore schema to match requirements

  1. Schema Changes
    - Rename `task_name` column to `name` in chores table
    - Rename `completed` column to `is_completed` in chores table
    - Update indexes and constraints accordingly

  2. Data Migration
    - Preserve existing data during column renames
    - Update any existing records to use new schema

  3. Security
    - Maintain existing RLS policies
    - Update policy references to new column names
*/

-- Rename task_name to name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'task_name'
  ) THEN
    ALTER TABLE chores RENAME COLUMN task_name TO name;
  END IF;
END $$;

-- Rename completed to is_completed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chores' AND column_name = 'completed'
  ) THEN
    ALTER TABLE chores RENAME COLUMN completed TO is_completed;
  END IF;
END $$;

-- Update index on is_completed if it exists
DROP INDEX IF EXISTS idx_chores_completed;
CREATE INDEX IF NOT EXISTS idx_chores_is_completed ON chores USING btree (is_completed);