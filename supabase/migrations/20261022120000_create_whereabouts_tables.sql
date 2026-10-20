/*
  # Create Whereabouts Tables

  1. New Tables
    - `whereabouts_overrides` - Where a family member is, set by hand on the board or by a phone
      (presence endpoint /api/presence). Wins over calendar inference until it expires.
      - `id` (uuid, primary key)
      - `member_id` (uuid) - FK to family_members
      - `status` (text) - home, school, work, church, grandma, playdate, travelling, sleeping
      - `source` (text) - 'manual' (board) or 'presence' (phone); manual beats presence
      - `set_at` (timestamptz)
      - `expires_at` (timestamptz, nullable) - null means until replaced or cleared
    - `whereabouts_rules` - Calendar title keyword → status, used when no override is active
      - `id` (uuid, primary key)
      - `member_id` (uuid, nullable) - null means the rule applies to any member
      - `keyword` (text) - matched case-insensitively as a whole word in the item title
      - `status` (text)
      - `priority` (int) - highest wins when several rules match
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policy for public access (consistent with other tables)

  3. Realtime
    - Add `whereabouts_overrides` to the supabase_realtime publication so a phone update
      moves the clock hand within seconds

  4. Indexes
    - `member_id` on both tables

  5. Seed
    - Default keyword rules (school, playdate, church, work/office, WFH, grandma, travel)
*/

CREATE TABLE IF NOT EXISTS whereabouts_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  status text NOT NULL
    CHECK (status IN ('home', 'school', 'work', 'church', 'grandma', 'playdate', 'travelling', 'sleeping')),
  source text NOT NULL CHECK (source IN ('manual', 'presence')),
  set_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE whereabouts_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all whereabouts override operations"
  ON whereabouts_overrides FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_whereabouts_overrides_member_id ON whereabouts_overrides(member_id);

CREATE TABLE IF NOT EXISTS whereabouts_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('home', 'school', 'work', 'church', 'grandma', 'playdate', 'travelling', 'sleeping')),
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whereabouts_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all whereabouts rule operations"
  ON whereabouts_rules FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_whereabouts_rules_member_id ON whereabouts_rules(member_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whereabouts_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whereabouts_overrides;
  END IF;
END $$;

-- WFH outranks work so "WFH" never reads as being at the office
INSERT INTO whereabouts_rules (member_id, keyword, status, priority) VALUES
  (NULL, 'school', 'school', 0),
  (NULL, 'escola', 'school', 0),
  (NULL, 'playdate', 'playdate', 0),
  (NULL, 'church', 'church', 0),
  (NULL, 'igreja', 'church', 0),
  (NULL, 'kerk', 'church', 0),
  (NULL, 'work', 'work', 0),
  (NULL, 'office', 'work', 0),
  (NULL, 'WFH', 'home', 10),
  (NULL, 'vovó', 'grandma', 0),
  (NULL, 'vovo', 'grandma', 0),
  (NULL, 'grandma', 'grandma', 0),
  (NULL, 'travel', 'travelling', 0),
  (NULL, 'flight', 'travelling', 0),
  (NULL, 'train', 'travelling', 0);
