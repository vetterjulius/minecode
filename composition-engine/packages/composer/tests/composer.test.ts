import { test, expect } from 'vitest';
import { Feature, Blueprint } from '@minecode/core';
import { Composer } from '../src/index.js';

test('test_Compose_GivenMinimalFeaturesAndBlueprint_ThenReturnsDeterministicCompositionPlan', () => {
  const composer = new Composer();

  const resolvedFeatures: Feature[] = [
    {
      id: 'database-feature',
      version: '1.0.0',
      type: 'infrastructure',
      metadata: {
        name: 'Database Feature',
        description: 'Handles db connection',
      },
      contract: {
        provides: {
          entities: [
            {
              name: 'User',
              fields: [
                { name: 'id', type: 'uuid', required: true },
                { name: 'email', type: 'string', required: true },
              ],
            },
          ],
          permissions: [{ name: 'db.connect', description: 'Connect to database' }],
        },
      },
      dependencies: [],
      modules: [
        {
          name: '0001_init.sql',
          type: 'migration',
          description: 'Database initial migration',
        },
      ],
    },
    {
      id: 'auth-feature',
      version: '1.2.0',
      type: 'business',
      metadata: {
        name: 'Auth Feature',
        description: 'Handles auth',
      },
      contract: {
        provides: {
          api: [
            {
              name: 'login',
              path: '/api/auth/login',
              method: 'POST',
            },
          ],
          ui: [
            {
              name: 'LoginForm',
              component: 'LoginForm.tsx',
              slot: 'auth-slot',
            },
          ],
          permissions: [{ name: 'auth.login', description: 'Perform login' }],
          events: [
            {
              name: 'user.loggedIn',
              payloadSchema: { userId: 'string' },
            },
          ],
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  const blueprint: Blueprint = {
    applicationName: 'My Awesome B2B SaaS',
    stackId: 'nextjs-supabase',
    features: {},
  };

  const plan = composer.compose(resolvedFeatures, blueprint);

  // Check generic details
  expect(plan.applicationName).toBe('My Awesome B2B SaaS');
  expect(plan.stackId).toBe('nextjs-supabase');

  // Check Database Artifacts (sorted/deterministic)
  expect(plan.database).toHaveLength(1);
  expect(plan.database[0]).toEqual({
    id: 'database-feature:User',
    featureId: 'database-feature',
    entityName: 'User',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'email', type: 'string', required: true },
    ],
    description: undefined,
  });

  // Check Api Artifacts
  expect(plan.api).toHaveLength(1);
  expect(plan.api[0]).toEqual({
    id: 'auth-feature:login',
    featureId: 'auth-feature',
    name: 'login',
    path: '/api/auth/login',
    method: 'POST',
    description: undefined,
  });

  // Check UI Artifacts
  expect(plan.ui).toHaveLength(1);
  expect(plan.ui[0]).toEqual({
    id: 'auth-feature:LoginForm',
    featureId: 'auth-feature',
    name: 'LoginForm',
    component: 'LoginForm.tsx',
    slot: 'auth-slot',
    description: undefined,
    route: undefined,
  });

  // Check Events Artifacts
  expect(plan.events).toHaveLength(1);
  expect(plan.events[0]).toEqual({
    id: 'auth-feature:user.loggedIn',
    featureId: 'auth-feature',
    name: 'user.loggedIn',
    payloadSchema: { userId: 'string' },
    description: undefined,
  });

  // Check Permissions (sorted alphabetically by id)
  expect(plan.permissions).toHaveLength(2);
  expect(plan.permissions[0].id).toBe('auth-feature:auth.login');
  expect(plan.permissions[1].id).toBe('database-feature:db.connect');

  // Check Migrations Artifacts
  expect(plan.migrations).toHaveLength(1);
  expect(plan.migrations[0]).toEqual({
    id: 'database-feature:0001_init.sql',
    featureId: 'database-feature',
    name: '0001_init.sql',
    type: 'database',
    description: 'Database initial migration',
  });
});

test('test_Compose_GivenNavigationHierarchyAndMerging_ThenBuildsDeterministicSortedTree', () => {
  const composer = new Composer();

  const resolvedFeatures: Feature[] = [
    {
      id: 'dashboard-feature',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Dashboard', description: 'Dashboard UI' },
      contract: {
        provides: {
          navigation: [
            {
              name: 'dashboard',
              label: 'Dashboard',
              path: '/dashboard',
              order: 10,
            },
            {
              name: 'settings',
              label: 'Settings',
              path: '/settings',
              order: 100,
            },
          ],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'billing-feature',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Billing', description: 'Stripe Billing' },
      contract: {
        provides: {
          navigation: [
            {
              name: 'billing_settings',
              label: 'Billing Options',
              path: '/settings/billing',
              parent: 'settings',
              order: 1,
            },
          ],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'security-feature',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Security', description: 'Security Settings' },
      contract: {
        provides: {
          navigation: [
            {
              name: 'security_settings',
              label: 'Security Options',
              path: '/settings/security',
              parent: 'settings',
              order: 0, // Should be sorted before billing_settings
            },
          ],
        },
      },
      dependencies: [],
      modules: [],
    },
  ];

  const blueprint: Blueprint = {
    applicationName: 'Navigation App',
    stackId: 'nextjs-supabase',
    features: {},
  };

  const plan = composer.compose(resolvedFeatures, blueprint);

  expect(plan.navigation).toHaveLength(2);

  // First root should be dashboard (order: 10)
  expect(plan.navigation[0].name).toBe('dashboard');

  // Second root should be settings (order: 100)
  const settingsRoot = plan.navigation[1];
  expect(settingsRoot.name).toBe('settings');
  expect(settingsRoot.children).toHaveLength(2);

  // children of settings should be sorted by order
  // security_settings (order: 0) first, then billing_settings (order: 1)
  expect(settingsRoot.children![0].name).toBe('security_settings');
  expect(settingsRoot.children![1].name).toBe('billing_settings');
});

test('test_Compose_GivenExtensionPointsAndContributions_ThenResolvesCorrectly', () => {
  const composer = new Composer();

  const resolvedFeatures: Feature[] = [
    {
      id: 'pricing-feature',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Pricing Engine', description: 'Calculates prices' },
      contract: {
        provides: {
          extensionPoints: [
            {
              name: 'pricing_rules',
              type: 'function',
              description: 'Register pricing calculation function rules',
            },
          ],
        },
      },
      dependencies: [],
      modules: [],
    },
    {
      id: 'promo-code-feature',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Promo Codes', description: 'Applies discount codes' },
      contract: {
        contributions: [
          {
            targetExtensionPoint: 'pricing_rules',
            value: {
              ruleId: 'apply_promo',
              percentage: 15,
            },
            description: 'Apply promo code discount',
          },
        ],
      },
      dependencies: [],
      modules: [],
    },
  ];

  const blueprint: Blueprint = {
    applicationName: 'Extension App',
    stackId: 'nextjs',
    features: {},
  };

  const plan = composer.compose(resolvedFeatures, blueprint);

  expect(plan.extensionPoints).toHaveLength(1);
  const ep = plan.extensionPoints[0];
  expect(ep.name).toBe('pricing_rules');
  expect(ep.contributions).toHaveLength(1);
  expect(ep.contributions[0]).toEqual({
    sourceFeatureId: 'promo-code-feature',
    value: {
      ruleId: 'apply_promo',
      percentage: 15,
    },
    description: 'Apply promo code discount',
  });
});
