import { SubGenerator, CompositionPlan } from '@minecode/core';

export class WorkspaceSubGenerator implements SubGenerator {
  public readonly id = 'workspace';

  public generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string> {
    const files: Record<string, string> = {};

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
