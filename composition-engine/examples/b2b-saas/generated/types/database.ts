// Row types of the database schema of B2B SaaS Reference Application

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
  /** Set when the invitation was accepted; an invitation works only once */
  accepted_at?: string | null;
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
  /** Unique permission handle (e.g. project.write) */
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

/** Named bundle of permissions assigned to organization members (table "role") */
export interface RoleRow {
  /** Role name, matched against membership.role */
  name: string;
  /** Friendly description of the role */
  description?: string | null;
}

/** Grants a permission to a role (table "role_permission") */
export interface RolePermissionRow {
  /** Role name */
  role: string;
  /** Permission name */
  permission: string;
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
