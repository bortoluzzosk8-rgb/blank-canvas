-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create a new INSERT policy that allows:
-- 1. Admins to insert roles (existing functionality)
-- 2. Service role to insert the first role for a user (bootstrap)
CREATE POLICY "Admins can insert roles or bootstrap first role"
ON public.user_roles
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Allow if the inserter is already an admin
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Allow if the user being assigned a role doesn't have any roles yet (bootstrap)
  NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_roles.user_id
  )
);