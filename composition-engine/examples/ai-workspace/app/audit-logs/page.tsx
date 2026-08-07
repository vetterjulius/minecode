import React, { useState, useEffect } from 'react';

interface AuditLogEntry {
  id: string;
  action: string;
  actorid?: string;
  entityname?: string;
  entityid?: string;
  createdat: string;
}

export default function AuditLogDashboardPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = actionFilter
        ? `/api/audit-logs?action=${encodeURIComponent(actionFilter)}`
        : '/api/audit-logs';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Audit Logging</h1>
        <p className="text-muted-foreground">
          Trace security incidents, user activity logs, and entity mutations.
        </p>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <label className="font-semibold">Filter Action:</label>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border rounded-md p-2 bg-card"
        >
          <option value="">All Actions</option>
          <option value="user.login">user.login</option>
          <option value="ticket.create">ticket.create</option>
          <option value="organization.invite">organization.invite</option>
          <option value="billing.checkout">billing.checkout</option>
        </select>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden text-sm">
        {loading ? (
          <p className="p-6 text-muted-foreground text-center">Loading audit trails...</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">No logs recorded yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="p-3">Action</th>
                <th className="p-3">Actor ID</th>
                <th className="p-3">Entity Name</th>
                <th className="p-3">Entity ID</th>
                <th className="p-3">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold text-blue-600">{log.action}</td>
                  <td className="p-3 font-mono text-xs">{log.actorid || 'anonymous'}</td>
                  <td className="p-3">{log.entityname || '-'}</td>
                  <td className="p-3 font-mono text-xs">{log.entityid || '-'}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(log.createdat).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
