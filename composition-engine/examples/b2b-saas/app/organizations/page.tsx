import React, { useState, useEffect } from 'react';

interface OrganizationMembership {
  id: string;
  userid: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  membership?: OrganizationMembership[];
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteStatus, setInviteStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatus('Sending invitation...');
    try {
      const res = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, organizationId: inviteOrgId, role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteStatus('Invitation sent successfully!');
        setInviteEmail('');
      } else {
        setInviteStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setInviteStatus('Failed: ' + message);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          Organizations Portal
        </h1>
        <p className="text-muted-foreground">
          Manage workspaces, tenant teams, and client invitations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-xl font-bold">Invite Member</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID</label>
              <input
                type="text"
                value={inviteOrgId}
                onChange={(e) => setInviteOrgId(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role Type</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90"
            >
              Invite User
            </button>
            {inviteStatus && <p className="text-center text-sm font-semibold">{inviteStatus}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-xl font-bold">Workspaces</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading organization list...</p>
          ) : organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations configured.</p>
          ) : (
            <div className="divide-y text-sm">
              {organizations.map((org) => (
                <div key={org.id} className="py-4 space-y-2">
                  <div className="flex justify-between">
                    <p className="font-bold text-base text-foreground">{org.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">ID: {org.id}</p>
                  </div>
                  {org.membership && org.membership.length > 0 && (
                    <div className="p-3 bg-muted rounded-md space-y-1">
                      <p className="font-semibold text-xs text-muted-foreground">
                        Active Team Members:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {org.membership.map((m) => (
                          <li key={m.id}>
                            User ID: {m.userid} ({m.role})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
