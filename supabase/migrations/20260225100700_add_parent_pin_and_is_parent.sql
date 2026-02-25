-- Add parent_pin to app_settings (move PIN from hardcoded to database)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS parent_pin text DEFAULT '1234';

-- Set default PIN for existing settings rows
UPDATE app_settings SET parent_pin = '1234' WHERE parent_pin IS NULL;

-- Add is_parent to family_members (TypeScript type declares it)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS is_parent boolean DEFAULT false;
