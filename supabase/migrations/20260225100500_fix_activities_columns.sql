-- Add missing columns to activities table (TypeScript Activity type expects these)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recurring_days text[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_member_ids text[];
