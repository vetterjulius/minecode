'use client';

import React, { useState, useEffect } from 'react';

interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  status: string;
  organizationid: string;
  workspaceid: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orgId, setOrgId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating project...');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, organizationId: orgId, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setName('');
        setDescription('');
        fetchProjects();
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
        <h1 className="text-4xl font-extrabold tracking-tight">Projects Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and organize tasks and files inside workspaces.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Project</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="e.g. Website Redesign"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="Describe the project..."
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
            <div>
              <label className="block font-medium mb-1">Workspace ID</label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="uuid"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95"
            >
              Create Project
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Active Projects</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="p-4 border rounded-lg bg-muted space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg">{p.name}</p>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-200 text-green-800">
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-muted-foreground text-sm">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    Workspace: {p.workspaceid} • Org: {p.organizationid}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
