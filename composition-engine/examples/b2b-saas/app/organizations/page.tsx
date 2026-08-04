import React, { useState, useEffect } from 'react';

export default function OrganizationsDashboard() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setOrganizations(data.data);
          if (data.data.length > 0) setSelectedOrgId(data.data[0].id);
        }
      })
      .catch(err => console.error('Failed to load organizations:', err));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setStatus('Please select or enter an organization ID first.');
      return;
    }
    setStatus('Sending invitation...');
    try {
      const res = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId, email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Invitation sent successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Organizations Dashboard</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Organizations</h2>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations found. Join or create one to get started.</p>
          ) : (
            <ul className="divide-y border rounded-md p-4 bg-muted/20">
              {organizations.map(org => (
                <li key={org.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold">{org.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{org.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleInvite} className="space-y-4 pt-4 border-t">
          <h2 className="text-xl font-bold">Invite Member</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input type="text" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 border rounded-md bg-background">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Send Invitation</button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}
