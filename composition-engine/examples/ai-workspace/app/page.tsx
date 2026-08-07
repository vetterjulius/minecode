import React from 'react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-3xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          AI Workspace Reference Application
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your composed Next.js & Supabase application, generated entirely using
          Minecode.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Composed Routes</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li key="ai/chat">
              <a
                href="/ai/chat"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                ChatInterface &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /ai/chat
                </span>
              </a>
            </li>
            <li key="analytics">
              <a
                href="/analytics"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                AnalyticsDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /analytics
                </span>
              </a>
            </li>
            <li key="audit-logs">
              <a
                href="/audit-logs"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                AuditLogDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /audit-logs
                </span>
              </a>
            </li>
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
            <li key="feedback">
              <a
                href="/feedback"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                FeedbackDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /feedback
                </span>
              </a>
            </li>
            <li key="documents">
              <a
                href="/documents"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                DocumentsDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /documents
                </span>
              </a>
            </li>
            <li key="kb">
              <a
                href="/kb"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                HelpCenter &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /kb
                </span>
              </a>
            </li>
            <li key="notifications">
              <a
                href="/notifications"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                NotificationCenter &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /notifications
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
            <li key="projects">
              <a
                href="/projects"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                ProjectsDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /projects
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
            <li key="search">
              <a
                href="/search"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                SearchResults &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /search
                </span>
              </a>
            </li>
            <li key="storage">
              <a
                href="/storage"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                StorageDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /storage
                </span>
              </a>
            </li>
            <li key="tasks">
              <a
                href="/tasks"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                TasksDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /tasks
                </span>
              </a>
            </li>
            <li key="tickets">
              <a
                href="/tickets"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                TicketInbox &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /tickets
                </span>
              </a>
            </li>
            <li key="whiteboard">
              <a
                href="/whiteboard"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                WhiteboardCanvas &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /whiteboard
                </span>
              </a>
            </li>
            <li key="workspaces">
              <a
                href="/workspaces"
                className="block p-4 rounded-lg border hover:bg-muted font-semibold transition"
              >
                WorkspacesDashboard &rarr;
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route: /workspaces
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
