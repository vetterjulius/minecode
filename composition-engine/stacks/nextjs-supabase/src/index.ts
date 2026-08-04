import { StackAdapter, CompositionPlan } from '@minecode/core';

export class NextJsSupabaseAdapter implements StackAdapter {
  public readonly stackId = 'nextjs-supabase';

  public generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string> {
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
        let pageContent = '';

        if (normalizedRoute === 'auth/login') {
          pageContent = `import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Logging in...');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Logged in successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form onSubmit={handleLogin} className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Login</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Sign In</button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
`;
        } else if (normalizedRoute === 'auth/reset-password') {
          pageContent = `import React, { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending reset email...');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Reset email sent successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form onSubmit={handleReset} className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a password reset link.</p>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Send Reset Link</button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
`;
        } else if (normalizedRoute === 'billing') {
          pageContent = `import React, { useState } from 'react';

export default function BillingSettingsPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [priceId, setPriceId] = useState('');
  const [status, setStatus] = useState('');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating checkout session...');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, priceId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Billing Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization's subscription and billing integrations.</p>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input type="text" value={organizationId} onChange={e => setOrganizationId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ID</label>
            <input type="text" value={priceId} onChange={e => setPriceId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Checkout with Stripe</button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}
`;
        } else if (normalizedRoute === 'organizations') {
          pageContent = `import React, { useState, useEffect } from 'react';

export default function OrganizationsDashboard() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setOrganizations(data.data);
          if (data.data.length > 0) setSelectedOrgId(data.data[0].id);
        }
      })
      .catch(err => console.error('Failed to load organizations:', err));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setStatus('Please select or enter an organization ID first.');
      return;
    }
    setStatus('Sending invitation...');
    try {
      const res = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId, email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Invitation sent successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Organizations Dashboard</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Organizations</h2>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations found. Join or create one to get started.</p>
          ) : (
            <ul className="divide-y border rounded-md p-4 bg-muted/20">
              {organizations.map(org => (
                <li key={org.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold">{org.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{org.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleInvite} className="space-y-4 pt-4 border-t">
          <h2 className="text-xl font-bold">Invite Member</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input type="text" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 border rounded-md bg-background">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Send Invitation</button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}
`;
        } else if (normalizedRoute === 'rbac-admin') {
          pageContent = `import React, { useState, useEffect } from 'react';

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
        } else {
          pageContent = `import React from 'react';

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
        }

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
      if (mig.content) {
        files[`supabase/migrations/${cleanName}`] = mig.content;
      } else {
        const typeDesc = mig.type || 'database';
        const desc = mig.description || `Migration for ${mig.name}`;
        const sqlMigrationContent = `-- Migration: ${mig.name} (${typeDesc})\n-- Description: ${desc}\n\n-- TODO: Add your custom ${typeDesc} migration script here\n`;
        files[`supabase/migrations/${cleanName}`] = sqlMigrationContent;
      }
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

    if (options?.runnable) {
      const formattedPkgName =
        plan.applicationName
          .toLowerCase()
          .replace(/[^a-z0-9-_]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'composed-app';

      files['package.json'] = `{
  "name": "${formattedPkgName}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.43.2",
    "@supabase/auth-helpers-nextjs": "^0.10.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.3"
  }
}
`;

      files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

      files['postcss.config.js'] = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

      files['tailwind.config.ts'] = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./generated/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
`;

      files['next.config.mjs'] = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;

      files['.env.local'] = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`;

      files['app/globals.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
`;

      files['app/layout.tsx'] = `import React from 'react';
import './globals.css';

export const metadata = {
  title: '${plan.applicationName}',
  description: 'Generated with Minecode',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

      const pageLinksList: string[] = [];
      for (const uiDef of plan.ui) {
        if (uiDef.route) {
          const pathName = uiDef.route.replace(/^\/+|\/+$/g, '');
          pageLinksList.push(
            '              <li key="' +
              pathName +
              '">\n' +
              '                <a\n' +
              '                  href="/' +
              pathName +
              '"\n' +
              '                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"\n' +
              '                >\n' +
              '                  ' +
              uiDef.name +
              ' &rarr;\n' +
              '                  <span className="block text-sm text-muted-foreground font-normal mt-1">\n' +
              '                    Route: /' +
              pathName +
              '\n' +
              '                  </span>\n' +
              '                </a>\n' +
              '              </li>'
          );
        }
      }

      files['app/page.tsx'] =
        `import React from 'react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-3xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">${plan.applicationName}</h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your composed Next.js & Supabase application, generated entirely using Minecode.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Composed Routes</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
` +
        pageLinksList.join('\n') +
        `
          </ul>
        </div>
      </div>
    </div>
  );
}
`;
    }

    return files;
  }
}
