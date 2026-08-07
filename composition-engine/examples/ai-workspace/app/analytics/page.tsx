import React, { useState, useEffect } from 'react';

interface MetricRecord {
  id: string;
  name: string;
  value: number;
  organizationid: string;
  createdat: string;
}

export default function AnalyticsDashboardPage() {
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const url = orgId
        ? `/api/analytics/metrics?organizationId=${encodeURIComponent(orgId)}`
        : '/api/analytics/metrics';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [orgId]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Usage & Analytics</h1>
        <p className="text-muted-foreground">
          Monitor performance, system KPIs, and multi-tenant billing consumption.
        </p>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <label className="font-semibold">Filter Organization:</label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="Enter Organization ID (UUID)..."
          className="border rounded-md p-2 bg-card w-72"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-2">
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
            Total Tracked Metrics
          </p>
          <p className="text-4xl font-black">{metrics.length}</p>
        </div>
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-2">
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
            Avg Metric Value
          </p>
          <p className="text-4xl font-black text-blue-600">
            {metrics.length > 0
              ? (metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length).toFixed(2)
              : '0.00'}
          </p>
        </div>
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-2">
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">
            Status
          </p>
          <p className="text-4xl font-black text-green-600">Healthy</p>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden text-sm">
        {loading ? (
          <p className="p-6 text-muted-foreground text-center">Loading analytics charts...</p>
        ) : metrics.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">
            No analytical metrics captured yet.
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="p-3">Metric Name</th>
                <th className="p-3">Captured Value</th>
                <th className="p-3">Organization ID</th>
                <th className="p-3">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {metrics.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="p-3 font-semibold">{m.name}</td>
                  <td className="p-3 font-mono font-bold text-blue-600">{m.value}</td>
                  <td className="p-3 font-mono">{m.organizationid}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(m.createdat).toLocaleString()}
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
