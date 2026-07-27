-- Add free-text side dishes to planned meals
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS sides text[] DEFAULT '{}';
