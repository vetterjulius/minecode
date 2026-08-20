import { test, expect } from 'vitest';
import { CompositionPlan } from '@minecode/core';
import { NextJsSupabaseAdapter } from '../src/index.js';

test('test_NextJsSupabaseAdapter_Instantiation_HasCorrectStackId', () => {
  const adapter = new NextJsSupabaseAdapter();
  expect(adapter.stackId).toBe('nextjs-supabase');
});

test('test_DatabaseEntities_Generate_CreatesDdlAndTypes', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [
      {
        id: 'auth:User',
        featureId: 'auth',
        entityName: 'User',
        fields: [
          { name: 'id', type: 'uuid', required: true, description: 'Unique identifier' },
          { name: 'email', type: 'string', required: true },
          { name: 'age', type: 'integer', required: false },
          { name: 'isActive', type: 'boolean', required: true },
          { name: 'createdAt', type: 'timestamp', required: true },
        ],
        description: 'Represents a user account',
      },
    ],
    api: [],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['supabase/migrations/user_table.sql']).toBeDefined();
  expect(files['types/database.ts']).toBeDefined();

  const sql = files['supabase/migrations/user_table.sql'];
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS "user"');
  expect(sql).toContain('"id" UUID PRIMARY KEY NOT NULL');
  expect(sql).toContain('"email" VARCHAR(255) NOT NULL');
  expect(sql).toContain('"age" INTEGER');
  expect(sql).toContain('"isActive" BOOLEAN NOT NULL');
  expect(sql).toContain('"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL');

  const ts = files['types/database.ts'];
  expect(ts).toContain('export interface User {');
  expect(ts).toContain('id: string;');
  expect(ts).toContain('email: string;');
  expect(ts).toContain('age?: number;');
  expect(ts).toContain('isActive: boolean;');
  expect(ts).toContain('createdAt: string;');
});

test('test_ApiRoutes_Generate_CreatesNextJsAppRouterHandlers', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [
      {
        id: 'auth:login',
        featureId: 'auth',
        name: 'login',
        path: '/auth/login',
        method: 'POST',
        description: 'Authenticates a user',
      },
    ],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['app/api/auth/login/route.ts']).toBeDefined();
  const apiCode = files['app/api/auth/login/route.ts'];
  expect(apiCode).toContain("import { NextResponse } from 'next/server';");
  expect(apiCode).toContain('export async function POST(');
  expect(apiCode).toContain('Authenticates a user');
});

test('test_UiArtifacts_Generate_CreatesPagesAndComponents', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [
      {
        id: 'dashboard:overview',
        featureId: 'dashboard',
        name: 'Overview',
        route: '/dashboard',
        description: 'Dashboard main overview',
      },
      {
        id: 'auth:LoginForm',
        featureId: 'auth',
        name: 'LoginForm',
        component: 'LoginForm.tsx',
        slot: 'auth-slot',
        description: 'Login form component',
      },
    ],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['app/dashboard/page.tsx']).toBeDefined();
  const pageCode = files['app/dashboard/page.tsx'];
  expect(pageCode).toContain('export default function OverviewPage()');
  expect(pageCode).toContain("import React from 'react';");

  expect(files['components/LoginForm.tsx']).toBeDefined();
  const compCode = files['components/LoginForm.tsx'];
  expect(compCode).toContain('export function LoginForm()');
  expect(compCode).toContain('Slot: auth-slot');
});

test('test_Migrations_Generate_CreatesMigrationSqlFiles', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [
      {
        id: 'db:0001_init',
        featureId: 'db',
        name: '0001_init.sql',
        type: 'database',
        description: 'Initial database migrations',
      },
    ],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['supabase/migrations/0001_init.sql']).toBeDefined();
  const migCode = files['supabase/migrations/0001_init.sql'];
  expect(migCode).toContain('Migration: 0001_init.sql');
  expect(migCode).toContain('Initial database migrations');
});

test('test_Navigation_Generate_CreatesNavigationConfig', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [],
    navigation: [
      {
        id: 'nav:dashboard',
        featureId: 'dashboard',
        name: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        order: 1,
        children: [],
      },
    ],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['config/navigation.ts']).toBeDefined();
  const navCode = files['config/navigation.ts'];
  expect(navCode).toContain('export interface NavigationItem {');
  expect(navCode).toContain('export const navigationConfig: NavigationItem[]');
  expect(navCode).toContain('"label": "Dashboard"');
});

