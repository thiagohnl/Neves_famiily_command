/*
  # Create meal planning system

  1. New Tables
    - `meals`
      - `id` (uuid, primary key)
      - `name` (text, meal name)
      - `emoji` (text, meal emoji)
      - `notes` (text, optional notes)
      - `created_at` (timestamp)
    - `meal_plans`
      - `id` (uuid, primary key)
      - `meal_id` (uuid, foreign key to meals)
      - `date` (date, the planned date)
      - `meal_type` (text, 'Lunch' or 'Dinner')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their meal data
*/

CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '🍽️',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meals(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Lunch', 'Dinner')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for meals
CREATE POLICY "Allow all meal operations"
  ON meals
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for meal_plans
CREATE POLICY "Allow all meal plan operations"
  ON meal_plans
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_type ON meal_plans(meal_type);
CREATE INDEX IF NOT EXISTS idx_meals_name ON meals(name);