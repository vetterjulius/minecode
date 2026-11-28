-- Organization: tenant on id, writes: server-only, permissions: read=org.read write=-
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organization_select" ON "organization";
CREATE POLICY "organization_select" ON "organization" FOR SELECT TO authenticated USING (public.is_org_member("organization"."id") AND public.has_permission("organization"."id", 'org.read'));

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

-- Article: tenant on organizationId, permissions: read=articles.read write=articles.write
ALTER TABLE "article" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "article_select" ON "article";
CREATE POLICY "article_select" ON "article" FOR SELECT TO authenticated USING (public.is_org_member("article"."organization_id") AND public.has_permission("article"."organization_id", 'articles.read'));
DROP POLICY IF EXISTS "article_insert" ON "article";
CREATE POLICY "article_insert" ON "article" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("article"."organization_id") AND public.has_permission("article"."organization_id", 'articles.write'));
DROP POLICY IF EXISTS "article_update" ON "article";
CREATE POLICY "article_update" ON "article" FOR UPDATE TO authenticated USING (public.is_org_member("article"."organization_id") AND public.has_permission("article"."organization_id", 'articles.write')) WITH CHECK (public.is_org_member("article"."organization_id") AND public.has_permission("article"."organization_id", 'articles.write'));
DROP POLICY IF EXISTS "article_delete" ON "article";
CREATE POLICY "article_delete" ON "article" FOR DELETE TO authenticated USING (public.is_org_member("article"."organization_id") AND public.has_permission("article"."organization_id", 'articles.write'));

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

-- Workspace: tenant on organizationId, permissions: read=workspace.read write=workspace.write
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_select" ON "workspace";
CREATE POLICY "workspace_select" ON "workspace" FOR SELECT TO authenticated USING (public.is_org_member("workspace"."organization_id") AND public.has_permission("workspace"."organization_id", 'workspace.read'));
DROP POLICY IF EXISTS "workspace_insert" ON "workspace";
CREATE POLICY "workspace_insert" ON "workspace" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("workspace"."organization_id") AND public.has_permission("workspace"."organization_id", 'workspace.write'));
DROP POLICY IF EXISTS "workspace_update" ON "workspace";
CREATE POLICY "workspace_update" ON "workspace" FOR UPDATE TO authenticated USING (public.is_org_member("workspace"."organization_id") AND public.has_permission("workspace"."organization_id", 'workspace.write')) WITH CHECK (public.is_org_member("workspace"."organization_id") AND public.has_permission("workspace"."organization_id", 'workspace.write'));
DROP POLICY IF EXISTS "workspace_delete" ON "workspace";
CREATE POLICY "workspace_delete" ON "workspace" FOR DELETE TO authenticated USING (public.is_org_member("workspace"."organization_id") AND public.has_permission("workspace"."organization_id", 'workspace.write'));

-- Project: tenant on organizationId, permissions: read=project.read write=project.write
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_select" ON "project";
CREATE POLICY "project_select" ON "project" FOR SELECT TO authenticated USING (public.is_org_member("project"."organization_id") AND public.has_permission("project"."organization_id", 'project.read'));
DROP POLICY IF EXISTS "project_insert" ON "project";
CREATE POLICY "project_insert" ON "project" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("project"."organization_id") AND public.has_permission("project"."organization_id", 'project.write'));
DROP POLICY IF EXISTS "project_update" ON "project";
CREATE POLICY "project_update" ON "project" FOR UPDATE TO authenticated USING (public.is_org_member("project"."organization_id") AND public.has_permission("project"."organization_id", 'project.write')) WITH CHECK (public.is_org_member("project"."organization_id") AND public.has_permission("project"."organization_id", 'project.write'));
DROP POLICY IF EXISTS "project_delete" ON "project";
CREATE POLICY "project_delete" ON "project" FOR DELETE TO authenticated USING (public.is_org_member("project"."organization_id") AND public.has_permission("project"."organization_id", 'project.write'));

-- Document: tenant on projectId via Project, permissions: read=document.read write=document.write
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_select" ON "document";
CREATE POLICY "document_select" ON "document" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id" AND public.has_permission(p."organization_id", 'document.read')));
DROP POLICY IF EXISTS "document_insert" ON "document";
CREATE POLICY "document_insert" ON "document" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id" AND public.has_permission(p."organization_id", 'document.write')));
DROP POLICY IF EXISTS "document_update" ON "document";
CREATE POLICY "document_update" ON "document" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id" AND public.has_permission(p."organization_id", 'document.write'))) WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id" AND public.has_permission(p."organization_id", 'document.write')));
DROP POLICY IF EXISTS "document_delete" ON "document";
CREATE POLICY "document_delete" ON "document" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "document"."project_id" AND public.has_permission(p."organization_id", 'document.write')));

