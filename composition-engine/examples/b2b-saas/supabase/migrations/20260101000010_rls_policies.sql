-- Organization: tenant on id, writes: server-only
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization_select" ON "organization";
CREATE POLICY "organization_select" ON "organization" FOR SELECT TO authenticated USING (public.is_org_member("organization"."id"));

-- Invitation: tenant on organizationId, writes: server-only
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitation_select" ON "invitation";
CREATE POLICY "invitation_select" ON "invitation" FOR SELECT TO authenticated USING (public.is_org_member("invitation"."organization_id"));

-- Profile: owner on id
ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_select" ON "profile";
CREATE POLICY "profile_select" ON "profile" FOR SELECT TO authenticated USING ("profile"."id" = auth.uid());
DROP POLICY IF EXISTS "profile_insert" ON "profile";
CREATE POLICY "profile_insert" ON "profile" FOR INSERT TO authenticated WITH CHECK ("profile"."id" = auth.uid());
DROP POLICY IF EXISTS "profile_update" ON "profile";
CREATE POLICY "profile_update" ON "profile" FOR UPDATE TO authenticated USING ("profile"."id" = auth.uid()) WITH CHECK ("profile"."id" = auth.uid());
DROP POLICY IF EXISTS "profile_delete" ON "profile";
CREATE POLICY "profile_delete" ON "profile" FOR DELETE TO authenticated USING ("profile"."id" = auth.uid());

-- Membership: tenant on organizationId, writes: server-only
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membership_select" ON "membership";
CREATE POLICY "membership_select" ON "membership" FOR SELECT TO authenticated USING (public.is_org_member("membership"."organization_id"));

-- Permission: authenticated-read
ALTER TABLE "permission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permission_select" ON "permission";
CREATE POLICY "permission_select" ON "permission" FOR SELECT TO authenticated USING (true);

-- Role: authenticated-read
ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_select" ON "role";
CREATE POLICY "role_select" ON "role" FOR SELECT TO authenticated USING (true);

-- RolePermission: authenticated-read
ALTER TABLE "role_permission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permission_select" ON "role_permission";
CREATE POLICY "role_permission_select" ON "role_permission" FOR SELECT TO authenticated USING (true);

-- StripeCustomer: tenant on organizationId, writes: server-only
ALTER TABLE "stripe_customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_customer_select" ON "stripe_customer";
CREATE POLICY "stripe_customer_select" ON "stripe_customer" FOR SELECT TO authenticated USING (public.is_org_member("stripe_customer"."organization_id"));

-- Subscription: tenant on organizationId, writes: server-only
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_select" ON "subscription";
CREATE POLICY "subscription_select" ON "subscription" FOR SELECT TO authenticated USING (public.is_org_member("subscription"."organization_id"));
