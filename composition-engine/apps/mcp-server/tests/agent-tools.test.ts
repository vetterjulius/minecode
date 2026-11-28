/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileSystemRegistry } from '@minecode/registry';
import { createDefaultStackRegistry } from '@minecode/generator';
import {
  MINIMAL_BLUEPRINT,
  findProviders,
  listStacks,
  suggestFeatures,
} from '../src/agent-tools.js';
import { server } from '../src/main.js';

const FEATURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../features');
const registry = new FileSystemRegistry(FEATURES);
registry.load();

async function call(name: string, args: Record<string, unknown> = {}) {
  const handler = (server as any)._requestHandlers.get('tools/call');
  return handler({ method: 'tools/call', params: { name, arguments: args } }, {});
}
const text = (r: any) => r.content[0].text as string;

describe('knowledge tools', () => {
  test('test_ListStacks_DefaultRegistry_MarksDefaultAndListsBehaviors', () => {
    const stacks = listStacks(createDefaultStackRegistry());
    expect(stacks.map((s) => s.id)).toEqual(['nextjs-supabase', 'openapi']);
    expect(stacks.find((s) => s.default)?.id).toBe('nextjs-supabase');
    expect(stacks[0].behaviors).toContain('auth.login');
  });

  test('test_FindProviders_EntityPermissionBehavior_ReturnProvidingFeatures', () => {
    expect(findProviders(registry, 'entity', 'project').map((h) => h.feature)).toContain(
      'projects'
    );
    expect(findProviders(registry, 'permission', 'billing.write')[0].feature).toBe('billing');
    expect(findProviders(registry, 'behavior', 'billing.checkout')[0].detail).toContain(
      '/api/billing/checkout'
    );
    expect(findProviders(registry, 'entity', 'NoSuchThing')).toEqual([]);
  });

  test('test_SuggestFeatures_Typo_OffersCloseIds', () => {
    const [s] = suggestFeatures(registry, ['authentification', 'projects']);
    expect(s.requested).toBe('authentification');
    expect(s.didYouMean).toContain('authentication');
    expect(suggestFeatures(registry, ['projects'])).toEqual([]);
  });
});

describe('MCP tools', () => {
  test('test_ToolsList_ContainsAgentTools', async () => {
    const handler = (server as any)._requestHandlers.get('tools/list');
    const { tools } = await handler({ method: 'tools/list' }, {});
    const names = tools.map((t: any) => t.name);
    for (const n of ['list_stacks', 'find_provider', 'get_authoring_guide', 'plan_application']) {
      expect(names).toContain(n);
    }
  });

  test('test_AuthoringGuide_ExampleBlueprint_PlansWithoutErrors', async () => {
    expect(text(await call('get_authoring_guide'))).toContain(MINIMAL_BLUEPRINT.trim());
    const result = await call('plan_application', { blueprint: MINIMAL_BLUEPRINT });
    expect(result.isError).toBeUndefined();
    const plan = JSON.parse(text(result));
    expect(plan.stack).toBe('nextjs-supabase');
    expect(plan.entities.map((e: any) => e.name)).toContain('Project');
    expect(
      plan.endpoints.some((e: any) => e.path === '/api/projects/:id' && e.method === 'DELETE')
    ).toBe(true);
    expect(plan.hooks.map((h: any) => h.name)).toContain('Project.beforeUpdate');
    expect(plan.unsupportedByStack).toEqual([]);
  });

  test('test_PlanApplication_UnknownFeature_ReportsErrorsAndWritesNothing', async () => {
    const result = await call('plan_application', {
      blueprint: MINIMAL_BLUEPRINT.replace('projects:', 'projectz:'),
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/projectz/);
  });

  test('test_ValidateBlueprint_Typo_ReturnsSuggestions', async () => {
    const result = await call('validate_blueprint', {
      blueprint: MINIMAL_BLUEPRINT.replace('projects:', 'projectz:'),
    });
    const body = JSON.parse(text(result));
    expect(body.valid).toBe(false);
    expect(body.suggestions[0]).toMatchObject({ requested: 'projectz' });
    expect(body.suggestions[0].didYouMean).toContain('projects');
  });

  test('test_FindProvider_InvalidKind_IsError', async () => {
    expect((await call('find_provider', { kind: 'nope', name: 'x' })).isError).toBe(true);
  });
});
