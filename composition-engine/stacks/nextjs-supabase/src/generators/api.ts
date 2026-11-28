import { ApiArtifact, CompositionPlan, DatabaseArtifact, SubGenerator } from '@minecode/core';
import { buildCrudHandler, crudImports } from './api/crud.js';
import { generatedLibImport, SUPABASE_SERVER_LIB, SUPABASE_SERVER_LIB_PATH } from './billing.js';
import { BehaviorRegistry } from './api/behaviors/index.js';
import { EntityIndex } from './api/types.js';
import { rbacActive } from './database/rbac.js';
import {
  guardHandler,
  PERMISSION_GUARD_LIB,
  PERMISSION_GUARD_LIB_PATH,
} from './api/permission-guard.js';
import { UnsupportedContractError } from './errors.js';

/** Import path of extensions/index.ts, relative to app/<routePath>/route.ts. */
function extensionsImport(routePath: string): string {
  return `${'../'.repeat(routePath.split('/').length + 1)}extensions`;
}

const IMPORT_LINE = /^import [^\n]*;\n/gm;

interface RoutePiece {
  method: string;
  imports: string[];
  helpers: string[];
  code: string;
}

function routePathOf(api: ApiArtifact): string {
  const normalized = api.path.replace(/^\/+|\/+$/g, '');
  const withApi = normalized.startsWith('api/') ? normalized : `api/${normalized}`;
  // ':id' segments become Next.js dynamic segments
  return withApi.replace(/(^|\/):([A-Za-z_][A-Za-z0-9_]*)(?=\/|$)/g, '$1[$2]');
}

function splitImports(source: string): { imports: string[]; code: string } {
  const imports = source.match(IMPORT_LINE)?.map((line) => line.trim()) ?? [];
  return { imports, code: source.replace(IMPORT_LINE, '').trim() + '\n' };
}

function rawPieceFor(
  api: ApiArtifact,
  routePath: string,
  entities: EntityIndex,
  extraFiles: Record<string, string>,
  behaviors: BehaviorRegistry
): RoutePiece {
  const method = (api.method ?? 'GET').toUpperCase();
  const serverClientImport = generatedLibImport(routePath, 'supabase/server');
  extraFiles[SUPABASE_SERVER_LIB_PATH] = SUPABASE_SERVER_LIB;
  if (api.crud) {
    const handler = buildCrudHandler(api, entities);
    if (handler.method !== method) {
      throw new UnsupportedContractError(
        `API '${api.id}': crud operation '${api.crud.operation}' needs method ${handler.method}, contract says ${method}`
      );
    }
    return {
      method,
      imports: crudImports(
        serverClientImport,
        handler.usesExtensions ? extensionsImport(routePath) : undefined
      ),
      helpers: handler.helpers,
      code: handler.code,
    };
  }
  if (!api.behavior) {
    throw new UnsupportedContractError(
      `API '${api.id}' declares neither 'crud' nor 'behavior'; the stack cannot guess what it does`
    );
  }
  const description = api.description || `Handler for ${api.name} (${method})`;
  const output = behaviors.get(
    api.behavior as string,
    api.id
  )({ description, routePath, api, serverClientImport });
  Object.assign(extraFiles, output.extraFiles);
  const { imports, code } = splitImports(output.source);
  return { method, imports, helpers: [], code };
}

function pieceFor(
  api: ApiArtifact,
  routePath: string,
  entities: EntityIndex,
  extraFiles: Record<string, string>,
  behaviors: BehaviorRegistry,
  checkPermissions: boolean
): RoutePiece {
  const piece = rawPieceFor(api, routePath, entities, extraFiles, behaviors);
  if (!checkPermissions || !api.permission) return piece;
  extraFiles[PERMISSION_GUARD_LIB_PATH] = PERMISSION_GUARD_LIB;
  const serverClientImport = generatedLibImport(routePath, 'supabase/server');
  const guarded = guardHandler(piece.code, piece.method, api.permission, serverClientImport);
  return {
    ...piece,
    code: guarded.code,
    imports: [
      ...piece.imports,
      ...guarded.imports,
      `import { createSupabaseServerClient } from '${serverClientImport}';`,
    ],
  };
}

function assembleRoute(routePath: string, pieces: RoutePiece[]): string {
  const imports = [...new Set(pieces.flatMap((p) => p.imports))].sort();
  const helpers = [...new Set(pieces.flatMap((p) => p.helpers))];
  const handlers = [...pieces].sort((a, b) => a.method.localeCompare(b.method));
  // Handlers read the session cookie, so they must never be prerendered at build time.
  const dynamic = "export const dynamic = 'force-dynamic';";
  return [
    imports.join('\n'),
    dynamic,
    ...helpers.map((h) => h.trim()),
    ...handlers.map((p) => p.code.trim()),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n')
    .replace(/^/, `// Generated route: /${routePath}\n`);
}

/**
 * Generates route handlers from the API contracts. Generic entity endpoints (`crud`) are derived
 * from the entity definitions; everything else is a named behavior implemented by this stack.
 */
export class NextjsSupabaseApiSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-api';

  constructor(private readonly behaviors: BehaviorRegistry = new BehaviorRegistry()) {}

  public generate(plan: CompositionPlan): Record<string, string> {
    const entities: EntityIndex = new Map<string, DatabaseArtifact>(
      plan.database.map((d) => [d.entityName, d])
    );
    const checkPermissions = rbacActive(plan.database);
    const files: Record<string, string> = {};
    const byPath = new Map<string, RoutePiece[]>();

    for (const api of plan.api) {
      const routePath = routePathOf(api);
      const piece = pieceFor(api, routePath, entities, files, this.behaviors, checkPermissions);
      const pieces = byPath.get(routePath) ?? [];
      if (pieces.some((p) => p.method === piece.method)) {
        throw new UnsupportedContractError(
          `API '${api.id}' duplicates ${piece.method} /${routePath} of another feature`
        );
      }
      pieces.push(piece);
      byPath.set(routePath, pieces);
    }

    for (const [routePath, pieces] of byPath) {
      files[`app/${routePath}/route.ts`] = assembleRoute(routePath, pieces);
    }
    return files;
  }
}
