import { CompositionPlan, DatabaseArtifact } from '@minecode/core';
import { SchemaGenerationError } from './errors.js';
import { quote, tableName } from './naming.js';

export const PERMISSION_FUNCTION = 'has_permission';

const ROLE = 'Role';
const PERMISSION = 'Permission';
const ROLE_PERMISSION = 'RolePermission';
const MEMBERSHIP = 'Membership';

const DEFAULT_ROLES: Record<string, string[]> = {
  owner: ['*'],
  admin: ['*', '!rbac.write', '!billing.write'],
  member: ['*', '!rbac.*', '!billing.*', '!org.write', '!org.invite'],
};
const READ_ONLY_DEFAULT = ['*.read', '*.view'];

/** True when the composition provides roles, so permission rules can be enforced in the database. */
export function rbacActive(entities: DatabaseArtifact[]): boolean {
  const names = new Set(entities.map((e) => e.entityName));
  return [ROLE, PERMISSION, ROLE_PERMISSION, MEMBERSHIP].every((n) => names.has(n));
}

export function buildPermissionFunction(): string {
  const membership = quote(tableName(MEMBERSHIP));
  const grants = quote(tableName(ROLE_PERMISSION));
  return `-- Permission check used by tenant row level security policies.
-- A member holds a permission when the role named in "membership"."role" grants it.
CREATE OR REPLACE FUNCTION public.${PERMISSION_FUNCTION}(org_id uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.${membership} m
    JOIN public.${grants} rp ON rp."role" = m."role"
    WHERE m."organization_id" = org_id
      AND m."user_id" = auth.uid()
      AND rp."permission" = permission_name
  );
$$;
`;
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function matches(pattern: string, permission: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === permission;
  const [head, tail] = pattern.split('*');
  return permission.startsWith(head) && permission.endsWith(tail);
}

/** `strict` rejects exact names that match nothing; built-in defaults are lenient. */
function resolveRole(role: string, patterns: string[], all: string[], strict: boolean): string[] {
  const granted = new Set<string>();
  for (const raw of patterns) {
    const negate = raw.startsWith('!');
    const pattern = negate ? raw.slice(1) : raw;
    const hits = all.filter((p) => matches(pattern, p));
    if (strict && hits.length === 0 && !pattern.includes('*')) {
      throw new SchemaGenerationError(`Role '${role}' lists unknown permission '${pattern}'`);
    }
    for (const hit of hits) {
      if (negate) granted.delete(hit);
      else granted.add(hit);
    }
  }
  return all.filter((p) => granted.has(p));
}

function readRoleConfig(plan: CompositionPlan): {
  names: string[];
  patterns: Record<string, string[]>;
} {
  const config = plan.featureConfig?.rbac ?? {};
  const names = Array.isArray(config.defaultRoles)
    ? (config.defaultRoles as string[])
    : Object.keys(DEFAULT_ROLES);
  const explicit = (config.roles ?? {}) as Record<string, string[]>;
  return { names: [...new Set([...names, ...Object.keys(explicit)])], patterns: explicit };
}

/** Seeds permissions, roles and grants. Idempotent so it can be re-applied safely. */
export function buildRbacSeed(plan: CompositionPlan): string {
  const all = plan.permissions.map((p) => p.name).sort();
  const { names, patterns } = readRoleConfig(plan);
  const roleTable = quote(tableName(ROLE));
  const permissionTable = quote(tableName(PERMISSION));
  const grantTable = quote(tableName(ROLE_PERMISSION));

  const sections = [
    `INSERT INTO ${permissionTable} ("name", "description") VALUES\n` +
      plan.permissions
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => `  (${literal(p.name)}, ${p.description ? literal(p.description) : 'NULL'})`)
        .join(',\n') +
      '\nON CONFLICT ("name") DO NOTHING;',
    `INSERT INTO ${roleTable} ("name") VALUES\n` +
      names.map((n) => `  (${literal(n)})`).join(',\n') +
      '\nON CONFLICT ("name") DO NOTHING;',
  ];

  const grants: string[] = [];
  for (const role of names) {
    const explicit = patterns[role];
    const rolePatterns = explicit ?? DEFAULT_ROLES[role] ?? READ_ONLY_DEFAULT;
    for (const permission of resolveRole(role, rolePatterns, all, explicit !== undefined)) {
      grants.push(`  (${literal(role)}, ${literal(permission)})`);
    }
  }
  if (grants.length > 0) {
    sections.push(
      `INSERT INTO ${grantTable} ("role", "permission") VALUES\n` +
        grants.join(',\n') +
        '\nON CONFLICT DO NOTHING;'
    );
  }
  return `-- Roles and permissions of this application (additive, safe to re-run).\n${sections.join('\n\n')}\n`;
}
