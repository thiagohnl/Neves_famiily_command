/*
  # Add Board Layout Setting

  1. Modified Tables
    - `app_settings`
      - `board_layout` (text) - Board tab layout: 'home' (whereabouts clock + Today list)
        or 'timeline' (summary cards + per-member timeline). Default 'home'.

  2. Security
    - No change: `app_settings` already has RLS enabled with a permissive policy for anon, authenticated
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS board_layout text NOT NULL DEFAULT 'home'
    CHECK (board_layout IN ('timeline', 'home'));