-- Feedback: tenant on organizationId, permissions: read=feedback.read write=feedback.write
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_select" ON "feedback";
CREATE POLICY "feedback_select" ON "feedback" FOR SELECT TO authenticated USING (public.is_org_member("feedback"."organization_id") AND public.has_permission("feedback"."organization_id", 'feedback.read'));
DROP POLICY IF EXISTS "feedback_insert" ON "feedback";
CREATE POLICY "feedback_insert" ON "feedback" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("feedback"."organization_id") AND public.has_permission("feedback"."organization_id", 'feedback.write'));
DROP POLICY IF EXISTS "feedback_update" ON "feedback";
CREATE POLICY "feedback_update" ON "feedback" FOR UPDATE TO authenticated USING (public.is_org_member("feedback"."organization_id") AND public.has_permission("feedback"."organization_id", 'feedback.write')) WITH CHECK (public.is_org_member("feedback"."organization_id") AND public.has_permission("feedback"."organization_id", 'feedback.write'));
DROP POLICY IF EXISTS "feedback_delete" ON "feedback";
CREATE POLICY "feedback_delete" ON "feedback" FOR DELETE TO authenticated USING (public.is_org_member("feedback"."organization_id") AND public.has_permission("feedback"."organization_id", 'feedback.write'));

-- File: tenant on organizationId, permissions: read=storage.read write=storage.write
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_select" ON "file";
CREATE POLICY "file_select" ON "file" FOR SELECT TO authenticated USING (public.is_org_member("file"."organization_id") AND public.has_permission("file"."organization_id", 'storage.read'));
DROP POLICY IF EXISTS "file_insert" ON "file";
CREATE POLICY "file_insert" ON "file" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("file"."organization_id") AND public.has_permission("file"."organization_id", 'storage.write'));
DROP POLICY IF EXISTS "file_update" ON "file";
CREATE POLICY "file_update" ON "file" FOR UPDATE TO authenticated USING (public.is_org_member("file"."organization_id") AND public.has_permission("file"."organization_id", 'storage.write')) WITH CHECK (public.is_org_member("file"."organization_id") AND public.has_permission("file"."organization_id", 'storage.write'));
DROP POLICY IF EXISTS "file_delete" ON "file";
CREATE POLICY "file_delete" ON "file" FOR DELETE TO authenticated USING (public.is_org_member("file"."organization_id") AND public.has_permission("file"."organization_id", 'storage.write'));

-- Invitation: tenant on organizationId, writes: server-only, permissions: read=org.invite write=-
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitation_select" ON "invitation";
CREATE POLICY "invitation_select" ON "invitation" FOR SELECT TO authenticated USING (public.is_org_member("invitation"."organization_id") AND public.has_permission("invitation"."organization_id", 'org.invite'));

-- Membership: tenant on organizationId, writes: server-only, permissions: read=org.read write=-
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membership_select" ON "membership";
CREATE POLICY "membership_select" ON "membership" FOR SELECT TO authenticated USING (public.is_org_member("membership"."organization_id") AND public.has_permission("membership"."organization_id", 'org.read'));

-- Metric: tenant on organizationId, permissions: read=analytics.view write=analytics.view
ALTER TABLE "metric" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metric_select" ON "metric";
CREATE POLICY "metric_select" ON "metric" FOR SELECT TO authenticated USING (public.is_org_member("metric"."organization_id") AND public.has_permission("metric"."organization_id", 'analytics.view'));
DROP POLICY IF EXISTS "metric_insert" ON "metric";
CREATE POLICY "metric_insert" ON "metric" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("metric"."organization_id") AND public.has_permission("metric"."organization_id", 'analytics.view'));
DROP POLICY IF EXISTS "metric_update" ON "metric";
CREATE POLICY "metric_update" ON "metric" FOR UPDATE TO authenticated USING (public.is_org_member("metric"."organization_id") AND public.has_permission("metric"."organization_id", 'analytics.view')) WITH CHECK (public.is_org_member("metric"."organization_id") AND public.has_permission("metric"."organization_id", 'analytics.view'));
DROP POLICY IF EXISTS "metric_delete" ON "metric";
CREATE POLICY "metric_delete" ON "metric" FOR DELETE TO authenticated USING (public.is_org_member("metric"."organization_id") AND public.has_permission("metric"."organization_id", 'analytics.view'));

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

