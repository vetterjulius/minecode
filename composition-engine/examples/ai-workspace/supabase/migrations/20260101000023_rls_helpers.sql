-- Membership check used by tenant row level security policies.
-- SECURITY DEFINER avoids recursive policy evaluation on "membership".
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."membership" m
    WHERE m."organization_id" = org_id AND m."user_id" = auth.uid()
  );
$$;
