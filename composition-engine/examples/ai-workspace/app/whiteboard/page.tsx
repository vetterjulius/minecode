'use client';

import React, { useState, useEffect } from 'react';

interface WhiteboardSessionEntry {
  id: string;
  name: string;
  organizationid: string;
}

export default function WhiteboardCanvasPage() {
  const [sessions, setSessions] = useState<WhiteboardSessionEntry[]>([]);
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/whiteboards');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating board...');
    try {
      const res = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setName('');
        fetchBoards();
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
        <h1 className="text-4xl font-extrabold tracking-tight">Collaborative Whiteboard</h1>
        <p className="text-muted-foreground">
          Collaborate with your organization teams on an infinite canvas whiteboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Canvas Session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Canvas Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="Sprint 2 Design"
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
              Create Whiteboard
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Active Canvas Whiteboards</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading active canvas sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drawing canvas active yet.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-4 border rounded-lg bg-muted text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base">{sess.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Org: {sess.organizationid}
                    </span>
                  </div>
                  <div className="w-full h-32 bg-card border rounded flex items-center justify-center text-xs text-muted-foreground font-mono">
                    [ Interactive Drawing Canvas Area - Click to Load shapes ]
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
