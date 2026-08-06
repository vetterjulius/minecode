import React, { useState, useEffect } from 'react';

interface RbacPermission {
  id: string;
  name: string;
}

interface RbacRole {
  id: string;
  name: string;
  description?: string;
  permission?: RbacPermission[];
}

export default function RbacAdminPage() {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/rbac/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          RBAC Authorization
        </h1>
        <p className="text-muted-foreground">
          Enforce permission gates and define granular roles across organization workspaces.
        </p>
      </div>

      <div className="p-6 border rounded-xl bg-card shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Configured Authorization Roles</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles registered in the plan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {roles.map((role) => (
              <div key={role.id} className="p-4 border rounded-xl bg-muted space-y-3 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{role.name.toUpperCase()}</h3>
                  <p className="text-xs text-muted-foreground">
                    {role.description || 'No description provided.'}
                  </p>
                </div>
                {role.permission && role.permission.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-muted-foreground">
                      Granted Permissions:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permission.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-foreground text-background shadow-sm"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
