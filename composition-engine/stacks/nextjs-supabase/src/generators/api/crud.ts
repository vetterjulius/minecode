import { ApiArtifact, DatabaseArtifact, EntityField } from '@minecode/core';
import { UnsupportedContractError } from '../errors.js';
import { resolveFieldType } from '../database/field-types.js';
import { columnName, tableName } from '../database/naming.js';
import { primaryKeyFields } from '../database/primary-key.js';
import { EntityIndex } from './types.js';

export const crudImports = (serverClientImport: string, extensionsImport?: string) => [
  `import { createSupabaseServerClient } from '${serverClientImport}';`,
  ...(extensionsImport ? [`import { extensions } from '${extensionsImport}';`] : []),
  "import { NextResponse } from 'next/server';",
];

/** Maps database errors to HTTP statuses. Row level security violations become 403. */
export const CRUD_ERROR_HELPER = `function crudError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? String(error);
  const status = code === '42501' ? 403 : 400;
  return NextResponse.json({ success: false, error: message }, { status });
}
`;

/** Checks a request body against the entity's writable columns. Returns an error message or null. */
export const CRUD_BODY_HELPER = `type ColumnKind = 'string' | 'number' | 'boolean' | 'json';

function checkBody(
  body: unknown,
  allowed: Record<string, ColumnKind>,
  required: string[]
): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(key in allowed)) return \`Unknown field: \${key}\`;
  }
  for (const key of required) {
    if (record[key] === undefined || record[key] === null) return \`Missing field: \${key}\`;
  }
  for (const [key, kind] of Object.entries(allowed)) {
    const value = record[key];
    if (value === undefined || value === null || kind === 'json') continue;
    if (typeof value !== kind) return \`Field \${key} must be a \${kind}\`;
  }
  return null;
}
`;

export interface CrudHandler {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  code: string;
  helpers: string[];
  /** True when the handler calls application hooks from extensions/. */
  usesExtensions: boolean;
}

function kindOf(field: EntityField): 'string' | 'number' | 'boolean' | 'json' {
  const ts = resolveFieldType(field.type, field.name).ts;
  return ts === 'number' || ts === 'boolean' ? ts : ts === 'unknown' ? 'json' : 'string';
}

function listOrder(entity: DatabaseArtifact): { column: string; ascending: boolean } {
  if (entity.fields.some((f) => f.name === 'createdAt')) {
    return { column: 'created_at', ascending: false };
  }
  return { column: columnName(primaryKeyFields(entity.fields)[0].name), ascending: true };
}

function buildEmbeds(api: ApiArtifact, entities: EntityIndex): string {
  const embeds = (api.crud?.include ?? []).map((name) => {
    const child = entities.get(name);
    if (!child) {
      throw new UnsupportedContractError(`API '${api.id}' includes unknown entity '${name}'`);
    }
    return `${tableName(child.entityName)}(*)`;
  });
  return ['*', ...embeds].join(', ');
}

function buildList(api: ApiArtifact, entity: DatabaseArtifact, entities: EntityIndex): string {
  const order = listOrder(entity);
  const filters = entity.fields.map((f) => `'${columnName(f.name)}'`).join(', ');
  return `export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const params = new URL(request.url).searchParams;
    let query = supabase
      .from('${tableName(entity.entityName)}')
      .select('${buildEmbeds(api, entities)}')
      .order('${order.column}', { ascending: ${order.ascending} });

    for (const column of [${filters}]) {
      const value = params.get(column);
      if (value !== null) query = query.eq(column, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}
`;
}

function isWritable(field: EntityField): boolean {
  return field.generate === undefined;
}

function buildCreate(entity: DatabaseArtifact): string {
  const writable = entity.fields.filter(isWritable);
  const allowed = writable.map((f) => `    ${columnName(f.name)}: '${kindOf(f)}',`).join('\n');
  const required = writable
    .filter((f) => f.required && f.default === undefined)
    .map((f) => `'${columnName(f.name)}'`)
    .join(', ');
  return `export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const body = await request.json();
    const problem = checkBody(
      body,
      {
${allowed.replace(/^ {4}/gm, '        ')}
      },
      [${required}]
    );
    if (problem) {
      return NextResponse.json({ success: false, error: problem }, { status: 400 });
    }

    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null };
    const before = extensions.hooks?.['${entity.entityName}.beforeCreate'];
    const row = (before ? await before(body, context) : undefined) ?? body;

    const { data, error } = await supabase
      .from('${tableName(entity.entityName)}')
      .insert(row)
      .select()
      .single();
    if (error) throw error;

    await extensions.hooks?.['${entity.entityName}.afterCreate']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}
`;
}

