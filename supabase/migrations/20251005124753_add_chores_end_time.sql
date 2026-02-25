/*
  # Add end_time column to chores table

  1. Changes
    - Add end_time column to chores table to store the scheduled end time
    - This allows chores to have both start and end times for better scheduling
  
  2. Notes
    - The end_time is optional and stored as text in HH:MM format
    - Existing chores will have NULL end_time
*/

-- Add end_time column to chores table
ALTER TABLE chores 
ADD COLUMN IF NOT EXISTS end_time text;
