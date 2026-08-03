import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from 'vitest';

test('test_B2bSaaSExample_GeneratedFiles_ExistAndAreValid', () => {
  // Use absolute path relative to the monorepo root (cwd is /app during test run)
  const exampleDir = path.resolve('composition-engine/examples/b2b-saas');

  // Verify that the blueprint exists
  expect(fs.existsSync(path.join(exampleDir, 'app.yaml'))).toBe(true);

  // Expected directories
  const expectedDirs = [
    'app',
    'app/api/api/auth/login',
    'app/api/api/auth/logout',
    'app/api/api/auth/reset-password',
    'app/api/api/organizations',
    'app/api/api/organizations/invite',
    'app/api/api/billing/checkout',
    'app/api/api/billing/webhook',
    'app/api/api/rbac/roles',
    'app/auth/login',
    'app/auth/reset-password',
    'app/billing',
    'app/organizations',
    'app/rbac-admin',
    'config',
    'generated/types',
    'supabase/migrations',
    'supabase/migrations/database',
  ];

  for (const dir of expectedDirs) {
    expect(fs.existsSync(path.join(exampleDir, dir))).toBe(true);
  }

  // Expected specific generated files
  const expectedFiles = [
    'config/permissions.ts',
    'generated/types/database.ts',
    'supabase/migrations/database/0000_init_schema.sql',
    'supabase/migrations/database/0001_auth_schema.sql',
    'supabase/migrations/database/0002_orgs_schema.sql',
    'supabase/migrations/database/0003_rbac_schema.sql',
    'supabase/migrations/database/0004_billing_schema.sql',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(exampleDir, file);
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  }

  // Check custom content in configurations
  const permContent = fs.readFileSync(path.join(exampleDir, 'config/permissions.ts'), 'utf8');
  expect(permContent).toContain('auth.read');
  expect(permContent).toContain('org.read');
  expect(permContent).toContain('rbac.read');
  expect(permContent).toContain('billing.read');

  const dbTypesContent = fs.readFileSync(
    path.join(exampleDir, 'generated/types/database.ts'),
    'utf8'
  );
  expect(dbTypesContent).toContain('export interface User');
  expect(dbTypesContent).toContain('export interface Session');
  expect(dbTypesContent).toContain('export interface Organization');
  expect(dbTypesContent).toContain('export interface Membership');
  expect(dbTypesContent).toContain('export interface Invitation');
  expect(dbTypesContent).toContain('export interface Role');
  expect(dbTypesContent).toContain('export interface Permission');
  expect(dbTypesContent).toContain('export interface StripeCustomer');
  expect(dbTypesContent).toContain('export interface Subscription');
});
