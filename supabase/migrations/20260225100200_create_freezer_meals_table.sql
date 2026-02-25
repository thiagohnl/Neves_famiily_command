-- Create freezer_meals table (may already exist via dashboard)
CREATE TABLE IF NOT EXISTS freezer_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🥶',
  notes text,
  quantity integer DEFAULT 1,
  unit text DEFAULT 'meal',
  category text,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE freezer_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freezer_meals' AND policyname = 'Allow all freezer_meals operations'
  ) THEN
    CREATE POLICY "Allow all freezer_meals operations"
      ON freezer_meals FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
