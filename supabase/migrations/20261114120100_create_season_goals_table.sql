/*
  # Create Season Goals Table

  1. New Tables
    - `season_goals` - A child's points goal for a season (e.g. a chocolate letter for
      Sinterklaas). Chore points earned while the season runs are added to it.
      - `id` (uuid, primary key)
      - `member_id` (uuid) - FK to family_members
      - `season_key` (text) - 'sinterklaas' or 'christmas'
      - `year` (int)
      - `target_points` (int)
      - `earned_points` (int, default 0)
      - `reward_label` (text, nullable) - e.g. "Chocolate letter C"
      - `created_at` (timestamptz)
      - Unique (member_id, season_key, year)

  2. Security
    - Enable RLS
    - Add policy for public access (consistent with other tables)

  3. Functions
    - `increment_season_goal(p_member_id, p_season_key, p_year, points_to_add)` - atomic
      increment, same pattern as increment_points; does nothing when there is no goal

  4. Indexes
    - `member_id`
*/

CREATE TABLE IF NOT EXISTS season_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  season_key text NOT NULL,
  year int NOT NULL,
  target_points int NOT NULL CHECK (target_points >= 0),
  earned_points int NOT NULL DEFAULT 0,
  reward_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, season_key, year)
);

ALTER TABLE season_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all season goal operations"
  ON season_goals FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_season_goals_member_id ON season_goals(member_id);

CREATE OR REPLACE FUNCTION increment_season_goal(
  p_member_id uuid,
  p_season_key text,
  p_year integer,
  points_to_add integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE season_goals
  SET earned_points = earned_points + points_to_add
  WHERE member_id = p_member_id AND season_key = p_season_key AND year = p_year;
END;
$$;
