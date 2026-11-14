/*
  # Add Show Age To Family Members

  1. Modified Tables
    - `family_members`
      - `show_age` (boolean, default true) - On the member's birthday the Board hero reads
        "🎂 Isabel is 4 today!"; when false it reads "🎂 Happy birthday Isabel!" instead

  2. Security
    - No change: `family_members` already has RLS enabled with a permissive policy for anon, authenticated
*/

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS show_age boolean NOT NULL DEFAULT true;
