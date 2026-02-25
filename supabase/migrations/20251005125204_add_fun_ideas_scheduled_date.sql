/*
  # Add scheduled_date to fun_ideas table

  1. Changes
    - Add scheduled_date column to fun_ideas table to allow scheduling fun ideas
    - This allows families to plan when they want to do specific activities
  
  2. Notes
    - The scheduled_date is optional and stored as a date
    - Existing fun ideas will have NULL scheduled_date
*/

-- Add scheduled_date column to fun_ideas table
ALTER TABLE fun_ideas 
ADD COLUMN IF NOT EXISTS scheduled_date date;