test('test_PermissionsEventsAndExtensionPoints_Generate_CreatesConfigurationGlue', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [],
    navigation: [],
    events: [
      {
        id: 'auth:user.created',
        featureId: 'auth',
        name: 'user.created',
        payloadSchema: { userId: 'string' },
        description: 'User registered',
      },
    ],
    permissions: [
      {
        id: 'auth:user.read',
        featureId: 'auth',
        name: 'user.read',
        description: 'Read user profiles',
      },
    ],
    migrations: [],
    extensionPoints: [
      {
        id: 'billing:pricing_rules',
        featureId: 'billing',
        name: 'pricing_rules',
        type: 'function',
        description: 'Custom pricing rules',
        contributions: [
          {
            sourceFeatureId: 'promo',
            value: { rule: 'promo_15' },
            description: 'Promo discount contribution',
          },
        ],
      },
    ],
  };

  const files = adapter.generate(plan);

  expect(files['config/permissions.ts']).toBeDefined();
  const permCode = files['config/permissions.ts'];
  expect(permCode).toContain('"user.read": "auth:user.read"');

  expect(files['config/events.ts']).toBeDefined();
  const eventCode = files['config/events.ts'];
  expect(eventCode).toContain('"user.created"');
  expect(eventCode).toContain('"auth:user.created"');

  expect(files['config/extensions.ts']).toBeDefined();
  const extCode = files['config/extensions.ts'];
  expect(extCode).toContain('"pricing_rules"');
  expect(extCode).toContain('"billing:pricing_rules"');
});

test('test_NextJsSupabaseAdapter_GenerateWithRunnableOption_CreatesWorkspaceConfigsAndPages', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Test SaaS',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [
      {
        id: 'dashboard:overview',
        featureId: 'dashboard',
        name: 'Overview',
        route: '/dashboard',
        description: 'Dashboard main overview',
      },
    ],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan, { runnable: true });

  expect(files['package.json']).toBeDefined();
  expect(files['tsconfig.json']).toBeDefined();
  expect(files['postcss.config.js']).toBeDefined();
  expect(files['tailwind.config.ts']).toBeDefined();
  expect(files['next.config.mjs']).toBeDefined();
  expect(files['.env.local']).toBeDefined();
  expect(files['app/globals.css']).toBeDefined();
  expect(files['app/layout.tsx']).toBeDefined();
  expect(files['app/page.tsx']).toBeDefined();

  const homePageCode = files['app/page.tsx'];
  expect(homePageCode).toContain('Test SaaS');
  expect(homePageCode).toContain('Overview');
  expect(homePageCode).toContain('Route: /dashboard');
});

test('test_StorageDeleteRoute_Generate_IncludesRecordVerificationAndPathMatching', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Storage Test App',
    stackId: 'nextjs-supabase',
    database: [],
    api: [
      {
        id: 'storage:delete',
        featureId: 'storage',
        name: 'DeleteFile',
        path: '/api/storage/delete',
        method: 'DELETE',
        description: 'Delete an uploaded file',
      },
    ],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['app/api/storage/delete/route.ts']).toBeDefined();
  const deleteCode = files['app/api/storage/delete/route.ts'];
  expect(deleteCode).toContain("from('file')");
  expect(deleteCode).toContain("select('*')");
  expect(deleteCode).toContain('File record not found');
  expect(deleteCode).toContain('Path mismatch for specified file');
});

test('test_StorageUploadRoute_Generate_SanitizesFileNameAndUsesCamelCase', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'Storage Test App',
    stackId: 'nextjs-supabase',
    database: [],
    api: [
      {
        id: 'storage:upload',
        featureId: 'storage',
        name: 'UploadFile',
        path: '/api/storage/upload',
        method: 'POST',
        description: 'Upload a file',
      },
    ],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['app/api/storage/upload/route.ts']).toBeDefined();
  const uploadCode = files['app/api/storage/upload/route.ts'];
  expect(uploadCode).toContain('replace(/[^a-zA-Z0-9_.-]/g');
  expect(uploadCode).toContain('mimeType: file.type');
  expect(uploadCode).toContain('organizationId: organizationId');
});

test('test_WorkspacesProjectsTasksDocumentsRoutes_Generate_UsesCamelCaseFields', () => {
  const adapter = new NextJsSupabaseAdapter();
  const plan: CompositionPlan = {
    applicationName: 'SaaS App',
    stackId: 'nextjs-supabase',
    database: [],
    api: [
      { id: 'workspaces:list', featureId: 'workspaces', name: 'Workspaces', path: '/api/workspaces', method: 'GET' },
      { id: 'projects:list', featureId: 'projects', name: 'Projects', path: '/api/projects', method: 'GET' },
      { id: 'tasks:list', featureId: 'tasks', name: 'Tasks', path: '/api/tasks', method: 'GET' },
      { id: 'documents:list', featureId: 'documents', name: 'Documents', path: '/api/documents', method: 'GET' },
    ],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };

  const files = adapter.generate(plan);

  expect(files['app/api/workspaces/route.ts']).toContain("order('createdAt'");
  expect(files['app/api/projects/route.ts']).toContain("order('createdAt'");
  expect(files['app/api/tasks/route.ts']).toContain("order('createdAt'");
  expect(files['app/api/documents/route.ts']).toContain("order('createdAt'");
});
