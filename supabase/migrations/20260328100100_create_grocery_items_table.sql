-- Create grocery_items table for shopping list
CREATE TABLE IF NOT EXISTS grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  emoji text DEFAULT '🛒',
  category text,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'item',
  target_location text DEFAULT 'cupboard',
  is_purchased boolean DEFAULT false,
  purchased_at timestamptz,
  added_to_pantry boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grocery_items' AND policyname = 'Allow all grocery_items operations'
  ) THEN
    CREATE POLICY "Allow all grocery_items operations"
      ON grocery_items FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grocery_items_family ON grocery_items(family_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_purchased ON grocery_items(is_purchased);
