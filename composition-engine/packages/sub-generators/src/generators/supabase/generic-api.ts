import { SubGenerator, CompositionPlan } from '@minecode/core';

export class SupabaseGenericApiSubGenerator implements SubGenerator {
  public readonly id = 'supabase-generic-api';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    const specializedRoutes = [
      'api/auth/login',
      'api/auth/logout',
      'api/auth/reset-password',
      'api/organizations/invite',
      'api/billing/checkout',
      'api/billing/webhook',
      'api/rbac/roles',
    ];

    for (const apiDef of plan.api) {
      const normalizedPath = apiDef.path.replace(/^\/+|\/+$/g, '');
      const method = apiDef.method || 'GET';
      const name = apiDef.name;
      const desc = apiDef.description || `Handler for ${name} (${method})`;

      const fullRoutePath = normalizedPath.startsWith('api/')
        ? normalizedPath
        : `api/${normalizedPath}`;

      // Skip specialized API routes
      if (specializedRoutes.includes(fullRoutePath)) {
        continue;
      }
      if (fullRoutePath === 'api/organizations' && method === 'GET') {
        continue;
      }

      files[`app/${fullRoutePath}/route.ts`] =
        `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function ${method.toUpperCase()}(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const tableName = '${fullRoutePath.split('/').pop() || 'data'}';
    if ('${method.toUpperCase()}' === 'GET') {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      const body = await request.json();
      const { data, error } = await supabase
        .from(tableName)
        .insert(body)
        .select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
    }

    return files;
  }
}
