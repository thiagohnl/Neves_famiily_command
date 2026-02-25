-- Add recurring_days array column to chores (code expects string[])
ALTER TABLE chores ADD COLUMN IF NOT EXISTS recurring_days text[];

-- Migrate existing 'day' data if the column exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chores' AND column_name = 'day') THEN
    UPDATE chores SET recurring_days = ARRAY[day] WHERE day IS NOT NULL AND recurring_days IS NULL;
  END IF;
END $$;
