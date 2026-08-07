// Generated database type definitions for AI Workspace Reference Application

/**
 * Entity: ChatMessage
 * Chat message log
 */
export interface ChatMessage {
  /** Primary key */
  id: string;
  /** Reference to chat session */
  sessionId: string;
  /** Role of the message sender (user, system, assistant) */
  role: string;
  /** Message body text */
  content: string;
  /** Message creation timestamp */
  createdAt: string;
}

/**
 * Entity: Metric
 * System metrics and resource usages
 */
export interface Metric {
  /** Primary key */
  id: string;
  /** Name of the logged metric */
  name: string;
  /** Value of the metric */
  value: string;
  /** Reference to Organization */
  organizationId: string;
  /** Timestamp of metric */
  createdAt: string;
}

/**
 * Entity: AuditLog
 * Audit log entry tracking security events
 */
export interface AuditLog {
  /** Primary key */
  id: string;
  /** Type of event or action executed */
  action: string;
  /** User ID of the actor initiating the event */
  actorId?: string;
  /** Name of the altered database entity */
  entityName?: string;
  /** Identifier of the altered entity */
  entityId?: string;
  /** Event context metadata */
  payload?: string;
  /** Timestamp of the log entry */
  createdAt: string;
}

/**
 * Entity: Session
 * Active session token
 */
export interface Session {
  /** Primary key */
  id: string;
  /** Reference to User */
  userId: string;
  /** Session token */
  token: string;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Entity: User
 * App user account
 */
export interface User {
  /** Primary key */
  id: string;
  /** User's email address */
  email: string;
  /** Display name */
  name?: string;
  /** Account creation timestamp */
  createdAt: string;
}

/**
 * Entity: StripeCustomer
 * Mapping of organization to Stripe customer
 */
export interface StripeCustomer {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organizationId: string;
  /** Stripe customer identifier */
  stripeCustomerId: string;
}

/**
 * Entity: Subscription
 * Organization subscription details
 */
export interface Subscription {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organizationId: string;
  /** Subscription state */
  status: string;
  /** Stripe price identifier */
  priceId: string;
  /** Subscription start timestamp */
  createdAt: string;
}

/**
 * Entity: Feedback
 * Customer satisfaction rating and text feedback
 */
export interface Feedback {
  /** Primary key */
  id: string;
  /** Satisfaction rating score (1-5) */
  rating: number;
  /** Customer comments text */
  comment?: string;
  /** Reference to User */
  userId: string;
  /** Reference to Organization */
  organizationId: string;
  /** Timestamp of feedback submission */
  createdAt: string;
}

/**
 * Entity: Document
 * App document
 */
export interface Document {
  /** Primary key */
  id: string;
  /** Title of the document */
  title: string;
  /** Document content body */
  content?: string;
  /** Reference to Project */
  projectid: string;
  /** Document creation timestamp */
  createdat: string;
}

/**
 * Entity: Article
 * Help center knowledge article
 */
export interface Article {
  /** Primary key */
  id: string;
  /** Article heading title */
  title: string;
  /** Full markdown body content */
  content: string;
  /** Article help topic category */
  category: string;
  /** User ID of the author */
  authorId: string;
  /** Reference to Organization */
  organizationId: string;
  /** Article publication timestamp */
  createdAt: string;
}

/**
 * Entity: Notification
 * Notification tracking and status
 */
export interface Notification {
  /** Primary key */
  id: string;
  /** Reference to User */
  userId: string;
  /** Notification delivery channel (email, sms, slack) */
  channel: string;
  /** Notification title or header */
  title: string;
  /** Notification body text */
  content: string;
  /** Delivery status (pending, sent, failed) */
  status: string;
  /** Timestamp of notification */
  createdAt: string;
}

/**
 * Entity: Invitation
 * Organization join invitation
 */
export interface Invitation {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organizationId: string;
  /** Recipient email address */
  email: string;
  /** Target membership role */
  role: string;
  /** Secure invitation token */
  token: string;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Entity: Membership
 * User membership inside an organization
 */
export interface Membership {
  /** Primary key */
  id: string;
  /** Reference to Organization */
  organizationId: string;
  /** Reference to User */
  userId: string;
  /** User role inside organization */
  role: string;
  /** Membership assignment timestamp */
  createdAt: string;
}

/**
 * Entity: Organization
 * App organization (tenant)
 */
export interface Organization {
  /** Primary key */
  id: string;
  /** Name of the organization */
  name: string;
  /** Tenant creation timestamp */
  createdAt: string;
}

/**
 * Entity: Project
 * App project
 */
export interface Project {
  /** Primary key */
  id: string;
  /** Name of the project */
  name: string;
  /** Optional description */
  description?: string;
  /** Project status (e.g. active, archived) */
  status: string;
  /** Reference to Organization */
  organizationid: string;
  /** Reference to Workspace */
  workspaceid: string;
  /** Project creation timestamp */
  createdat: string;
}

/**
 * Entity: Permission
 * Specific action permission key
 */
export interface Permission {
  /** Primary key */
  id: string;
  /** Unique permission handle (e.g. user.create) */
  name: string;
  /** Purpose description */
  description?: string;
}

/**
 * Entity: Role
 * User security group role
 */
export interface Role {
  /** Primary key */
  id: string;
  /** Unique identifier name of the role */
  name: string;
  /** Friendly description of the role */
  description?: string;
}

/**
 * Entity: File
 * Uploaded file metadata tracking
 */
export interface File {
  /** Primary key */
  id: string;
  /** Original name of the file */
  name: string;
  /** Path of the file inside the storage bucket */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mimeType: string;
  /** Reference to Organization */
  organizationId?: string;
  /** Timestamp of file upload */
  createdAt: string;
}

/**
 * Entity: Task
 * App task
 */
export interface Task {
  /** Primary key */
  id: string;
  /** Title of the task */
  title: string;
  /** Optional description */
  description?: string;
  /** Task status */
  status: string;
  /** Task priority */
  priority: string;
  /** Reference to Project */
  projectid: string;
  /** Reference to User */
  assigneeid?: string;
  /** Task creation timestamp */
  createdat: string;
}

/**
 * Entity: Ticket
 * Customer support ticket tracking
 */
export interface Ticket {
  /** Primary key */
  id: string;
  /** Ticket short summary title */
  title: string;
  /** Ticket state (open, in_progress, resolved, closed) */
  status: string;
  /** Ticket urgency priority (low, medium, high, urgent) */
  priority: string;
  /** User ID of assigned staff support agent */
  assigneeId?: string;
  /** Reference to Organization */
  organizationId: string;
  /** Ticket creation timestamp */
  createdAt: string;
}

/**
 * Entity: WhiteboardSession
 * Collaborative whiteboard drawing session
 */
export interface WhiteboardSession {
  /** Primary key */
  id: string;
  /** Session display name */
  name: string;
  /** Reference to Organization */
  organizationId: string;
  /** Timestamp of session creation */
  createdAt: string;
}

/**
 * Entity: Workspace
 * App workspace
 */
export interface Workspace {
  /** Primary key */
  id: string;
  /** Name of the workspace */
  name: string;
  /** Reference to Organization */
  organizationid: string;
  /** Workspace creation timestamp */
  createdat: string;
}
