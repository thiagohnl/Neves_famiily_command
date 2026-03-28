-- Create pantry_items table for household stock tracking
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🥫',
  category text,
  location text NOT NULL DEFAULT 'cupboard',
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'item',
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pantry_items' AND policyname = 'Allow all pantry_items operations'
  ) THEN
    CREATE POLICY "Allow all pantry_items operations"
      ON pantry_items FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pantry_items_family ON pantry_items(family_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_location ON pantry_items(location);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiry ON pantry_items(expiry_date);
