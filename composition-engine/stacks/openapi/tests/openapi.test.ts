import { describe, expect, it } from 'vitest';
import type { CompositionPlan } from '@minecode/core';
import { OpenApiAdapter } from '../src/index.js';

const plan = {
  applicationName: 'Demo',
  stackId: 'openapi',
  database: [
    {
      id: 'f:Task',
      featureId: 'f',
      entityName: 'Task',
      fields: [
        { name: 'id', type: 'uuid', primaryKey: true, generate: 'uuid' },
        { name: 'dueDate', type: 'timestamp' },
        { name: 'title', type: 'string', required: true },
        { name: 'done', type: 'boolean', required: true, default: false },
      ],
    },
  ],
  api: [
    {
      id: 'f:list',
      featureId: 'f',
      name: 'list',
      path: '/api/tasks',
      crud: { entity: 'Task', operation: 'list' },
    },
    {
      id: 'f:create',
      featureId: 'f',
      name: 'create',
      path: '/api/tasks',
      crud: { entity: 'Task', operation: 'create' },
      permission: 'tasks.write',
    },
    {
      id: 'f:custom',
      featureId: 'f',
      name: 'custom',
      path: '/api/x',
      method: 'POST',
      behavior: 'anything.goes',
    },
  ],
  permissions: [{ id: 'tasks.write', featureId: 'f', name: 'tasks.write' }],
} as unknown as CompositionPlan;

describe('OpenApiAdapter', () => {
  const doc = JSON.parse(new OpenApiAdapter().generate(plan)['openapi.json']);

  it('derives snake_case schemas and omits generated fields from inputs', () => {
    expect(Object.keys(doc.components.schemas.Task.properties)).toEqual([
      'id',
      'due_date',
      'title',
      'done',
    ]);
    expect(doc.components.schemas.TaskInput.properties).not.toHaveProperty('id');
    expect(doc.components.schemas.TaskInput.required).toEqual(['title']);
  });

  it('maps crud operations and behaviors to paths', () => {
    expect(doc.paths['/api/tasks'].get).toBeDefined();
    expect(doc.paths['/api/tasks'].post['x-permission']).toBe('tasks.write');
    expect(doc.paths['/api/x'].post['x-behavior']).toBe('anything.goes');
  });

  it('is deterministic', () => {
    const a = new OpenApiAdapter().generate(plan);
    expect(new OpenApiAdapter().generate(plan)).toEqual(a);
  });
});
