-- Organization: tenant on id, writes: server-only
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization_select" ON "organization";
CREATE POLICY "organization_select" ON "organization" FOR SELECT TO authenticated USING (public.is_org_member("organization"."id"));

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

-- Article: tenant on organizationId
ALTER TABLE "article" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_select" ON "article";
CREATE POLICY "article_select" ON "article" FOR SELECT TO authenticated USING (public.is_org_member("article"."organization_id"));
DROP POLICY IF EXISTS "article_insert" ON "article";
CREATE POLICY "article_insert" ON "article" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("article"."organization_id"));
DROP POLICY IF EXISTS "article_update" ON "article";
CREATE POLICY "article_update" ON "article" FOR UPDATE TO authenticated USING (public.is_org_member("article"."organization_id")) WITH CHECK (public.is_org_member("article"."organization_id"));
DROP POLICY IF EXISTS "article_delete" ON "article";
CREATE POLICY "article_delete" ON "article" FOR DELETE TO authenticated USING (public.is_org_member("article"."organization_id"));

-- AuditLog: owner on actorId, writes: insert-only
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select" ON "audit_log";
CREATE POLICY "audit_log_select" ON "audit_log" FOR SELECT TO authenticated USING ("audit_log"."actor_id" = auth.uid());
DROP POLICY IF EXISTS "audit_log_insert" ON "audit_log";
CREATE POLICY "audit_log_insert" ON "audit_log" FOR INSERT TO authenticated WITH CHECK ("audit_log"."actor_id" = auth.uid());

-- ChatMessage: owner on userId
ALTER TABLE "chat_message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_message_select" ON "chat_message";
CREATE POLICY "chat_message_select" ON "chat_message" FOR SELECT TO authenticated USING ("chat_message"."user_id" = auth.uid());
DROP POLICY IF EXISTS "chat_message_insert" ON "chat_message";
CREATE POLICY "chat_message_insert" ON "chat_message" FOR INSERT TO authenticated WITH CHECK ("chat_message"."user_id" = auth.uid());
DROP POLICY IF EXISTS "chat_message_update" ON "chat_message";
CREATE POLICY "chat_message_update" ON "chat_message" FOR UPDATE TO authenticated USING ("chat_message"."user_id" = auth.uid()) WITH CHECK ("chat_message"."user_id" = auth.uid());
DROP POLICY IF EXISTS "chat_message_delete" ON "chat_message";
CREATE POLICY "chat_message_delete" ON "chat_message" FOR DELETE TO authenticated USING ("chat_message"."user_id" = auth.uid());

-- Workspace: tenant on organizationId
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_select" ON "workspace";
CREATE POLICY "workspace_select" ON "workspace" FOR SELECT TO authenticated USING (public.is_org_member("workspace"."organization_id"));
DROP POLICY IF EXISTS "workspace_insert" ON "workspace";
CREATE POLICY "workspace_insert" ON "workspace" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("workspace"."organization_id"));
DROP POLICY IF EXISTS "workspace_update" ON "workspace";
CREATE POLICY "workspace_update" ON "workspace" FOR UPDATE TO authenticated USING (public.is_org_member("workspace"."organization_id")) WITH CHECK (public.is_org_member("workspace"."organization_id"));
DROP POLICY IF EXISTS "workspace_delete" ON "workspace";
CREATE POLICY "workspace_delete" ON "workspace" FOR DELETE TO authenticated USING (public.is_org_member("workspace"."organization_id"));

-- Project: tenant on organizationId
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_select" ON "project";
CREATE POLICY "project_select" ON "project" FOR SELECT TO authenticated USING (public.is_org_member("project"."organization_id"));
DROP POLICY IF EXISTS "project_insert" ON "project";
CREATE POLICY "project_insert" ON "project" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("project"."organization_id"));
DROP POLICY IF EXISTS "project_update" ON "project";
CREATE POLICY "project_update" ON "project" FOR UPDATE TO authenticated USING (public.is_org_member("project"."organization_id")) WITH CHECK (public.is_org_member("project"."organization_id"));
DROP POLICY IF EXISTS "project_delete" ON "project";
CREATE POLICY "project_delete" ON "project" FOR DELETE TO authenticated USING (public.is_org_member("project"."organization_id"));

-- Document: tenant on projectId via Project
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_select" ON "document";
CREATE POLICY "document_select" ON "document" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id"));
DROP POLICY IF EXISTS "document_insert" ON "document";
CREATE POLICY "document_insert" ON "document" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id"));
DROP POLICY IF EXISTS "document_update" ON "document";
CREATE POLICY "document_update" ON "document" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id")) WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id"));
DROP POLICY IF EXISTS "document_delete" ON "document";
CREATE POLICY "document_delete" ON "document" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id"));

-- Feedback: tenant on organizationId
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_select" ON "feedback";
CREATE POLICY "feedback_select" ON "feedback" FOR SELECT TO authenticated USING (public.is_org_member("feedback"."organization_id"));
DROP POLICY IF EXISTS "feedback_insert" ON "feedback";
CREATE POLICY "feedback_insert" ON "feedback" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("feedback"."organization_id"));
DROP POLICY IF EXISTS "feedback_update" ON "feedback";
CREATE POLICY "feedback_update" ON "feedback" FOR UPDATE TO authenticated USING (public.is_org_member("feedback"."organization_id")) WITH CHECK (public.is_org_member("feedback"."organization_id"));
DROP POLICY IF EXISTS "feedback_delete" ON "feedback";
CREATE POLICY "feedback_delete" ON "feedback" FOR DELETE TO authenticated USING (public.is_org_member("feedback"."organization_id"));

