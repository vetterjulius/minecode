-- Creates an organization and makes the caller its owner in one transaction.
CREATE OR REPLACE FUNCTION public.create_organization(org_name text)
RETURNS public."organization"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created public."organization";
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public."organization" ("name") VALUES (org_name) RETURNING * INTO created;
  INSERT INTO public."membership" ("organization_id", "user_id", "role")
  VALUES (created."id", auth.uid(), 'owner');
  RETURN created;
END;
$$;

-- Changes the role of an organization member. Requires the 'rbac.write' permission and
-- never removes the last owner.
CREATE OR REPLACE FUNCTION public.change_member_role(org_id uuid, member_user_id uuid, new_role text)
RETURNS public."membership"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_role text;
  updated public."membership";
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_permission(org_id, 'rbac.write') THEN
    RAISE EXCEPTION 'Not allowed to change roles' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."role" WHERE "name" = new_role) THEN
    RAISE EXCEPTION 'Unknown role: %', new_role USING ERRCODE = '22023';
  END IF;
  SELECT "role" INTO existing_role FROM public."membership"
    WHERE "organization_id" = org_id AND "user_id" = member_user_id;
  IF existing_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '22023';
  END IF;
  IF existing_role = 'owner' AND new_role <> 'owner' AND
     (SELECT count(*) FROM public."membership" WHERE "organization_id" = org_id AND "role" = 'owner') <= 1 THEN
    RAISE EXCEPTION 'An organization needs at least one owner' USING ERRCODE = '22023';
  END IF;
  UPDATE public."membership" SET "role" = new_role
    WHERE "organization_id" = org_id AND "user_id" = member_user_id
    RETURNING * INTO updated;
  RETURN updated;
END;
$$;
