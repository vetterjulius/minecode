import { DatabaseArtifact, EntityAccess, WriteMode } from '@minecode/core';
import { columnName, quote, tableName } from './naming.js';
import { PERMISSION_FUNCTION } from './rbac.js';

export const ORG_MEMBER_FUNCTION = 'is_org_member';

export function usesTenantAccess(entities: DatabaseArtifact[]): boolean {
  return entities.some((e) => e.access?.scope === 'tenant');
}

export function buildRlsHelpers(): string {
  return `-- Membership check used by tenant row level security policies.
-- SECURITY DEFINER avoids recursive policy evaluation on "membership".
CREATE OR REPLACE FUNCTION public.${ORG_MEMBER_FUNCTION}(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."membership" m
    WHERE m."organization_id" = org_id AND m."user_id" = auth.uid()
  );
$$;
`;
}

function withPermission(base: string, column: string, permission?: string): string {
  if (!permission) return base;
  return `${base} AND public.${PERMISSION_FUNCTION}(${column}, '${permission.replace(/'/g, "''")}')`;
}

/**
 * Row condition for an entity. `permission` is checked against the organization the row
 * belongs to; for child entities that organization is the parent's.
 */
function condition(
  entity: DatabaseArtifact,
  access: EntityAccess,
  byName: Map<string, DatabaseArtifact>,
  permission?: string
): string {
  const table = quote(tableName(entity.entityName));
  const column = `${table}.${quote(columnName(access.field as string))}`;
  if (access.scope === 'owner') return `${column} = auth.uid()`;
  if (access.via) {
    const parentEntity = byName.get(access.via) as DatabaseArtifact;
    const parent = quote(tableName(access.via));
    const orgColumn = `p.${quote(columnName(parentEntity.access?.field as string))}`;
    const check = permission
      ? ` AND public.${PERMISSION_FUNCTION}(${orgColumn}, '${permission.replace(/'/g, "''")}')`
      : '';
    return `EXISTS (SELECT 1 FROM ${parent} p WHERE p."id" = ${column}${check})`;
  }
  return withPermission(`public.${ORG_MEMBER_FUNCTION}(${column})`, column, permission);
}

function policy(table: string, operation: string, clauses: string): string {
  const name = quote(`${table.replace(/"/g, '')}_${operation.toLowerCase()}`);
  return `CREATE POLICY ${name} ON ${table} FOR ${operation} TO authenticated ${clauses};`;
}

function writePolicies(table: string, cond: string, mode: WriteMode): string[] {
  if (mode === 'server-only') return [];
  const insert = policy(table, 'INSERT', `WITH CHECK (${cond})`);
  if (mode === 'insert-only') return [insert];
  return [
    insert,
    policy(table, 'UPDATE', `USING (${cond}) WITH CHECK (${cond})`),
    policy(table, 'DELETE', `USING (${cond})`),
  ];
}

function policiesFor(
  entity: DatabaseArtifact,
  rbac: boolean,
  byName: Map<string, DatabaseArtifact>
): string[] {
  const access = entity.access;
  const table = quote(tableName(entity.entityName));
  if (!access || access.scope === 'private') return [];
  if (access.scope === 'authenticated-read') return [policy(table, 'SELECT', 'USING (true)')];
  const needs = rbac ? access.permissions : undefined;
  const readCond = condition(entity, access, byName, needs?.read);
  const writeCond = condition(entity, access, byName, needs?.write);
  return [
    policy(table, 'SELECT', `USING (${readCond})`),
    ...writePolicies(table, writeCond, access.writes ?? 'members'),
  ];
}

function dropExisting(table: string, statements: string[]): string[] {
  return statements.map((s) => {
    const name = /CREATE POLICY ("[^"]+")/.exec(s)?.[1] as string;
    return `DROP POLICY IF EXISTS ${name} ON ${table};\n${s}`;
  });
}

export function buildPolicies(entities: DatabaseArtifact[], rbac = false): string {
  const byName = new Map(entities.map((e) => [e.entityName, e]));
  const blocks = entities.map((entity) => {
    const table = quote(tableName(entity.entityName));
    const lines = [
      `-- ${entity.entityName}: ${describeAccess(entity)}`,
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    ];
    return [...lines, ...dropExisting(table, policiesFor(entity, rbac, byName))].join('\n');
  });
  return blocks.join('\n\n') + '\n';
}

function describeAccess(entity: DatabaseArtifact): string {
  const access = entity.access;
  if (!access) return 'no access rule, private (service role only)';
  const target = access.field ? ` on ${access.field}` : '';
  const via = access.via ? ` via ${access.via}` : '';
  const writes = access.writes ? `, writes: ${access.writes}` : '';
  const perms = access.permissions
    ? `, permissions: read=${access.permissions.read ?? '-'} write=${access.permissions.write ?? '-'}`
    : '';
  return `${access.scope}${target}${via}${writes}${perms}`;
}
