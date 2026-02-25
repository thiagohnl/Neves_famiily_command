-- Create fun_ideas table (may already exist via dashboard)
CREATE TABLE IF NOT EXISTS fun_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  notes text,
  emoji text DEFAULT '🎯',
  location text,
  cost text,
  google_maps_link text,
  is_favorite boolean DEFAULT false,
  scheduled_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fun_ideas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fun_ideas' AND policyname = 'Allow all fun_ideas operations'
  ) THEN
    CREATE POLICY "Allow all fun_ideas operations"
      ON fun_ideas FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fun_ideas_category ON fun_ideas(category);
CREATE INDEX IF NOT EXISTS idx_fun_ideas_is_favorite ON fun_ideas(is_favorite);