/** Name of the trailing `:param` path segment that identifies one row. */
export function idParamOf(api: ApiArtifact): string {
  const last = api.path.replace(/\/+$/, '').split('/').pop() ?? '';
  const match = /^:([A-Za-z_][A-Za-z0-9_]*)$/.exec(last);
  if (!match) {
    throw new UnsupportedContractError(
      `API '${api.id}': crud '${api.crud?.operation}' needs a path ending in ':<param>' (e.g. /api/things/:id), got '${api.path}'`
    );
  }
  return match[1];
}

function primaryKeyColumn(api: ApiArtifact, entity: DatabaseArtifact): string {
  const pk = primaryKeyFields(entity.fields);
  if (pk.length !== 1) {
    throw new UnsupportedContractError(
      `API '${api.id}': crud '${api.crud?.operation}' needs a single-column primary key on '${entity.entityName}'`
    );
  }
  return columnName(pk[0].name);
}

const PARAMS_ARG = (param: string) =>
  `request: Request,\n  { params }: { params: Promise<{ ${param}: string }> }`;

function buildGet(api: ApiArtifact, entity: DatabaseArtifact, entities: EntityIndex): string {
  const param = idParamOf(api);
  return `export async function GET(
  ${PARAMS_ARG(param)}
) {
  const supabase = await createSupabaseServerClient();
  try {
    const { ${param} } = await params;
    const { data, error } = await supabase
      .from('${tableName(entity.entityName)}')
      .select('${buildEmbeds(api, entities)}')
      .eq('${primaryKeyColumn(api, entity)}', ${param})
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}
`;
}

function buildUpdate(api: ApiArtifact, entity: DatabaseArtifact): string {
  const param = idParamOf(api);
  const pk = new Set(primaryKeyFields(entity.fields).map((f) => f.name));
  const writable = entity.fields.filter((f) => isWritable(f) && !pk.has(f.name));
  const allowed = writable.map((f) => `        ${columnName(f.name)}: '${kindOf(f)}',`).join('\n');
  return `export async function PATCH(
  ${PARAMS_ARG(param)}
) {
  const supabase = await createSupabaseServerClient();
  try {
    const { ${param} } = await params;
    const body = await request.json();
    const problem = checkBody(
      body,
      {
${allowed}
      },
      []
    );
    if (problem) {
      return NextResponse.json({ success: false, error: problem }, { status: 400 });
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null, id: ${param} };
    const before = extensions.hooks?.['${entity.entityName}.beforeUpdate'];
    const patch = (before ? await before(body, context) : undefined) ?? body;

    const { data, error } = await supabase
      .from('${tableName(entity.entityName)}')
      .update(patch)
      .eq('${primaryKeyColumn(api, entity)}', ${param})
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await extensions.hooks?.['${entity.entityName}.afterUpdate']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}
`;
}

function buildDelete(api: ApiArtifact, entity: DatabaseArtifact): string {
  const param = idParamOf(api);
  return `export async function DELETE(
  ${PARAMS_ARG(param)}
) {
  const supabase = await createSupabaseServerClient();
  try {
    const { ${param} } = await params;
    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null, id: ${param} };
    await extensions.hooks?.['${entity.entityName}.beforeDelete']?.(${param}, context);

    const { data, error } = await supabase
      .from('${tableName(entity.entityName)}')
      .delete()
      .eq('${primaryKeyColumn(api, entity)}', ${param})
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await extensions.hooks?.['${entity.entityName}.afterDelete']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}
`;
}

export function buildCrudHandler(api: ApiArtifact, entities: EntityIndex): CrudHandler {
  const crud = api.crud;
  if (!crud) throw new UnsupportedContractError(`API '${api.id}' has no crud definition`);
  const entity = entities.get(crud.entity) as DatabaseArtifact;
  switch (crud.operation) {
    case 'list':
      return {
        method: 'GET',
        code: buildList(api, entity, entities),
        helpers: [CRUD_ERROR_HELPER],
        usesExtensions: false,
      };
    case 'create':
      return {
        method: 'POST',
        code: buildCreate(entity),
        helpers: [CRUD_ERROR_HELPER, CRUD_BODY_HELPER],
        usesExtensions: true,
      };
    case 'get':
      return {
        method: 'GET',
        code: buildGet(api, entity, entities),
        helpers: [CRUD_ERROR_HELPER],
        usesExtensions: false,
      };
    case 'update':
      return {
        method: 'PATCH',
        code: buildUpdate(api, entity),
        helpers: [CRUD_ERROR_HELPER, CRUD_BODY_HELPER],
        usesExtensions: true,
      };
    case 'delete':
      return {
        method: 'DELETE',
        code: buildDelete(api, entity),
        helpers: [CRUD_ERROR_HELPER],
        usesExtensions: true,
      };
  }
}
