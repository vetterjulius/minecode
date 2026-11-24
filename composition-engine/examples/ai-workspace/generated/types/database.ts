// Row types of the database schema of AI Workspace Reference Application

/** Help center knowledge article (table "article") */
export interface ArticleRow {
  /** Primary key */
  id: string;
  /** Article heading title */
  title: string;
  /** Full markdown body content */
  content: string;
  /** Article help topic category */
  category: string;
  /** User ID of the author */
  author_id?: string | null;
  /** Reference to Organization */
  organization_id: string;
  /** Article publication timestamp */
  created_at: string;
}

/** Audit log entry tracking security events (table "audit_log") */
export interface AuditLogRow {
  /** Primary key */
  id: string;
  /** Type of event or action executed */
  action: string;
  /** User ID of the actor initiating the event */
  actor_id?: string | null;
  /** Name of the altered database entity */
  entity_name?: string | null;
  /** Identifier of the altered entity */
  entity_id?: string | null;
  /** Event context metadata */
  payload?: string | null;
  /** Timestamp of the log entry */
  created_at: string;
}

/** Chat message log (table "chat_message") */
export interface ChatMessageRow {
  /** Primary key */
  id: string;
  /** Reference to chat session */
  session_id: string;
  /** Role of the message sender (user, system, assistant) */
  role: string;
  /** Message body text */
  content: string;
  /** Message creation timestamp */
  created_at: string;
  /** Owner of the message */
  user_id: string;
}

/** App document (table "document") */
export interface DocumentRow {
  /** Primary key */
  id: string;
  /** Title of the document */
  title: string;
  /** Document content body */
  content?: string | null;
  /** Reference to Project */
  project_id: string;
  /** Document creation timestamp */
  created_at: string;
}

/** Customer satisfaction rating and text feedback (table "feedback") */
export interface FeedbackRow {
  /** Primary key */
  id: string;
  /** Satisfaction rating score (1-5) */
  rating: number;
  /** Customer comments text */
  comment?: string | null;
  /** Reference to User */
  user_id: string;
  /** Reference to Organization */
  organization_id: string;
  /** Timestamp of feedback submission */
  created_at: string;
}

/** Uploaded file metadata tracking (table "file") */
export interface FileRow {
  /** Primary key */
  id: string;
  /** Original name of the file */
  name: string;
  /** Path of the file inside the storage bucket */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mime_type: string;
  /** Reference to Organization */
  organization_id?: string | null;
  /** Timestamp of file upload */
  created_at: string;
}

/** Organization join invitation (table "invitation") */
export interface InvitationRow {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organization_id: string;
  /** Recipient email address */
  email: string;
  /** Target membership role */
  role: string;
  /** Secure invitation token */
  token: string;
  /** Expiration timestamp */
  expires_at: string;
}

/** User membership inside an organization (table "membership") */
export interface MembershipRow {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organization_id: string;
  /** Reference to User */
  user_id: string;
  /** User role inside organization */
  role: string;
  /** Membership assignment timestamp */
  created_at: string;
}

/** System metrics and resource usages (table "metric") */
export interface MetricRow {
  /** Primary key */
  id: string;
  /** Name of the logged metric */
  name: string;
  /** Value of the metric */
  value: number;
  /** Reference to Organization */
  organization_id: string;
  /** Timestamp of metric */
  created_at: string;
}

/** Notification tracking and status (table "notification") */
export interface NotificationRow {
  /** Primary key */
  id: string;
  /** Reference to User */
  user_id: string;
  /** Notification delivery channel (email, sms, slack) */
  channel: string;
  /** Notification title or header */
  title: string;
  /** Notification body text */
  content: string;
  /** Delivery status (pending, sent, failed) */
  status: string;
  /** Timestamp of notification */
  created_at: string;
}

/** App organization (tenant) (table "organization") */
export interface OrganizationRow {
  /** Primary key */
  id: string;
  /** Name of the organization */
  name: string;
  /** Tenant creation timestamp */
  created_at: string;
}

/** Specific action permission key (table "permission") */
export interface PermissionRow {
  /** Primary key */
  id: string;
  /** Unique permission handle (e.g. user.create) */
  name: string;
  /** Purpose description */
  description?: string | null;
}

/** Application profile of an authenticated user (mirrors auth.users) (table "profile") */
export interface ProfileRow {
  /** Primary key, equals auth.users.id */
  id: string;
  /** User email address */
  email: string;
  /** Display name */
  name?: string | null;
  /** Creation timestamp */
  created_at: string;
}

/** App project (table "project") */
export interface ProjectRow {
  /** Primary key */
  id: string;
  /** Name of the project */
  name: string;
  /** Optional description */
  description?: string | null;
  /** Project status (e.g. active, archived) */
  status: string;
  /** Reference to Organization */
  organization_id: string;
  /** Reference to Workspace */
  workspace_id: string;
  /** Project creation timestamp */
  created_at: string;
}

/** User security group role (table "role") */
export interface RoleRow {
  /** Primary key */
  id: string;
  /** Unique identifier name of the role */
  name: string;
  /** Friendly description of the role */
  description?: string | null;
}

/** Grants a permission to a role (table "role_permission") */
export interface RolePermissionRow {
  role_id: string;
  permission_id: string;
}

/** Mapping of organization to Stripe customer (table "stripe_customer") */
export interface StripeCustomerRow {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organization_id: string;
  /** Stripe customer identifier */
  stripe_customer_id: string;
}

/** Organization subscription details (table "subscription") */
export interface SubscriptionRow {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organization_id: string;
  /** Subscription state */
  status: string;
  /** Stripe price identifier */
  price_id: string;
  /** Subscription start timestamp */
  created_at: string;
}

/** App task (table "task") */
export interface TaskRow {
  /** Primary key */
  id: string;
  /** Title of the task */
  title: string;
  /** Optional description */
  description?: string | null;
  /** Task status */
  status: string;
  /** Task priority */
  priority: string;
  /** Reference to Project */
  project_id: string;
  /** Reference to User */
  assignee_id?: string | null;
  /** Task creation timestamp */
  created_at: string;
}

/** Customer support ticket tracking (table "ticket") */
export interface TicketRow {
  /** Primary key */
  id: string;
  /** Ticket short summary title */
  title: string;
  /** Ticket state (open, in_progress, resolved, closed) */
  status: string;
  /** Ticket urgency priority (low, medium, high, urgent) */
  priority: string;
  /** User ID of assigned staff support agent */
  assignee_id?: string | null;
  /** Reference to Organization */
  organization_id: string;
  /** Ticket creation timestamp */
  created_at: string;
}

/** Collaborative whiteboard drawing session (table "whiteboard_session") */
export interface WhiteboardSessionRow {
  /** Primary key */
  id: string;
  /** Session display name */
  name: string;
  /** Reference to Organization */
  organization_id: string;
  /** Timestamp of session creation */
  created_at: string;
}

/** App workspace (table "workspace") */
export interface WorkspaceRow {
  /** Primary key */
  id: string;
  /** Name of the workspace */
  name: string;
  /** Reference to Organization */
  organization_id: string;
  /** Workspace creation timestamp */
  created_at: string;
}
