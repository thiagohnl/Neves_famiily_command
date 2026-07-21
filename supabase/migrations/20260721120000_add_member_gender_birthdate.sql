-- Add gender and date of birth to family members
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS birth_date date;
