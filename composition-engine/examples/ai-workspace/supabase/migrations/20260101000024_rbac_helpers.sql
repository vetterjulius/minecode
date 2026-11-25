-- Permission check used by tenant row level security policies.
-- A member holds a permission when the role named in "membership"."role" grants it.
CREATE OR REPLACE FUNCTION public.has_permission(org_id uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."membership" m
    JOIN public."role_permission" rp ON rp."role" = m."role"
    WHERE m."organization_id" = org_id
      AND m."user_id" = auth.uid()
      AND rp."permission" = permission_name
  );
$$;
