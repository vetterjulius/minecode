import { Composer } from '@minecode/composer';
import {
  CompositionPlan,
  DEFAULT_STACK_ID,
  Feature,
  StackRegistry,
  findMissingBehaviors,
} from '@minecode/core';

/**
 * Tools that give an agent the knowledge it needs to describe an application: what stacks and
 * features exist, who provides what, what a blueprint looks like and what the engine would
 * decide for it. Pure functions over the registry, so they can be tested without a transport.
 */

export interface RegistryView {
  listFeatures(): Feature[];
}

export function listStacks(stacks: StackRegistry) {
  return stacks.list().map((s) => ({
    id: s.stackId,
    default: s.stackId === DEFAULT_STACK_ID,
    description: s.description,
    behaviors: s.behaviors,
  }));
}

export const PROVIDER_KINDS = [
  'entity',
  'capability',
  'permission',
  'api',
  'behavior',
  'hook',
] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** Which features provide (or, for entities, define) a named thing. Case-insensitive. */
export function findProviders(registry: RegistryView, kind: ProviderKind, name: string) {
  const wanted = name.trim().toLowerCase();
  const hits: { feature: string; detail: string }[] = [];
  for (const feature of registry.listFeatures()) {
    const provides = feature.contract.provides ?? {};
    const add = (detail: string) => hits.push({ feature: feature.id, detail });
    switch (kind) {
      case 'entity':
        for (const e of provides.entities ?? [])
          if (e.name.toLowerCase() === wanted)
            add(`entity ${e.name} (${(e.fields ?? []).map((f) => f.name).join(', ')})`);
        break;
      case 'capability':
        for (const c of provides.capabilities ?? []) if (c.toLowerCase() === wanted) add(c);
        break;
      case 'permission':
        for (const p of provides.permissions ?? [])
          if (p.name.toLowerCase() === wanted) add(`${p.name}: ${p.description ?? ''}`.trim());
        break;
      case 'api':
        for (const a of provides.api ?? [])
          if (a.path.toLowerCase() === wanted || a.name.toLowerCase() === wanted)
            add(`${a.method ?? 'GET'} ${a.path}${a.permission ? ` (needs ${a.permission})` : ''}`);
        break;
      case 'behavior':
        for (const a of provides.api ?? [])
          if (a.behavior?.toLowerCase() === wanted) add(`${a.method ?? 'GET'} ${a.path}`);
        break;
      case 'hook':
        for (const a of provides.api ?? [])
          if (a.crud && wanted.startsWith(`${a.crud.entity.toLowerCase()}.`))
            add(`generic ${a.crud.operation} endpoint ${a.path}`);
        break;
    }
  }
  return hits;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** "Did you mean" for blueprint feature ids the registry does not know. */
export function suggestFeatures(registry: RegistryView, requested: string[]) {
  const known = registry.listFeatures().map((f) => f.id);
  const knownSet = new Set(known);
  return requested
    .filter((id) => !knownSet.has(id))
    .map((id) => ({
      requested: id,
      didYouMean: known
        .map((k) => ({ k, d: distance(id.toLowerCase(), k.toLowerCase()) }))
        .filter(
          ({ k, d }) => d <= 3 || k.includes(id.toLowerCase()) || id.toLowerCase().includes(k)
        )
        .sort((x, y) => x.d - y.d)
        .slice(0, 3)
        .map(({ k }) => k),
    }));
}

export interface PlanSummary {
  application: string;
  stack: string;
  features: string[];
  entities: { name: string; feature: string; fields: string[]; access: string }[];
  endpoints: {
    method: string;
    path: string;
    feature: string;
    kind: string;
    permission?: string;
  }[];
  permissions: string[];
  hooks: { name: string; description: string }[];
  unsupportedByStack: { behavior: string; feature: string; api: string }[];
}

/** What the engine decided for a blueprint, without writing anything. */
export function summarizePlan(
  plan: CompositionPlan,
  stacks: StackRegistry,
  resolved: Feature[]
): PlanSummary {
  const adapter = stacks.get(plan.stackId);
  return {
    application: plan.applicationName,
    stack: plan.stackId,
    features: resolved.map((f) => `${f.id}@${f.version}`).sort(),
    entities: plan.database.map((d) => ({
      name: d.entityName,
      feature: d.featureId,
      fields: d.fields.map((f) => f.name),
      access: d.access ? `${d.access.scope}${d.access.field ? `:${d.access.field}` : ''}` : 'none',
    })),
    endpoints: plan.api.map((a) => ({
      method: (a.method ?? (a.crud?.operation === 'create' ? 'POST' : 'GET')).toUpperCase(),
      path: a.path,
      feature: a.featureId,
      kind: a.crud ? `crud ${a.crud.operation} ${a.crud.entity}` : `behavior ${a.behavior}`,
      ...(a.permission ? { permission: a.permission } : {}),
    })),
    permissions: plan.permissions.map((p) => p.name).sort(),
    hooks: plan.extensionPoints
      .filter((e) => e.type === 'function')
      .map((e) => ({ name: e.name, description: e.description })),
    unsupportedByStack: findMissingBehaviors(plan, adapter).map((m) => ({
      behavior: m.behavior,
      feature: m.featureId,
      api: m.apiId,
    })),
  };
}

export function planApplication(
  blueprint: Parameters<Composer['compose']>[1],
  resolved: Feature[],
  stacks: StackRegistry
): PlanSummary {
  const plan = new Composer().compose(resolved, blueprint);
  return summarizePlan(plan, stacks, resolved);
}

export const MINIMAL_BLUEPRINT = `application:
  name: 'Support Desk'

stack:
  id: 'nextjs-supabase'

features:
  database:
    version: '1.0.0'
  authentication:
    version: '1.0.0'
  organizations:
    version: '1.0.0'
  rbac:
    version: '1.0.0'
  projects:
    version: '1.0.0'
`;

export const AUTHORING_GUIDE = `# Describing an application with Minecode

The engine decides, you describe. Never write the generated code yourself.

## Workflow
1. \`list_stacks\`: pick the target stack (default: ${DEFAULT_STACK_ID}).
2. \`search_features\` / \`list_features\` / \`find_provider\`: find features that cover the requirements.
   \`get_feature\` shows a feature's contract (entities, endpoints, permissions); \`get_feature_schema\` its config.
3. Write a blueprint (YAML, see below) that names features and their versions. Dependencies are added automatically.
4. \`validate_blueprint\`: fix every error; "suggestions" lists close feature ids for typos.
5. \`plan_application\`: review entities, endpoints, permissions and hooks the engine decided on, without writing files.
6. \`compose_application\`: generate the app into a directory.

## Blueprint format
\`\`\`yaml
${MINIMAL_BLUEPRINT}\`\`\`

A feature entry may carry \`config:\` (validated against the feature's config schema).

## Rules of the generated app
- Do not edit generated files (everything under \`generated/\`, \`app/\`, \`supabase/\`, config). A regeneration keeps files you
  edited and writes the new version next to them as \`<file>.minecode-new\`.
- Custom logic goes in \`extensions/index.ts\` (created once, never overwritten). Generic create/update/delete endpoints call
  hooks such as \`Project.beforeCreate\`; \`plan_application\` lists the available hooks.
- Schema changes are additive: adding features or optional fields is allowed, removing or changing entities/fields and adding
  required fields without a default is rejected.
- Secrets are read from the environment (.env.local or a .env in the project root): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
  SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY.
- If the requirement needs something no feature offers, say so instead of inventing a feature id.
`;
