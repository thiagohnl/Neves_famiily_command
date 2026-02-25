-- Create saved_meals table (may already exist via dashboard)
CREATE TABLE IF NOT EXISTS saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🍽️',
  notes text,
  meal_types text[] DEFAULT ARRAY['lunch', 'dinner']::text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Allow all saved_meals operations'
  ) THEN
    CREATE POLICY "Allow all saved_meals operations"
      ON saved_meals FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_saved_meals_family ON saved_meals(family_id);
CREATE INDEX IF NOT EXISTS idx_saved_meals_name ON saved_meals(name);
