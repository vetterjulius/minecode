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
    'app/api/auth/login',
    'app/api/auth/logout',
    'app/api/auth/reset-password',
    'app/api/organizations',
    'app/api/organizations/invite',
    'app/api/billing/checkout',
    'app/api/billing/webhook',
    'app/api/rbac/roles',
    'app/auth/login',
    'app/auth/reset-password',
    'app/billing',
    'app/organizations',
    'app/rbac-admin',
    'config',
    'generated/types',
    'supabase/migrations',
  ];

  for (const dir of expectedDirs) {
    expect(fs.existsSync(path.join(exampleDir, dir))).toBe(true);
  }

  // Expected specific generated files
  const expectedFiles = [
    'config/permissions.ts',
    'generated/types/database.ts',
    'package.json',
    'tsconfig.json',
    'postcss.config.js',
    'tailwind.config.ts',
    'next.config.mjs',
    '.env.local',
    'app/page.tsx',
    'app/globals.css',
    'app/layout.tsx',
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
  expect(dbTypesContent).toContain('export interface ProfileRow');
  expect(dbTypesContent).toContain('export interface RolePermissionRow');
  expect(dbTypesContent).toContain('export interface OrganizationRow');
  expect(dbTypesContent).toContain('export interface MembershipRow');
  expect(dbTypesContent).toContain('export interface InvitationRow');
  expect(dbTypesContent).toContain('export interface RoleRow');
  expect(dbTypesContent).toContain('export interface PermissionRow');
  expect(dbTypesContent).toContain('export interface StripeCustomerRow');
  expect(dbTypesContent).toContain('export interface SubscriptionRow');
});
