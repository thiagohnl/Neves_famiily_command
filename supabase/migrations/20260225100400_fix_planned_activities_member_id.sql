-- Add member_id column to planned_activities (useActivities.ts inserts it but column doesn't exist)
ALTER TABLE planned_activities
ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_planned_activities_member ON planned_activities(member_id);
