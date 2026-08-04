import React from 'react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-3xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">B2B SaaS Reference Application</h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your composed Next.js & Supabase application, generated entirely using Minecode.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Composed Routes</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li key="auth/login">
                <a
                  href="/auth/login"
                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
                >
                  LoginPage &rarr;
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    Route: /auth/login
                  </span>
                </a>
              </li>
              <li key="auth/reset-password">
                <a
                  href="/auth/reset-password"
                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
                >
                  ResetPasswordPage &rarr;
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    Route: /auth/reset-password
                  </span>
                </a>
              </li>
              <li key="billing">
                <a
                  href="/billing"
                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
                >
                  BillingSettingsPage &rarr;
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    Route: /billing
                  </span>
                </a>
              </li>
              <li key="organizations">
                <a
                  href="/organizations"
                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
                >
                  OrganizationsDashboard &rarr;
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    Route: /organizations
                  </span>
                </a>
              </li>
              <li key="rbac-admin">
                <a
                  href="/rbac-admin"
                  className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
                >
                  RbacAdminPage &rarr;
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                    Route: /rbac-admin
                  </span>
                </a>
              </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
