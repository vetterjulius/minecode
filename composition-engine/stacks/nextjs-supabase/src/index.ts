import { StackAdapter, CompositionPlan } from '@minecode/core';

export class NextJsSupabaseAdapter implements StackAdapter {
  public readonly stackId = 'nextjs-supabase';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let dbTypesContent = `// Generated database type definitions for ${plan.applicationName}\n\n`;
    for (const ent of plan.database) {
      const entityName = ent.entityName;
      const fields = ent.fields;

      let sqlContent = `-- SQL DDL for entity: ${entityName}\n`;
      if (ent.description) {
        sqlContent += `-- Description: ${ent.description}\n`;
      }
      sqlContent += `CREATE TABLE IF NOT EXISTS "${entityName.toLowerCase()}" (\n`;

      const sqlFieldsList: string[] = [];
      const tsFieldsList: string[] = [];

      for (const field of fields) {
        let sqlType = 'TEXT';
        let tsType = 'string';

        const fType = field.type.toLowerCase();
        if (fType === 'uuid') {
          sqlType = 'UUID';
          tsType = 'string';
        } else if (fType === 'string' || fType === 'text') {
          sqlType = fType === 'text' ? 'TEXT' : 'VARCHAR(255)';
          tsType = 'string';
        } else if (fType === 'integer' || fType === 'int' || fType === 'number') {
          sqlType = 'INTEGER';
          tsType = 'number';
        } else if (fType === 'boolean') {
          sqlType = 'BOOLEAN';
          tsType = 'boolean';
        } else if (fType === 'timestamp' || fType === 'date' || fType === 'datetime') {
          sqlType = 'TIMESTAMP WITH TIME ZONE';
          tsType = 'string';
        } else if (fType === 'json' || fType === 'jsonb') {
          sqlType = 'JSONB';
          tsType = 'any';
        }

        const isPrimaryKey = field.name.toLowerCase() === 'id';
        const isRequired = field.required || isPrimaryKey;

        let sqlFieldDef = `  "${field.name}" ${sqlType}`;
        if (isPrimaryKey) {
          sqlFieldDef += ' PRIMARY KEY';
        }
        if (isRequired) {
          sqlFieldDef += ' NOT NULL';
        }
        sqlFieldsList.push(sqlFieldDef);

        const tsRequiredMark = isRequired ? '' : '?';
        let tsFieldDef = `  ${field.name}${tsRequiredMark}: ${tsType};`;
        if (field.description) {
          tsFieldDef = `  /** ${field.description} */\n` + tsFieldDef;
        }
        tsFieldsList.push(tsFieldDef);
      }

      sqlContent += sqlFieldsList.join(',\n') + '\n);\n';
      files[`supabase/migrations/${entityName.toLowerCase()}_table.sql`] = sqlContent;

      dbTypesContent += `/**\n * Entity: ${entityName}\n`;
      if (ent.description) {
        dbTypesContent += ` * ${ent.description}\n`;
      }
      dbTypesContent += ` */\nexport interface ${entityName} {\n`;
      dbTypesContent += tsFieldsList.join('\n') + '\n}\n\n';
    }
    if (plan.database.length > 0) {
      files['types/database.ts'] = dbTypesContent.trim() + '\n';
    }

    for (const apiDef of plan.api) {
      const normalizedPath = apiDef.path.replace(/^\/+|\/+$/g, '');
      const method = apiDef.method || 'GET';
      const name = apiDef.name;
      const desc = apiDef.description || `Mock handler for ${name} (${method})`;

      const apiRouteContent = `import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /api/${normalizedPath}
 */
export async function ${method.toUpperCase()}(_request: Request) {
  return NextResponse.json({
    message: "Mock response for ${name} API endpoint using ${method}",
    success: true,
    timestamp: new Date().toISOString()
  });
}
`;
      files[`app/api/${normalizedPath}/route.ts`] = apiRouteContent;
    }

