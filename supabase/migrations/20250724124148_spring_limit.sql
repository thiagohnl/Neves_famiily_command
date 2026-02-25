/*
  # Add sample family members and chores

  1. Sample Data
    - Add sample family members with points
    - Add sample chores assigned to family members
  2. Notes
    - This provides initial data to demonstrate the app functionality
    - Family members have different point totals to show leaderboard
    - Chores have different difficulties and some have specific days
*/

-- Insert sample family members
INSERT INTO family_members (name, avatar, points) VALUES
  ('Mom', '👩', 85),
  ('Dad', '👨', 72),
  ('Emma', '👧', 45),
  ('Jake', '👦', 38)
ON CONFLICT (id) DO NOTHING;

-- Get the family member IDs for chore assignments
DO $$
DECLARE
  mom_id uuid;
  dad_id uuid;
  emma_id uuid;
  jake_id uuid;
BEGIN
  SELECT id INTO mom_id FROM family_members WHERE name = 'Mom' LIMIT 1;
  SELECT id INTO dad_id FROM family_members WHERE name = 'Dad' LIMIT 1;
  SELECT id INTO emma_id FROM family_members WHERE name = 'Emma' LIMIT 1;
  SELECT id INTO jake_id FROM family_members WHERE name = 'Jake' LIMIT 1;

  -- Insert sample chores
  INSERT INTO chores (name, assigned_to, points, is_completed, day) VALUES
    ('Take out trash', mom_id, 5, false, 'Monday'),
    ('Vacuum living room', dad_id, 10, false, null),
    ('Clean bathroom', emma_id, 20, false, 'Saturday'),
    ('Load dishwasher', jake_id, 5, false, null),
    ('Mow the lawn', dad_id, 20, false, 'Sunday'),
    ('Organize toy room', emma_id, 10, false, null)
  ON CONFLICT (id) DO NOTHING;
END $$;