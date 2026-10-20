/*
  # Add Whereabouts Rule Keywords

  1. Seed
    - Daycare and after-school care count as School on the clock:
      daycare, creche, crèche, kinderopvang, opvang, BSO
    - Working from home counts as Home, at priority 10 so it beats the generic
      "office"/"work" rules: home office, thuiswerken

  2. Security
    - No change (table created in 20261022120000_create_whereabouts_tables.sql)
*/

INSERT INTO whereabouts_rules (member_id, keyword, status, priority) VALUES
  (NULL, 'daycare', 'school', 0),
  (NULL, 'creche', 'school', 0),
  (NULL, 'crèche', 'school', 0),
  (NULL, 'kinderopvang', 'school', 0),
  (NULL, 'opvang', 'school', 0),
  (NULL, 'BSO', 'school', 0),
  (NULL, 'home office', 'home', 10),
  (NULL, 'thuiswerken', 'home', 10);