-- File: tenant on organizationId
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_select" ON "file";
CREATE POLICY "file_select" ON "file" FOR SELECT TO authenticated USING (public.is_org_member("file"."organization_id"));
DROP POLICY IF EXISTS "file_insert" ON "file";
CREATE POLICY "file_insert" ON "file" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("file"."organization_id"));
DROP POLICY IF EXISTS "file_update" ON "file";
CREATE POLICY "file_update" ON "file" FOR UPDATE TO authenticated USING (public.is_org_member("file"."organization_id")) WITH CHECK (public.is_org_member("file"."organization_id"));
DROP POLICY IF EXISTS "file_delete" ON "file";
CREATE POLICY "file_delete" ON "file" FOR DELETE TO authenticated USING (public.is_org_member("file"."organization_id"));

-- Invitation: tenant on organizationId, writes: server-only
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitation_select" ON "invitation";
CREATE POLICY "invitation_select" ON "invitation" FOR SELECT TO authenticated USING (public.is_org_member("invitation"."organization_id"));

-- Membership: tenant on organizationId, writes: server-only
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membership_select" ON "membership";
CREATE POLICY "membership_select" ON "membership" FOR SELECT TO authenticated USING (public.is_org_member("membership"."organization_id"));

-- Metric: tenant on organizationId
ALTER TABLE "metric" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metric_select" ON "metric";
CREATE POLICY "metric_select" ON "metric" FOR SELECT TO authenticated USING (public.is_org_member("metric"."organization_id"));
DROP POLICY IF EXISTS "metric_insert" ON "metric";
CREATE POLICY "metric_insert" ON "metric" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("metric"."organization_id"));
DROP POLICY IF EXISTS "metric_update" ON "metric";
CREATE POLICY "metric_update" ON "metric" FOR UPDATE TO authenticated USING (public.is_org_member("metric"."organization_id")) WITH CHECK (public.is_org_member("metric"."organization_id"));
DROP POLICY IF EXISTS "metric_delete" ON "metric";
CREATE POLICY "metric_delete" ON "metric" FOR DELETE TO authenticated USING (public.is_org_member("metric"."organization_id"));

-- Notification: owner on userId
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_select" ON "notification";
CREATE POLICY "notification_select" ON "notification" FOR SELECT TO authenticated USING ("notification"."user_id" = auth.uid());
DROP POLICY IF EXISTS "notification_insert" ON "notification";
CREATE POLICY "notification_insert" ON "notification" FOR INSERT TO authenticated WITH CHECK ("notification"."user_id" = auth.uid());
DROP POLICY IF EXISTS "notification_update" ON "notification";
CREATE POLICY "notification_update" ON "notification" FOR UPDATE TO authenticated USING ("notification"."user_id" = auth.uid()) WITH CHECK ("notification"."user_id" = auth.uid());
DROP POLICY IF EXISTS "notification_delete" ON "notification";
CREATE POLICY "notification_delete" ON "notification" FOR DELETE TO authenticated USING ("notification"."user_id" = auth.uid());

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

-- Task: tenant on projectId via Project
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_select" ON "task";
CREATE POLICY "task_select" ON "task" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id"));
DROP POLICY IF EXISTS "task_insert" ON "task";
CREATE POLICY "task_insert" ON "task" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id"));
DROP POLICY IF EXISTS "task_update" ON "task";
CREATE POLICY "task_update" ON "task" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id")) WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id"));
DROP POLICY IF EXISTS "task_delete" ON "task";
CREATE POLICY "task_delete" ON "task" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id"));

-- Ticket: tenant on organizationId
ALTER TABLE "ticket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_select" ON "ticket";
CREATE POLICY "ticket_select" ON "ticket" FOR SELECT TO authenticated USING (public.is_org_member("ticket"."organization_id"));
DROP POLICY IF EXISTS "ticket_insert" ON "ticket";
CREATE POLICY "ticket_insert" ON "ticket" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("ticket"."organization_id"));
DROP POLICY IF EXISTS "ticket_update" ON "ticket";
CREATE POLICY "ticket_update" ON "ticket" FOR UPDATE TO authenticated USING (public.is_org_member("ticket"."organization_id")) WITH CHECK (public.is_org_member("ticket"."organization_id"));
DROP POLICY IF EXISTS "ticket_delete" ON "ticket";
CREATE POLICY "ticket_delete" ON "ticket" FOR DELETE TO authenticated USING (public.is_org_member("ticket"."organization_id"));

-- WhiteboardSession: tenant on organizationId
ALTER TABLE "whiteboard_session" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whiteboard_session_select" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_select" ON "whiteboard_session" FOR SELECT TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id"));
DROP POLICY IF EXISTS "whiteboard_session_insert" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_insert" ON "whiteboard_session" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("whiteboard_session"."organization_id"));
DROP POLICY IF EXISTS "whiteboard_session_update" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_update" ON "whiteboard_session" FOR UPDATE TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id")) WITH CHECK (public.is_org_member("whiteboard_session"."organization_id"));
DROP POLICY IF EXISTS "whiteboard_session_delete" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_delete" ON "whiteboard_session" FOR DELETE TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id"));
