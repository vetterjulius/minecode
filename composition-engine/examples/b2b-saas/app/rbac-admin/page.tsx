import React, { useState, useEffect } from 'react';

export default function RbacAdminPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setStatus('Loading roles...');
    fetch('/api/rbac/roles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setRoles(data.data);
          setStatus('');
        } else {
          setStatus('Error: ' + data.error);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus('Failed to load roles: ' + message);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">RBAC Administration</h1>
        <p className="text-sm text-muted-foreground">
          Manage security roles and assign user access permissions across the system.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Configured System Roles</h2>
          {status && <p className="text-sm font-semibold text-muted-foreground">{status}</p>}
          {roles.length === 0 && !status ? (
            <p className="text-sm text-muted-foreground">No roles configured in the database.</p>
          ) : (
            <ul className="divide-y border rounded-md p-4 bg-muted/20">
              {roles.map((role) => (
                <li key={role.id} className="py-3 flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{role.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{role.id}</span>
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
