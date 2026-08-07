// Permissions list for AI Workspace Reference Application

export const permissions = {
  /** Interact with AI assistant */
  'chat.access': 'ai-chat:chat.access',
  /** View metric analytics dashboards */
  'analytics.view': 'analytics:analytics.view',
  /** View full system audit logs */
  'audit.read': 'audit-logging:audit.read',
  /** Read auth details */
  'auth.read': 'authentication:auth.read',
  /** Modify auth details */
  'auth.write': 'authentication:auth.write',
  /** Read billing details and subscriptions */
  'billing.read': 'billing:billing.read',
  /** Modify subscriptions or create checkouts */
  'billing.write': 'billing:billing.write',
  /** Read organization feedback ratings */
  'feedback.read': 'customer-feedback:feedback.read',
  /** Submit feedback ratings */
  'feedback.write': 'customer-feedback:feedback.write',
  /** Read document details */
  'document.read': 'documents:document.read',
  /** Modify document details */
  'document.write': 'documents:document.write',
  /** Read help articles */
  'articles.read': 'knowledge-base:articles.read',
  /** Author and modify help articles */
  'articles.write': 'knowledge-base:articles.write',
  /** Read notifications history */
  'notifications.read': 'notifications:notifications.read',
  /** Send and manage notifications */
  'notifications.write': 'notifications:notifications.write',
  /** Invite members to organization */
  'org.invite': 'organizations:org.invite',
  /** Read organization details */
  'org.read': 'organizations:org.read',
  /** Modify organization details */
  'org.write': 'organizations:org.write',
  /** Read project details */
  'project.read': 'projects:project.read',
  /** Modify project details */
  'project.write': 'projects:project.write',
  /** Read RBAC configurations */
  'rbac.read': 'rbac:rbac.read',
  /** Modify RBAC roles and permissions */
  'rbac.write': 'rbac:rbac.write',
  /** Perform advanced text queries */
  'search.query': 'search:search.query',
  /** Read storage and view files */
  'storage.read': 'storage:storage.read',
  /** Upload and delete files */
  'storage.write': 'storage:storage.write',
  /** Read task details */
  'task.read': 'tasks:task.read',
  /** Modify task details */
  'task.write': 'tasks:task.write',
  /** View organization support tickets */
  'tickets.read': 'ticketing:tickets.read',
  /** Create and update tickets */
  'tickets.write': 'ticketing:tickets.write',
  /** Create new whiteboard sessions */
  'whiteboard.create': 'whiteboard:whiteboard.create',
  /** View whiteboards */
  'whiteboard.view': 'whiteboard:whiteboard.view',
  /** Read workspace details */
  'workspace.read': 'workspaces:workspace.read',
  /** Modify workspace details */
  'workspace.write': 'workspaces:workspace.write',
} as const;

export type Permission = keyof typeof permissions;
