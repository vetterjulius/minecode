-- Accepts an invitation by token: the caller joins the organization with the invited role.
CREATE OR REPLACE FUNCTION public.accept_invitation(invite_token text)
RETURNS public."membership"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite public."invitation";
  caller_email text;
  result public."membership";
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO invite FROM public."invitation" WHERE "token" = invite_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = '22023';
  END IF;
  IF invite."accepted_at" IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation was already used' USING ERRCODE = '22023';
  END IF;
  IF invite."expires_at" < now() THEN
    RAISE EXCEPTION 'Invitation expired' USING ERRCODE = '22023';
  END IF;
  SELECT lower("email") INTO caller_email FROM auth.users WHERE "id" = auth.uid();
  IF caller_email IS DISTINCT FROM lower(invite."email") THEN
    RAISE EXCEPTION 'Invitation was issued for a different email address' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."role" WHERE "name" = invite."role") THEN
    RAISE EXCEPTION 'Invitation names an unknown role' USING ERRCODE = '22023';
  END IF;
  -- Memberships have no composite unique key yet, so guard against joining twice explicitly.
  INSERT INTO public."membership" ("organization_id", "user_id", "role")
  SELECT invite."organization_id", auth.uid(), invite."role"
  WHERE NOT EXISTS (
    SELECT 1 FROM public."membership"
    WHERE "organization_id" = invite."organization_id" AND "user_id" = auth.uid()
  );
  UPDATE public."invitation" SET "accepted_at" = now() WHERE "id" = invite."id";
  SELECT * INTO result FROM public."membership"
    WHERE "organization_id" = invite."organization_id" AND "user_id" = auth.uid();
  RETURN result;
END;
$$;
