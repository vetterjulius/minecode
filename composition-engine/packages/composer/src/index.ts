import { getResolverInfo } from '@minecode/resolver';
import {
  Blueprint,
  Feature,
  CompositionPlan,
  DatabaseArtifact,
  ApiArtifact,
  UiArtifact,
  NavigationArtifact,
  EventArtifact,
  PermissionArtifact,
  MigrationArtifact,
  ExtensionPointArtifact,
} from '@minecode/core';
import * as fs from 'fs';
import * as path from 'path';

export function getComposerInfo(): string {
  return `Minecode Composer relying on: ${getResolverInfo()}`;
}

export class Composer {
  /**
   * Generates a deterministic CompositionPlan from a resolved feature graph and blueprint.
   */
  public compose(resolvedFeatures: Feature[], blueprint: Blueprint): CompositionPlan {
    const stackId = blueprint.stackId || 'nextjs-supabase';
    const applicationName = blueprint.applicationName || 'Minecode Application';

    // 1. Database (Entities)
    const database: DatabaseArtifact[] = [];
    const databaseSeen = new Set<string>();

    // 2. API
    const api: ApiArtifact[] = [];
    const apiSeen = new Set<string>();

    // 3. UI
    const ui: UiArtifact[] = [];
    const uiSeen = new Set<string>();

    // 4. Events
    const events: EventArtifact[] = [];
    const eventsSeen = new Set<string>();

    // 5. Permissions
    const permissions: PermissionArtifact[] = [];
    const permissionsSeen = new Set<string>();

    // 6. Migrations (from feature modules of type 'migration')
    const migrations: MigrationArtifact[] = [];
    const migrationsSeen = new Set<string>();

    // 7. Extension Points definitions
    const extensionPointsMap = new Map<string, ExtensionPointArtifact>();

    // Temporarily hold raw navigation entries before building tree
    interface TempNav {
      featureId: string;
      name: string;
      label: string;
      path: string;
      parent?: string;
      order?: number;
      icon?: string;
    }
    const rawNavs: TempNav[] = [];

    // Extract artifacts from each feature (respecting topological sort order)
    for (const feature of resolvedFeatures) {
      const provides = feature.contract?.provides;

      // Extract entities -> Database
      if (provides?.entities) {
        for (const ent of provides.entities) {
          const uniqueKey = `${feature.id}:${ent.name}`;
          if (!databaseSeen.has(uniqueKey)) {
            databaseSeen.add(uniqueKey);
            database.push({
              id: uniqueKey,
              featureId: feature.id,
              entityName: ent.name,
              fields: ent.fields || [],
              description: ent.description,
            });
          }
        }
      }

      // Extract API definitions
      if (provides?.api) {
        for (const apiDef of provides.api) {
          const uniqueKey = `${feature.id}:${apiDef.name}`;
          if (!apiSeen.has(uniqueKey)) {
            apiSeen.add(uniqueKey);
            api.push({
              id: uniqueKey,
              featureId: feature.id,
              name: apiDef.name,
              path: apiDef.path,
              method: apiDef.method,
              description: apiDef.description,
            });
          }
        }
      }

      // Extract UI definitions
      if (provides?.ui) {
        for (const uiDef of provides.ui) {
          const uniqueKey = `${feature.id}:${uiDef.name}`;
          if (!uiSeen.has(uniqueKey)) {
            uiSeen.add(uniqueKey);
            ui.push({
              id: uniqueKey,
              featureId: feature.id,
              name: uiDef.name,
              component: uiDef.component,
              route: uiDef.route,
              slot: uiDef.slot,
              description: uiDef.description,
            });
          }
        }
      }

      // Extract Event definitions
      if (provides?.events) {
        for (const eventDef of provides.events) {
          const uniqueKey = `${feature.id}:${eventDef.name}`;
          if (!eventsSeen.has(uniqueKey)) {
            eventsSeen.add(uniqueKey);
            events.push({
              id: uniqueKey,
              featureId: feature.id,
              name: eventDef.name,
              payloadSchema: eventDef.payloadSchema,
              description: eventDef.description,
            });
          }
        }
      }

      // Extract Permission definitions
      if (provides?.permissions) {
        for (const permDef of provides.permissions) {
          const uniqueKey = `${feature.id}:${permDef.name}`;
          if (!permissionsSeen.has(uniqueKey)) {
            permissionsSeen.add(uniqueKey);
            permissions.push({
              id: uniqueKey,
              featureId: feature.id,
              name: permDef.name,
              description: permDef.description,
            });
          }
        }
      }

      // Extract Migrations from modules
      if (feature.modules) {
        for (const mod of feature.modules) {
          if (mod.type === 'migration') {
            const uniqueKey = `${feature.id}:${mod.name}`;
            if (!migrationsSeen.has(uniqueKey)) {
              migrationsSeen.add(uniqueKey);
              let migrationContent: string | undefined;
              if (feature.featureDir) {
                const fullMigrationPath = path.join(feature.featureDir, 'modules', mod.name);
                if (fs.existsSync(fullMigrationPath)) {
                  migrationContent = fs.readFileSync(fullMigrationPath, 'utf8');
                }
              }
              migrations.push({
                id: uniqueKey,
                featureId: feature.id,
                name: mod.name,
                type: 'database', // Default to database type
                description: mod.description,
                content: migrationContent,
              });
            }
          }
        }
      }

      // Extract Extension Points definitions
      if (provides?.extensionPoints) {
        for (const ep of provides.extensionPoints) {
          const epId = ep.name; // Use global name or namespaced
          if (!extensionPointsMap.has(epId)) {
            extensionPointsMap.set(epId, {
              id: `${feature.id}:${ep.name}`,
              featureId: feature.id,
              name: ep.name,
              type: ep.type,
              description: ep.description,
              schema: ep.schema,
              contributions: [],
            });
          }
        }
      }

      // Collect raw navigation entries
      if (provides?.navigation) {
        for (const navDef of provides.navigation) {
          rawNavs.push({
            featureId: feature.id,
            name: navDef.name,
            label: navDef.label,
            path: navDef.path,
            parent: navDef.parent,
            order: navDef.order,
            icon: navDef.icon,
          });
        }
      }
    }

    // Process and merge Navigation entries deterministically
    // Deduplicate raw navigation entries by "name"
    const navMap = new Map<string, NavigationArtifact>();
    for (const nav of rawNavs) {
      if (!navMap.has(nav.name)) {
        navMap.set(nav.name, {
          id: `${nav.featureId}:${nav.name}`,
          featureId: nav.featureId,
          name: nav.name,
          label: nav.label,
          path: nav.path,
          parent: nav.parent,
          order: nav.order ?? 0,
          icon: nav.icon,
          children: [],
        });
      } else {
        // If it exists, merge them. Keep properties of the first one, or update if values are defined
        const existing = navMap.get(nav.name)!;
        if (nav.label) existing.label = nav.label;
        if (nav.path) existing.path = nav.path;
        if (nav.parent) existing.parent = nav.parent;
        if (nav.order !== undefined) existing.order = nav.order;
        if (nav.icon) existing.icon = nav.icon;
      }
    }

    // Build Navigation tree
    const rootNavs: NavigationArtifact[] = [];
    for (const nav of navMap.values()) {
      if (nav.parent && navMap.has(nav.parent)) {
        const parentNode = navMap.get(nav.parent)!;
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(nav);
      } else {
        rootNavs.push(nav);
      }
    }

    // Helper to sort navigation items recursively
    const sortNavs = (items: NavigationArtifact[]) => {
      items.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          sortNavs(item.children);
        }
      }
    };
    sortNavs(rootNavs);

    // 8. Extension Point Contributions matching
    // Gather all contributions across all resolved features and map them to defined extension points
    for (const feature of resolvedFeatures) {
      const contributions = feature.contract?.contributions;
      if (contributions) {
        for (const contrib of contributions) {
          const targetEp = extensionPointsMap.get(contrib.targetExtensionPoint);
          if (targetEp) {
            targetEp.contributions.push({
              sourceFeatureId: feature.id,
              value: contrib.value,
              description: contrib.description,
            });
          }
        }
      }
    }

    // Sort all artifact collections deterministically by ID (or name) to be fully reproducible
    const sortById = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    database.sort((a, b) => a.id.localeCompare(b.id));
    api.sort(sortById);
    ui.sort(sortById);
    events.sort(sortById);
    permissions.sort(sortById);
    migrations.sort(sortById);

    const extensionPoints = Array.from(extensionPointsMap.values());
    extensionPoints.sort(sortById);

    return {
      applicationName,
      stackId,
      database,
      api,
      ui,
      navigation: rootNavs,
      events,
      permissions,
      migrations,
      extensionPoints,
    };
  }
}
