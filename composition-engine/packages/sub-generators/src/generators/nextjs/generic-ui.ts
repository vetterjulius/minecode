import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsGenericUiSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-generic-ui';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    const specializedRoutes = [
      'auth/login',
      'auth/reset-password',
      'billing',
      'organizations',
      'rbac-admin'
    ];

    for (const uiDef of plan.ui) {
      const name = uiDef.name;
      const componentName = uiDef.component || `${name}.tsx`;
      const desc = uiDef.description || `UI component for ${name}`;

      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');

        if (specializedRoutes.includes(normalizedRoute)) {
          continue;
        }

        files[`app/${normalizedRoute}/page.tsx`] = `import React from 'react';

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
      } else {
        files[`components/${componentName}`] = `import React from 'react';

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
      }
    }

    return files;
  }
}
