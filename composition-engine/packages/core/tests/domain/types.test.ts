import { test, expect } from 'vitest';
import {
  Feature,
  Blueprint,
  Application
} from '../../src/index.js';

test('test_FeatureCreation_WithValidAttributes_Succeeds', () => {
  const feature: Feature = {
    id: 'authentication',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'Handles user register and login processes',
      maintainer: {
        type: 'builtin',
        name: 'Minecode Team'
      },
      stack: ['nextjs-supabase'],
      category: 'Identity'
    },
    contract: {
      provides: {
        entities: [
          {
            name: 'User',
            fields: [
              { name: 'id', type: 'uuid', required: true, description: 'The unique identifier' },
              { name: 'email', type: 'string', required: true }
            ],
            description: 'User accounts'
          }
        ],
        permissions: [
          { name: 'user.read', description: 'Read user profile' }
        ],
        events: [
          { name: 'user.created', description: 'Fired when a new user is created' }
        ],
        extensionPoints: [
          { name: 'after_login', type: 'function', description: 'Callback run right after successful login' }
        ]
      },
      requires: {
        features: ['database']
      }
    },
    dependencies: [
      {
        featureId: 'database',
        versionRange: '^1.0.0',
        optional: false
      }
    ],
    modules: [
      {
        name: 'auth-routes',
        type: 'backend',
        description: 'Authentication HTTP endpoint handlers'
      }
    ]
  };

  expect(feature.id).toBe('authentication');
  expect(feature.version).toBe('1.0.0');
  expect(feature.type).toBe('business');
  expect(feature.metadata.name).toBe('Authentication');
  expect(feature.contract.provides?.entities?.[0].name).toBe('User');
  expect(feature.contract.requires?.features?.[0]).toBe('database');
  expect(feature.dependencies[0].featureId).toBe('database');
  expect(feature.modules[0].name).toBe('auth-routes');
});

test('test_BlueprintCreation_WithValidAttributes_Succeeds', () => {
  const blueprint: Blueprint = {
    applicationName: 'My Awesome SaaS',
    stackId: 'nextjs-supabase',
    features: {
      authentication: {
        version: '^1.0.0',
        enabled: true,
        config: {
          providers: ['email', 'github']
        }
      },
      database: {
        enabled: true
      }
    }
  };

  expect(blueprint.applicationName).toBe('My Awesome SaaS');
  expect(blueprint.stackId).toBe('nextjs-supabase');
  expect(blueprint.features.authentication.enabled).toBe(true);
  expect(blueprint.features.authentication.config?.providers).toContain('github');
});

test('test_ApplicationCreation_WithValidAttributes_Succeeds', () => {
  const blueprint: Blueprint = {
    applicationName: 'My Awesome SaaS',
    stackId: 'nextjs-supabase',
    features: {}
  };

  const app: Application = {
    name: 'My Awesome SaaS',
    stackId: 'nextjs-supabase',
    blueprint,
    resolvedFeatures: [],
    generatedAt: '2026-08-01T12:00:00Z',
    engineVersion: '0.1.0'
  };

  expect(app.name).toBe('My Awesome SaaS');
  expect(app.blueprint.applicationName).toBe('My Awesome SaaS');
  expect(app.resolvedFeatures).toHaveLength(0);
  expect(app.generatedAt).toBe('2026-08-01T12:00:00Z');
  expect(app.engineVersion).toBe('0.1.0');
});
