import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect, beforeEach, afterEach } from 'vitest';
import { CompositionPlan } from '@minecode/core';
import { ApplicationGenerator } from '../src/index.js';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-test-generator-'));
});

afterEach(() => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

const samplePlan: CompositionPlan = {
  applicationName: 'Test SaaS',
  stackId: 'nextjs-supabase',
  database: [
    {
      id: 'auth:User',
      featureId: 'auth',
      entityName: 'User',
      fields: [
        { name: 'id', type: 'uuid', required: true },
        { name: 'email', type: 'string', required: true },
      ],
      description: 'System user entity',
    },
  ],
  api: [
    {
      id: 'auth:login',
      featureId: 'auth',
      name: 'login',
      path: '/auth/login', // Relative to API prefix in StackAdapter
      method: 'POST',
      description: 'Login endpoint',
    },
  ],
  ui: [
    {
      id: 'auth:LoginForm',
      featureId: 'auth',
      name: 'LoginForm',
      component: 'LoginForm.tsx',
      slot: 'auth-slot',
      description: 'LoginForm component',
    },
    {
      id: 'dashboard:DashboardPage',
      featureId: 'dashboard',
      name: 'DashboardPage',
      route: '/dashboard',
      description: 'Dashboard Page',
    },
  ],
  navigation: [
    {
      id: 'nav:dashboard',
      featureId: 'dashboard',
      name: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      order: 10,
    },
  ],
  events: [
    {
      id: 'auth:user.loggedIn',
      featureId: 'auth',
      name: 'user.loggedIn',
      payloadSchema: { userId: 'string' },
      description: 'User logged in event',
    },
  ],
  permissions: [
    {
      id: 'auth:auth.login',
      featureId: 'auth',
      name: 'auth.login',
      description: 'Perform login',
    },
  ],
  migrations: [
    {
      id: 'auth:0001_init.sql',
      featureId: 'auth',
      name: '0001_init.sql',
      type: 'database',
      description: 'Database initial migration',
    },
  ],
  extensionPoints: [],
};

test('test_GivenValidCompositionPlan_WhenGenerateCalled_ThenCreatesProjectSkeletonDirectories', () => {
  const generator = new ApplicationGenerator(tempDir);
  generator.generate(samplePlan);

  expect(fs.existsSync(path.join(tempDir, 'app'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'generated'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'extensions'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'config'))).toBe(true);
});

test('test_GivenValidCompositionPlan_WhenGenerateCalled_ThenSeparatesGeneratedAndConfigAndAppFiles', () => {
  const generator = new ApplicationGenerator(tempDir);
  generator.generate(samplePlan);

  // 1. Pages/routes in app/
  const apiRoutePath = path.join(tempDir, 'app/api/auth/login/route.ts');
  const pagePath = path.join(tempDir, 'app/dashboard/page.tsx');
  expect(fs.existsSync(apiRoutePath)).toBe(true);
  expect(fs.existsSync(pagePath)).toBe(true);

  // Verify route content is correct
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');
  expect(apiRouteContent).toContain('Login endpoint');
  expect(apiRouteContent).toContain('export async function POST');

  // Verify page content is correct
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  expect(pageContent).toContain('DashboardPagePage');
  expect(pageContent).toContain('Dashboard Page');

  // 2. Config/Glue in config/
  const navConfigPath = path.join(tempDir, 'config/navigation.ts');
  const permConfigPath = path.join(tempDir, 'config/permissions.ts');
  const eventConfigPath = path.join(tempDir, 'config/events.ts');
  expect(fs.existsSync(navConfigPath)).toBe(true);
  expect(fs.existsSync(permConfigPath)).toBe(true);
  expect(fs.existsSync(eventConfigPath)).toBe(true);

  // 3. Managed code in generated/
  const dbTypesPath = path.join(tempDir, 'generated/types/database.ts');
  const componentPath = path.join(tempDir, 'generated/components/LoginForm.tsx');
  expect(fs.existsSync(dbTypesPath)).toBe(true);
  expect(fs.existsSync(componentPath)).toBe(true);

  const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8');
  expect(dbTypesContent).toContain('export interface User');
  expect(dbTypesContent).toContain('id: string;');

  const componentContent = fs.readFileSync(componentPath, 'utf8');
  expect(componentContent).toContain('export function LoginForm()');

  // 4. Migrations output under supabase/migrations
  const migrationPath = path.join(tempDir, 'supabase/migrations/0001_init.sql');
  const tableMigrationPath = path.join(tempDir, 'supabase/migrations/user_table.sql');
  expect(fs.existsSync(migrationPath)).toBe(true);
  expect(fs.existsSync(tableMigrationPath)).toBe(true);
});

test('test_GivenUnsupportedStackId_WhenGenerateCalled_ThenThrowsError', () => {
  const generator = new ApplicationGenerator(tempDir);
  const badPlan = { ...samplePlan, stackId: 'django-postgres' };

  expect(() => generator.generate(badPlan)).toThrow("Unsupported stack ID: 'django-postgres'.");
});

test('test_GivenMissingOutputDirectory_WhenInstantiated_ThenThrowsError', () => {
  expect(() => new ApplicationGenerator('')).toThrow('Output directory path must be specified.');
});

test('test_GivenMissingCompositionPlan_WhenGenerateCalled_ThenThrowsError', () => {
  const generator = new ApplicationGenerator(tempDir);
  expect(() => generator.generate(null as unknown as CompositionPlan)).toThrow(
    'Composition plan must be specified.'
  );
});
