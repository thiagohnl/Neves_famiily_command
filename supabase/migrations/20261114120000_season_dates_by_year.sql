/*
  # Season Dates Keyed By Year

  1. Modified Tables
    - `app_settings`
      - `season_dates` (jsonb) - Now keyed by year so each autumn starts fresh and the
        board can compute the usual dates itself, e.g.
        {"2026": {"sinterklaas": {"intocht": "2026-11-14", "shoe_nights": ["2026-11-16"],
                                  "crossed_days": ["2026-11-15"]},
                  "christmas": {"crossed_days": []}}}
        Missing Sinterklaas dates are computed by the app (intocht = first Saturday after
        11 November, intocht_local = the Sunday after, journaal_start = the Monday before,
        pakjesavond = 5 December).

  2. Data
    - Move the old flat shape ({"sinterklaas": {...}}) under the "2026" key
    - Correct the 2026 dates entered by hand: journaal_start 2026-11-12 -> 2026-11-09,
      intocht 2026-11-13 -> 2026-11-14

  3. Security
    - No change: `app_settings` already has RLS enabled with a permissive policy for anon, authenticated
*/

-- Flat shape: any top-level key that is not a year
UPDATE app_settings
SET season_dates = jsonb_build_object('2026', season_dates)
WHERE season_dates <> '{}'::jsonb
  AND EXISTS (SELECT 1 FROM jsonb_object_keys(season_dates) AS k WHERE k !~ '^\d{4}$');

UPDATE app_settings
SET season_dates = jsonb_set(season_dates, '{2026,sinterklaas,journaal_start}', '"2026-11-09"')
WHERE season_dates #>> '{2026,sinterklaas,journaal_start}' = '2026-11-12';

UPDATE app_settings
SET season_dates = jsonb_set(season_dates, '{2026,sinterklaas,intocht}', '"2026-11-14"')
WHERE season_dates #>> '{2026,sinterklaas,intocht}' = '2026-11-13';
