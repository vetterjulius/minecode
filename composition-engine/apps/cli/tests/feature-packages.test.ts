import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { prepareProject, runBuildCommand } from '../src/main.js';

const BUILTIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../features');

const FEATURE = `
id: polls
version: 1.0.0
type: business
name: Polls
description: Simple polls shipped as an npm package.
maintainer:
  type: community
stack:
  - nextjs-supabase
category: Collaboration
`;

const CONTRACT = (behavior: string) => `
provides:
  capabilities:
    - polls
  entities:
    - name: Poll
      fields:
        - { name: id, type: uuid, required: true, generate: uuid }
        - { name: userId, type: uuid, required: true, generate: auth-user, references: { entity: Profile, onDelete: cascade } }
        - { name: question, type: string, required: true }
      access:
        scope: owner
        field: userId
  api:
    - name: ClosePoll
      path: /api/polls/close
      method: POST
      behavior: ${behavior}
requires:
  features:
    - database
    - authentication
`;

const DEPS = `
- featureId: database
  versionRange: '^1.0.0'
- featureId: authentication
  versionRange: '^1.0.0'
`;

function project(behavior = 'polls.close', installed = true): { dir: string; blueprint: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-pkg-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'app', dependencies: { 'acme-polls': '1.0.0', lodash: '1.0.0' } })
  );
  if (installed) {
    const pkg = path.join(dir, 'node_modules', 'acme-polls');
    fs.mkdirSync(path.join(pkg, 'features', 'polls'), { recursive: true });
    fs.writeFileSync(
      path.join(pkg, 'package.json'),
      JSON.stringify({
        name: 'acme-polls',
        version: '2.1.0',
        type: 'module',
        minecode: { features: 'features', stacks: { 'nextjs-supabase': './nextjs.js' } },
      })
    );
    fs.writeFileSync(path.join(pkg, 'features/polls/feature.yaml'), FEATURE);
    fs.writeFileSync(path.join(pkg, 'features/polls/contract.yaml'), CONTRACT(behavior));
    fs.writeFileSync(path.join(pkg, 'features/polls/dependencies.yaml'), DEPS);
    fs.writeFileSync(
      path.join(pkg, 'nextjs.js'),
      `export const behaviors = {
  '${behavior}': (ctx) => ({ source: "export async function POST() {\\n  return Response.json({ ok: true }); // " + ctx.routePath + "\\n}\\n" }),
};\n`
    );
  }
  const blueprint = path.join(dir, 'app.yaml');
  fs.writeFileSync(
    blueprint,
    `application:
  name: Pkg App
stack:
  id: nextjs-supabase
features:
  database: { version: '1.0.0' }
  authentication: { version: '1.0.0' }
  polls: { version: '1.0.0' }
`
  );
  return { dir, blueprint };
}

describe('feature packages', () => {
  it('generates a feature and its stack behavior from an installed npm package', async () => {
    const { dir, blueprint } = project();
    const prepared = await prepareProject(blueprint);
    expect(prepared.errors).toEqual([]);
    expect(prepared.featurePackages.map((p) => p.name)).toEqual(['acme-polls']);

    const out = path.join(dir, 'out');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = runBuildCommand(blueprint, {
      features: path.join(BUILTIN, 'builtin'),
      outDir: out,
      featurePackages: prepared.featurePackages,
      stacks: prepared.stacks,
    });
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    const route = fs.readFileSync(path.join(out, 'app/api/polls/close/route.ts'), 'utf8');
    expect(route).toContain('api/polls/close');
    const migrations = fs
      .readdirSync(path.join(out, 'supabase/migrations'))
      .map((f) => fs.readFileSync(path.join(out, 'supabase/migrations', f), 'utf8'))
      .join('\n');
    expect(migrations).toMatch(/Entity: Poll \(feature: polls\)/);
  });

  it('rejects a package behavior that collides with a built-in one', async () => {
    const { blueprint } = project('auth.login');
    const prepared = await prepareProject(blueprint);
    expect(prepared.errors.join()).toMatch(/already implemented by stack 'nextjs-supabase'/);
  });

  it('fails clearly when the package is declared but not installed', async () => {
    const { blueprint } = project('polls.close', false);
    const prepared = await prepareProject(blueprint);
    expect(prepared.featurePackages).toEqual([]);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = runBuildCommand(blueprint, {
      features: path.join(BUILTIN, 'builtin'),
      outDir: path.join(path.dirname(blueprint), 'out'),
      ...prepared,
    });
    expect(result.success).toBe(false);
    expect(result.errors.join()).toMatch(/polls/);
  });
});
