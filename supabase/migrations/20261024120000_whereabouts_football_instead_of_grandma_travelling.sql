/*
  # Whereabouts: Football Instead Of Grandma's And Travelling

  1. Modified Tables
    - `whereabouts_overrides`, `whereabouts_rules`: allowed statuses are now
      home, school, work, church, playdate, football, sleeping
      ('grandma' and 'travelling' removed from the clock)

  2. Data
    - Overrides and rules pointing at 'grandma' or 'travelling' are deleted
      (vovó, vovo, grandma, travel, flight, train)
    - New rules: football, voetbal, futebol, soccer → football

  3. Security
    - No change
*/

DELETE FROM whereabouts_overrides WHERE status IN ('grandma', 'travelling');
DELETE FROM whereabouts_rules WHERE status IN ('grandma', 'travelling');

ALTER TABLE whereabouts_overrides DROP CONSTRAINT IF EXISTS whereabouts_overrides_status_check;
ALTER TABLE whereabouts_overrides ADD CONSTRAINT whereabouts_overrides_status_check
  CHECK (status IN ('home', 'school', 'work', 'church', 'playdate', 'football', 'sleeping'));

ALTER TABLE whereabouts_rules DROP CONSTRAINT IF EXISTS whereabouts_rules_status_check;
ALTER TABLE whereabouts_rules ADD CONSTRAINT whereabouts_rules_status_check
  CHECK (status IN ('home', 'school', 'work', 'church', 'playdate', 'football', 'sleeping'));

INSERT INTO whereabouts_rules (member_id, keyword, status, priority) VALUES
  (NULL, 'football', 'football', 0),
  (NULL, 'voetbal', 'football', 0),
  (NULL, 'futebol', 'football', 0),
  (NULL, 'soccer', 'football', 0);
