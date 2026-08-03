import React from 'react';

/**
 * Multi-tenant workspace dashboard.
 * Route: /organizations
 */
export default function OrganizationsDashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">OrganizationsDashboard</h1>
        <p className="text-muted-foreground">Multi-tenant workspace dashboard.</p>
        <div className="p-4 rounded-md bg-muted text-sm text-muted-foreground font-mono">
          Render slot: main
        </div>
      </div>
    </div>
  );
}
