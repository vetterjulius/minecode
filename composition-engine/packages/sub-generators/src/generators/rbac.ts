import { SubGenerator, CompositionPlan } from '@minecode/core';

export class RbacSubGenerator implements SubGenerator {
  public readonly id = 'rbac';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    for (const apiDef of plan.api) {
      const normalizedPath = apiDef.path.replace(/^\/+|\/+$/g, '');
      const method = apiDef.method || 'GET';
      const name = apiDef.name;
      const desc = apiDef.description || `Handler for ${name} (${method})`;

      const fullRoutePath = normalizedPath.startsWith('api/')
        ? normalizedPath
        : `api/${normalizedPath}`;

      if (fullRoutePath === 'api/rbac/roles') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data: roles, error } = await supabase
      .from('role')
      .select('*');

    if (error) throw error;
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
    }

    for (const uiDef of plan.ui) {
      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');

        if (normalizedRoute === 'rbac-admin') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `import React, { useState, useEffect } from 'react';

export default function RbacAdminPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setStatus('Loading roles...');
    fetch('/api/rbac/roles')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setRoles(data.data);
          setStatus('');
        } else {
          setStatus('Error: ' + data.error);
        }
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus('Failed to load roles: ' + message);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">RBAC Administration</h1>
        <p className="text-sm text-muted-foreground">Manage security roles and assign user access permissions across the system.</p>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Configured System Roles</h2>
          {status && <p className="text-sm font-semibold text-muted-foreground">{status}</p>}
          {roles.length === 0 && !status ? (
            <p className="text-sm text-muted-foreground">No roles configured in the database.</p>
          ) : (
            <ul className="divide-y border rounded-md p-4 bg-muted/20">
              {roles.map(role => (
                <li key={role.id} className="py-3 flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{role.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{role.id}</span>
                  </div>
                  {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
      }
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

    return files;
  }
}