-- StripeCustomer: tenant on organizationId, writes: server-only, permissions: read=billing.read write=-
ALTER TABLE "stripe_customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_customer_select" ON "stripe_customer";
CREATE POLICY "stripe_customer_select" ON "stripe_customer" FOR SELECT TO authenticated USING (public.is_org_member("stripe_customer"."organization_id") AND public.has_permission("stripe_customer"."organization_id", 'billing.read'));

-- Subscription: tenant on organizationId, writes: server-only, permissions: read=billing.read write=-
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_select" ON "subscription";
CREATE POLICY "subscription_select" ON "subscription" FOR SELECT TO authenticated USING (public.is_org_member("subscription"."organization_id") AND public.has_permission("subscription"."organization_id", 'billing.read'));

-- Task: tenant on projectId via Project, permissions: read=task.read write=task.write
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_select" ON "task";
CREATE POLICY "task_select" ON "task" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id" AND public.has_permission(p."organization_id", 'task.read')));
DROP POLICY IF EXISTS "task_insert" ON "task";
CREATE POLICY "task_insert" ON "task" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id" AND public.has_permission(p."organization_id", 'task.write')));
DROP POLICY IF EXISTS "task_update" ON "task";
CREATE POLICY "task_update" ON "task" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id" AND public.has_permission(p."organization_id", 'task.write'))) WITH CHECK (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id" AND public.has_permission(p."organization_id", 'task.write')));
DROP POLICY IF EXISTS "task_delete" ON "task";
CREATE POLICY "task_delete" ON "task" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM "project" p WHERE p."id" = "task"."project_id" AND public.has_permission(p."organization_id", 'task.write')));

-- Ticket: tenant on organizationId, permissions: read=tickets.read write=tickets.write
ALTER TABLE "ticket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_select" ON "ticket";
CREATE POLICY "ticket_select" ON "ticket" FOR SELECT TO authenticated USING (public.is_org_member("ticket"."organization_id") AND public.has_permission("ticket"."organization_id", 'tickets.read'));
DROP POLICY IF EXISTS "ticket_insert" ON "ticket";
CREATE POLICY "ticket_insert" ON "ticket" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("ticket"."organization_id") AND public.has_permission("ticket"."organization_id", 'tickets.write'));
DROP POLICY IF EXISTS "ticket_update" ON "ticket";
CREATE POLICY "ticket_update" ON "ticket" FOR UPDATE TO authenticated USING (public.is_org_member("ticket"."organization_id") AND public.has_permission("ticket"."organization_id", 'tickets.write')) WITH CHECK (public.is_org_member("ticket"."organization_id") AND public.has_permission("ticket"."organization_id", 'tickets.write'));
DROP POLICY IF EXISTS "ticket_delete" ON "ticket";
CREATE POLICY "ticket_delete" ON "ticket" FOR DELETE TO authenticated USING (public.is_org_member("ticket"."organization_id") AND public.has_permission("ticket"."organization_id", 'tickets.write'));

-- WhiteboardSession: tenant on organizationId, permissions: read=whiteboard.view write=whiteboard.create
ALTER TABLE "whiteboard_session" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whiteboard_session_select" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_select" ON "whiteboard_session" FOR SELECT TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id") AND public.has_permission("whiteboard_session"."organization_id", 'whiteboard.view'));
DROP POLICY IF EXISTS "whiteboard_session_insert" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_insert" ON "whiteboard_session" FOR INSERT TO authenticated WITH CHECK (public.is_org_member("whiteboard_session"."organization_id") AND public.has_permission("whiteboard_session"."organization_id", 'whiteboard.create'));
DROP POLICY IF EXISTS "whiteboard_session_update" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_update" ON "whiteboard_session" FOR UPDATE TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id") AND public.has_permission("whiteboard_session"."organization_id", 'whiteboard.create')) WITH CHECK (public.is_org_member("whiteboard_session"."organization_id") AND public.has_permission("whiteboard_session"."organization_id", 'whiteboard.create'));
DROP POLICY IF EXISTS "whiteboard_session_delete" ON "whiteboard_session";
CREATE POLICY "whiteboard_session_delete" ON "whiteboard_session" FOR DELETE TO authenticated USING (public.is_org_member("whiteboard_session"."organization_id") AND public.has_permission("whiteboard_session"."organization_id", 'whiteboard.create'));
