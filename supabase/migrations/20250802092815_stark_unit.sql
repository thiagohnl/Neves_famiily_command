/*
  # Update RLS policies for chores table

  1. Security
    - Update RLS policies to allow all operations for anonymous and authenticated users
    - Ensure proper permissions for creating, reading, updating, and deleting chores
    - Add policy for completing chores and updating family member points

  2. Changes
    - Drop existing restrictive policies
    - Add comprehensive policies for all CRUD operations
    - Allow anonymous users to manage chores (for demo purposes)
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on chores" ON chores;
DROP POLICY IF EXISTS "Users can manage chores" ON chores;
DROP POLICY IF EXISTS "Public can manage chores" ON chores;

-- Create comprehensive policy for chores
CREATE POLICY "Allow all chore operations"
  ON chores
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure family_members table also has proper policies
DROP POLICY IF EXISTS "Allow all operations on family_members" ON family_members;
DROP POLICY IF EXISTS "Users can manage family members" ON family_members;
DROP POLICY IF EXISTS "Public can manage family members" ON family_members;

-- Create comprehensive policy for family_members
CREATE POLICY "Allow all family member operations"
  ON family_members
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure app_settings table has proper policies
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Public can manage app settings" ON app_settings;

-- Create comprehensive policy for app_settings
CREATE POLICY "Allow all app settings operations"
  ON app_settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);