    for (const uiDef of plan.ui) {
      const name = uiDef.name;
      const componentName = uiDef.component || `${name}.tsx`;
      const desc = uiDef.description || `UI component for ${name}`;

      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');
        const pageContent = `import React from 'react';

/**
 * ${desc}
 * Route: /${normalizedRoute}
 */
export default function ${name}Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">${name}</h1>
        <p className="text-muted-foreground">${desc}</p>
        <div className="p-4 rounded-md bg-muted text-sm text-muted-foreground font-mono">
          Render slot: ${uiDef.slot || 'none'}
        </div>
      </div>
    </div>
  );
}
`;
        files[`app/${normalizedRoute}/page.tsx`] = pageContent;
      } else {
        const componentContent = `import React from 'react';

/**
 * ${desc}
 */
export function ${name}() {
  return (
    <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm space-y-2">
      <h3 className="text-lg font-bold">${name}</h3>
      <p className="text-sm text-muted-foreground">${desc}</p>
      <div className="p-2 text-xs bg-muted font-mono rounded">
        Slot: ${uiDef.slot || 'none'}
      </div>
    </div>
  );
}
`;
        files[`components/${componentName}`] = componentContent;
      }
    }

    for (const mig of plan.migrations) {
      const cleanName = mig.name.replace(/^\/+|\/+$/g, '');
      const typeDesc = mig.type || 'database';
      const desc = mig.description || `Migration for ${mig.name}`;

      const sqlMigrationContent = `-- Migration: ${mig.name} (${typeDesc})\n-- Description: ${desc}\n\n-- TODO: Add your custom ${typeDesc} migration script here\n`;
      files[`supabase/migrations/${cleanName}`] = sqlMigrationContent;
    }

    if (plan.navigation.length > 0) {
      let navTypesContent = `// Navigation types and items for ${plan.applicationName}\n\n`;
      navTypesContent += `export interface NavigationItem {\n  id: string;\n  name: string;\n  label: string;\n  path: string;\n  parent?: string;\n  order: number;\n  icon?: string;\n  children?: NavigationItem[];\n}\n\n`;
      navTypesContent += `export const navigationConfig: NavigationItem[] = ${JSON.stringify(plan.navigation, null, 2)};\n`;
      files['config/navigation.ts'] = navTypesContent;
    }

    if (plan.permissions.length > 0) {
      let permContent = `// Permissions list for ${plan.applicationName}\n\n`;
      permContent += `export const permissions = {\n`;
      for (const perm of plan.permissions) {
        permContent += `  /** ${perm.description || 'Permission for ' + perm.name} */\n`;
        permContent += `  "${perm.name}": "${perm.id}",\n`;
      }
      permContent += `} as const;\n\n`;
      permContent += `export type Permission = keyof typeof permissions;\n`;
      files['config/permissions.ts'] = permContent;
    }

    if (plan.events.length > 0) {
      let eventContent = `// Events and payload schemas for ${plan.applicationName}\n\n`;
      eventContent += `export const events = {\n`;
      for (const ev of plan.events) {
        eventContent += `  "${ev.name}": {\n`;
        eventContent += `    id: "${ev.id}",\n`;
        eventContent += `    description: ${JSON.stringify(ev.description || '')},\n`;
        eventContent += `    payloadSchema: ${JSON.stringify(ev.payloadSchema || {})},\n`;
        eventContent += `  },\n`;
      }
      eventContent += `} as const;\n`;
      files['config/events.ts'] = eventContent;
    }

    if (plan.extensionPoints.length > 0) {
      let extContent = `// Extension points and contributions for ${plan.applicationName}\n\n`;
      extContent += `export const extensionPoints = {\n`;
      for (const ep of plan.extensionPoints) {
        extContent += `  "${ep.name}": {\n`;
        extContent += `    id: "${ep.id}",\n`;
        extContent += `    type: "${ep.type}",\n`;
        extContent += `    description: ${JSON.stringify(ep.description || '')},\n`;
        extContent += `    schema: ${JSON.stringify(ep.schema || {})},\n`;
        extContent += `    contributions: ${JSON.stringify(ep.contributions, null, 4)},\n`;
        extContent += `  },\n`;
      }
      extContent += `} as const;\n`;
      files['config/extensions.ts'] = extContent;
    }

    return files;
  }
}
