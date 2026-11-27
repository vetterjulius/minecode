import type {
  ApiArtifact,
  CompositionPlan,
  DatabaseArtifact,
  EntityField,
  StackAdapter,
} from '@minecode/core';

const JSON_TYPES: Record<string, Record<string, unknown>> = {
  uuid: { type: 'string', format: 'uuid' },
  string: { type: 'string' },
  text: { type: 'string' },
  integer: { type: 'integer' },
  int: { type: 'integer' },
  number: { type: 'integer' },
  float: { type: 'number' },
  double: { type: 'number' },
  boolean: { type: 'boolean' },
  timestamp: { type: 'string', format: 'date-time' },
  date: { type: 'string', format: 'date-time' },
  datetime: { type: 'string', format: 'date-time' },
  json: {},
  jsonb: {},
};

const snake = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

function fieldSchema(field: EntityField): Record<string, unknown> {
  const base = JSON_TYPES[field.type.toLowerCase()];
  if (!base) throw new Error(`openapi: unknown field type '${field.type}' on '${field.name}'`);
  return { ...base, ...(field.description ? { description: field.description } : {}) };
}

function entitySchemas(entity: DatabaseArtifact): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const writable: Record<string, unknown> = {};
  const required: string[] = [];
  for (const f of entity.fields) {
    const key = snake(f.name);
    properties[key] = fieldSchema(f);
    if (f.generate) continue; // never client-supplied
    writable[key] = properties[key];
    if (f.required && f.default === undefined) required.push(key);
  }
  return {
    [entity.entityName]: { type: 'object', properties },
    [`${entity.entityName}Input`]: {
      type: 'object',
      properties: writable,
      ...(required.length ? { required } : {}),
    },
  };
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

function operation(api: ApiArtifact): [string, Record<string, unknown>] {
  const method =
    (api.crud
      ? { list: 'get', create: 'post' }[api.crud.operation as string]
      : api.method?.toLowerCase()) ?? 'post';
  const op: Record<string, unknown> = {
    operationId: api.id.replace(/[^A-Za-z0-9]+/g, '_'),
    summary: api.description ?? api.name,
    tags: [api.featureId],
    security: [{ bearerAuth: [] }],
    'x-minecode-feature': api.featureId,
    responses: { '200': { description: 'Success' }, '403': { description: 'Forbidden' } },
  };
  if (api.permission) op['x-permission'] = api.permission;
  if (api.behavior) op['x-behavior'] = api.behavior;
  if (api.crud) {
    const e = api.crud.entity;
    if (api.crud.operation === 'list') {
      op.responses = {
        '200': {
          description: 'List',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: ref(e) },
                },
              },
            },
          },
        },
        '403': { description: 'Forbidden' },
      };
    } else if (api.crud.operation === 'create') {
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: ref(`${e}Input`) } },
      };
      op.responses = {
        '201': { description: 'Created', content: { 'application/json': { schema: ref(e) } } },
        '403': { description: 'Forbidden' },
      };
    }
  }
  return [method, op];
}

export class OpenApiAdapter implements StackAdapter {
  public readonly stackId = 'openapi';
  public readonly description =
    'OpenAPI 3.1 specification (openapi.json) derived from entities and API contracts';
  /** Behaviors are documented as opaque operations, so any behavior is accepted. */
  public readonly behaviors = '*' as const;
  public readonly layout = {
    skeleton: [],
    resolve: (p: string) => p,
    isScaffold: () => false,
    isMigration: () => false,
  };

  public generate(plan: CompositionPlan): Record<string, string> {
    const schemas: Record<string, unknown> = {};
    for (const e of plan.database) Object.assign(schemas, entitySchemas(e));

    const paths: Record<string, Record<string, unknown>> = {};
    for (const api of [...plan.api].sort((a, b) => a.id.localeCompare(b.id))) {
      const [method, op] = operation(api);
      (paths[api.path] ??= {})[method] = op;
    }

    const doc = {
      openapi: '3.1.0',
      info: { title: plan.applicationName, version: '0.1.0' },
      paths,
      components: {
        schemas,
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      },
      'x-minecode': {
        permissions: plan.permissions.map((p) => p.id).sort(),
      },
    };
    return { 'openapi.json': JSON.stringify(doc, null, 2) + '\n' };
  }
}
