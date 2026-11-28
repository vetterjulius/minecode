import { describe, test, expect } from 'vitest';
import { Feature, Blueprint } from '@minecode/core';
import { Composer } from '../src/index.js';

function feature(api: object[]): Feature {
  return {
    id: 'things',
    version: '1.0.0',
    type: 'business',
    metadata: { name: 'Things', description: 'Things' },
    contract: {
      provides: {
        entities: [{ name: 'Thing', fields: [{ name: 'id', type: 'uuid', required: true }] }],
        permissions: [{ name: 'thing.read' }],
        api: api as never,
      },
    },
    dependencies: [],
  };
}

const blueprint = { applicationName: 'T', features: ['things'] } as unknown as Blueprint;

describe('API reference validation', () => {
  test('test_Compose_CrudEntryWithKnownEntityAndPermission_KeepsThemOnArtifact', () => {
    const plan = new Composer().compose(
      [
        feature([
          {
            name: 'ListThings',
            path: '/api/things',
            crud: { entity: 'Thing', operation: 'list' },
            permission: 'thing.read',
          },
        ]),
      ],
      blueprint
    );
    expect(plan.api[0].crud).toEqual({ entity: 'Thing', operation: 'list' });
    expect(plan.api[0].permission).toBe('thing.read');
  });

  test('test_Compose_CrudEntryWithUnknownEntity_Throws', () => {
    expect(() =>
      new Composer().compose(
        [
          feature([
            { name: 'ListX', path: '/api/x', crud: { entity: 'Ghost', operation: 'list' } },
          ]),
        ],
        blueprint
      )
    ).toThrow(/unknown entity "Ghost"/);
  });

  test('test_Compose_EntryWithUnknownPermission_Throws', () => {
    expect(() =>
      new Composer().compose(
        [feature([{ name: 'Ping', path: '/api/ping', behavior: 'x.ping', permission: 'nope' }])],
        blueprint
      )
    ).toThrow(/unknown permission "nope"/);
  });

  test('test_Compose_CreateEndpoint_DerivesBeforeAndAfterHookExtensionPoints', () => {
    const plan = new Composer().compose(
      [
        feature([
          {
            name: 'CreateThing',
            path: '/api/things',
            crud: { entity: 'Thing', operation: 'create' },
          },
        ]),
      ],
      blueprint
    );
    expect(plan.extensionPoints.map((e) => e.name)).toEqual([
      'Thing.afterCreate',
      'Thing.beforeCreate',
    ]);
    expect(plan.extensionPoints.every((e) => e.type === 'function')).toBe(true);
  });

  test('test_Compose_UpdateAndDelete_DeriveTheirHooks', () => {
    const plan = new Composer().compose(
      [
        feature([
          { name: 'Upd', path: '/api/things/:id', crud: { entity: 'Thing', operation: 'update' } },
          { name: 'Del', path: '/api/things/:id', crud: { entity: 'Thing', operation: 'delete' } },
        ]),
      ],
      blueprint
    );
    expect(plan.extensionPoints.map((e) => e.name)).toEqual([
      'Thing.afterDelete',
      'Thing.afterUpdate',
      'Thing.beforeDelete',
      'Thing.beforeUpdate',
    ]);
  });

  test('test_Compose_ListEndpointOnly_DerivesNoHooks', () => {
    const plan = new Composer().compose(
      [
        feature([
          { name: 'ListThings', path: '/api/things', crud: { entity: 'Thing', operation: 'list' } },
        ]),
      ],
      blueprint
    );
    expect(plan.extensionPoints).toEqual([]);
  });
});
