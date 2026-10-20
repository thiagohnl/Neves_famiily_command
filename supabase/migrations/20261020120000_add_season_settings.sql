/*
  # Add Season Settings

  1. Modified Tables
    - `app_settings`
      - `language` (text) - Language for season strings: 'en', 'pt' or 'nl' (default 'en')
      - `active_season` (text, nullable) - Manual season override ('sinterklaas', 'christmas', 'none');
        null means the season is picked automatically from the date
      - `season_dates` (jsonb) - Per-year season dates, e.g.
        {"sinterklaas": {"intocht": "2026-11-14", "intocht_local": "2026-11-15",
                         "pakjesavond": "2026-12-05", "journaal_start": "2026-11-09",
                         "shoe_nights": ["2026-11-09", "2026-11-16"]}}

  2. Security
    - No change: `app_settings` already has RLS enabled with a permissive policy for anon, authenticated
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'pt', 'nl'));

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS active_season text;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS season_dates jsonb NOT NULL DEFAULT '{}'::jsonb;
