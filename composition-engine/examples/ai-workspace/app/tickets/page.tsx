'use client';

import React, { useState, useEffect } from 'react';

interface SupportTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeid?: string;
  organizationid: string;
}

export default function TicketInboxPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting ticket...');
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Ticket submitted successfully!');
        setTitle('');
        fetchTickets();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Submission failed.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">
          Manage and track your customer issue requests in the multi-tenant ticketing system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">File Support Request</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Issue Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="Unable to sync database"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
              Submit Ticket
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Ticket Queue</h2>
          {loading ? (
            <p className="text-muted-foreground">Loading queue...</p>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground">No active support tickets found.</p>
          ) : (
            <div className="divide-y">
              {tickets.map((t) => (
                <div key={t.id} className="py-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-bold text-base">{t.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Org: {t.organizationid} • Assignee: {t.assigneeid || 'unassigned'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${t.priority === 'urgent' ? 'bg-red-200 text-red-800' : t.priority === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}
                    >
                      {t.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-200 text-gray-800">
                      {t.status.toUpperCase()}
                    </span>
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
