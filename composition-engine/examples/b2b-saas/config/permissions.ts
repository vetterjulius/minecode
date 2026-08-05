// Permissions list for B2B SaaS Reference Application

export const permissions = {
  /** Read auth details */
  "auth.read": "authentication:auth.read",
  /** Modify auth details */
  "auth.write": "authentication:auth.write",
  /** Read billing details and subscriptions */
  "billing.read": "billing:billing.read",
  /** Modify subscriptions or create checkouts */
  "billing.write": "billing:billing.write",
  /** Invite members to organization */
  "org.invite": "organizations:org.invite",
  /** Read organization details */
  "org.read": "organizations:org.read",
  /** Modify organization details */
  "org.write": "organizations:org.write",
  /** Read RBAC configurations */
  "rbac.read": "rbac:rbac.read",
  /** Modify RBAC roles and permissions */
  "rbac.write": "rbac:rbac.write",
} as const;

export type Permission = keyof typeof permissions;
