// Generated database type definitions for B2B SaaS Reference Application

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
