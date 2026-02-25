/*
  # Add personalization features

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key)
      - `title` (text, app title)
      - `theme` (text, theme selection)
      - `email_summaries` (boolean, email toggle)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add `photo_url` column to `family_members` table for profile photos

  3. Security
    - Enable RLS on `app_settings` table
    - Add policies for authenticated users
*/

-- Add photo_url column to family_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE family_members ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT 'Family Chore Board',
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'kids')),
  email_summaries boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings"
  ON app_settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for profile photos
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can upload profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can update profile photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Anyone can delete profile photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos');