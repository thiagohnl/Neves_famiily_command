-- Create increment_points RPC function (called by useChores.ts and ChoreManagement.tsx)
CREATE OR REPLACE FUNCTION increment_points(member_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE family_members
  SET points = points + points_to_add
  WHERE id = member_id;
END;
$$;
