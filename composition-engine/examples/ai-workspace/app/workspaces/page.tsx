'use client';

import React, { useState, useEffect } from 'react';

interface WorkspaceRecord {
  id: string;
  name: string;
  organizationid: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      if (data.success) {
        setWorkspaces(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating workspace...');
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setName('');
        fetchWorkspaces();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Creation failed.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Workspaces Portal</h1>
        <p className="text-muted-foreground">
          Manage isolated team workspace environments in your tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Workspace</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Workspace Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="e.g. Marketing"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="uuid"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95"
            >
              Create Workspace
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Active Workspaces</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading workspaces...</p>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active workspaces found.</p>
          ) : (
            <div className="divide-y">
              {workspaces.map((w) => (
                <div key={w.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-base">{w.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Org ID: {w.organizationid}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded">
                    ID: {w.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
