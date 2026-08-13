import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseUiSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-ui';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    for (const uiDef of plan.ui) {
      const name = uiDef.name;
      const componentName = uiDef.component || `${name}.tsx`;
      const desc = uiDef.description || `UI component for ${name}`;

      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');

        // 1. Auth: Login
        if (normalizedRoute === 'auth/login') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Logging in...');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Logged in successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form onSubmit={handleLogin} className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Login</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Sign In</button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
`;
        }
        // 2. Auth: Reset Password
        else if (normalizedRoute === 'auth/reset-password') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending reset email...');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Reset email sent successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form onSubmit={handleReset} className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a password reset link.</p>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
        </div>
        <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Send Reset Link</button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
`;
        }
        // 3. Billing: Settings
        else if (normalizedRoute === 'billing') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState } from 'react';

export default function BillingSettingsPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [priceId, setPriceId] = useState('');
  const [status, setStatus] = useState('');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating checkout session...');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, priceId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Billing Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization's subscription and billing integrations.</p>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input type="text" value={organizationId} onChange={e => setOrganizationId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ID</label>
            <input type="text" value={priceId} onChange={e => setPriceId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Checkout with Stripe</button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}
`;
        }
        // 4. Orgs: Portal
        else if (normalizedRoute === 'organizations') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Organizations Portal</h1>
        <p className="text-muted-foreground">Manage workspaces, tenant teams, and client invitations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-xl font-bold">Invite Member</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID</label>
              <input type="text" value={inviteOrgId} onChange={e => setInviteOrgId(e.target.value)} required className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role Type</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 border rounded-md">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Invite User</button>
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
                      <p className="font-semibold text-xs text-muted-foreground">Active Team Members:</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {org.membership.map((m) => (
                          <li key={m.id}>User ID: {m.userid} ({m.role})</li>
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
`;
        }
        // 5. Rbac: Admin
        else if (normalizedRoute === 'rbac-admin') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">RBAC Authorization</h1>
        <p className="text-muted-foreground">Enforce permission gates and define granular roles across organization workspaces.</p>
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
                  <p className="text-xs text-muted-foreground">{role.description || 'No description provided.'}</p>
                </div>
                {role.permission && role.permission.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-muted-foreground">Granted Permissions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permission.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-foreground text-background shadow-sm">
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
`;
        }
        // 6. Storage Dashboard
        else if (normalizedRoute === 'storage') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

import React, { useState, useEffect } from 'react';

interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimetype: string;
}

export default function StorageDashboardPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/storage/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus('Uploading...');
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Uploaded successfully!');
        fetchFiles();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Upload failed.');
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, path }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles();
      } else {
        alert('Delete failed: ' + data.error);
      }
    } catch (err: unknown) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">File Storage</h1>
        <p className="text-muted-foreground">Manage your organization's files and documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-xl font-bold">Upload File</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select File</label>
              <input type="file" name="file" required className="w-full text-sm border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID (Optional)</label>
              <input type="text" name="organizationId" className="w-full text-sm border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95 text-sm">
              Upload
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-xl font-bold">Your Files</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="divide-y text-sm">
              {files.map((file) => (
                <div key={file.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {file.mimetype}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(file.id, file.path)} className="text-destructive font-bold hover:underline text-xs">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 7. Notification Center
        else if (normalizedRoute === 'notifications') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

import React, { useState, useEffect } from 'react';

interface SystemNotification {
  id: string;
  title: string;
  channel: string;
  content: string;
  userid: string;
  status: string;
}

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [userId, setUserId] = useState('');
  const [channel, setChannel] = useState('email');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, channel, title, content }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Sent successfully!');
        setTitle('');
        setContent('');
        fetchNotifications();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Send failed.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Manage and dispatch multi-channel communications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">Dispatch Notification</h2>
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block font-medium mb-1">User ID</label>
              <input type="text" value={userId} onChange={e => setUserId(e.target.value)} required className="w-full border rounded p-2 text-sm" placeholder="uuid" />
            </div>
            <div>
              <label className="block font-medium mb-1">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full border rounded p-2 text-sm">
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border rounded p-2 text-sm" placeholder="Subject" />
            </div>
            <div>
              <label className="block font-medium mb-1">Body Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} required rows={3} className="w-full border rounded p-2 text-sm" placeholder="Message content..." />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
              Send Alert
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Inbox Trails</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading inbox...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts dispatched yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 border rounded-lg bg-muted text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base">{notif.title}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-200 text-green-800">
                      {notif.channel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{notif.content}</p>
                  <p className="text-xs text-muted-foreground/80 font-mono">To: {notif.userid} • Status: {notif.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 8. Search Results
        else if (normalizedRoute === 'search') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState } from 'react';

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  desc: string;
}

export default function SearchResultsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setStatus('Searching...');
    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setStatus(data.results.length === 0 ? 'No results found.' : '');
      } else {
        setStatus('Search error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Full-Text Search</h1>
        <p className="text-muted-foreground">Search globally across support tickets and articles.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type keywords (e.g., login, payment, billing)..."
          className="flex-1 border rounded-lg p-3 text-sm bg-card"
          required
        />
        <button type="submit" disabled={loading} className="bg-foreground text-background font-bold px-6 rounded-lg text-sm hover:opacity-95">
          Search
        </button>
      </form>

      {status && <p className="text-sm font-semibold">{status}</p>}

      <div className="space-y-4 text-sm">
        {results.map((item, idx) => (
          <div key={idx} className="p-4 border rounded-xl bg-card hover:bg-muted/50 transition-colors space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-base">{item.title}</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-muted text-muted-foreground">
                {item.type}
              </span>
            </div>
            <p className="text-muted-foreground">{item.desc}</p>
            <p className="text-xs text-muted-foreground/80 font-mono">ID: {item.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
`;
        }
        // 9. Audit Dashboard
        else if (normalizedRoute === 'audit-logs') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        ? \`/api/audit-logs?action=\${encodeURIComponent(actionFilter)}\`
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
        <p className="text-muted-foreground">Trace security incidents, user activity logs, and entity mutations.</p>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <label className="font-semibold">Filter Action:</label>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="border rounded-md p-2 bg-card">
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
                  <td className="p-3 text-muted-foreground">{new Date(log.createdat).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;
        }
        // 10. AI Chat
        else if (normalizedRoute === 'ai/chat') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessageEntry {
  id: string;
  sessionid: string;
  role: string;
  content: string;
}

export default function ChatInterfacePage() {
  const [messages, setMessages] = useState<ChatMessageEntry[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/ai/chat');
      const data = await res.json();
      if (data.success) {
        setMessages((data.data || []).filter((m: ChatMessageEntry) => m.sessionid === sessionId));
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessageEntry = { id: crypto.randomUUID(), sessionid: sessionId, role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setContent('');
    setLoading(true);
    setStatus('AI is thinking...');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: input }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, data.reply]);
        setStatus('');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Message failed to deliver.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 bg-background text-foreground min-h-screen flex flex-col">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">AI Assistant Hub</h1>
        <p className="text-sm text-muted-foreground">Self-service conversational AI assistant configured in your tenant.</p>
      </div>

      <div className="flex-1 border rounded-xl bg-card shadow-sm p-4 overflow-y-auto h-[450px] space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-20">Start a conversation! Type something below.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={\`flex \${m.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
              <div className={\`p-3 rounded-lg text-sm max-w-md shadow-sm \${m.role === 'user' ? 'bg-foreground text-background font-medium' : 'bg-muted text-foreground'}\`}>
                <p className="text-xs font-semibold opacity-70 mb-0.5">{m.role.toUpperCase()}</p>
                <p>{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ask AI anything about organizations, settings, or ticket status..."
          className="flex-1 border rounded-lg p-3 text-sm"
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="bg-foreground text-background font-bold px-6 rounded-lg text-sm hover:opacity-90">
          Send
        </button>
      </form>
      {status && <p className="text-xs text-center text-muted-foreground font-semibold">{status}</p>}
    </div>
  );
}
`;
        }
        // 11. Whiteboard Canvas
        else if (normalizedRoute === 'whiteboard') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        <p className="text-muted-foreground">Collaborate with your organization teams on an infinite canvas whiteboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Canvas Session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Canvas Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded p-2" placeholder="Sprint 2 Design" />
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
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
                    <span className="text-xs text-muted-foreground font-mono">Org: {sess.organizationid}</span>
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
`;
        }
        // 12. Ticket Inbox
        else if (normalizedRoute === 'tickets') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        <p className="text-muted-foreground">Manage and track your customer issue requests in the multi-tenant ticketing system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">File Support Request</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Issue Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border rounded p-2" placeholder="Unable to sync database" />
            </div>
            <div>
              <label className="block font-medium mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border rounded p-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
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
                    <p className="text-xs text-muted-foreground font-mono">Org: {t.organizationid} • Assignee: {t.assigneeid || 'unassigned'}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={\`px-2 py-0.5 text-xs font-bold rounded \${t.priority === 'urgent' ? 'bg-red-200 text-red-800' : t.priority === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}\`}>
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
`;
        }
        // 13. Customer Feedback
        else if (normalizedRoute === 'feedback') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

import React, { useState, useEffect } from 'react';

interface CustomerFeedbackRecord {
  id: string;
  rating: number;
  comment?: string;
  userid: string;
  organizationid: string;
}

export default function FeedbackDashboardPage() {
  const [feedbacks, setFeedbacks] = useState<CustomerFeedbackRecord[]>([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, userId, organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Thank you for your feedback!');
        setComment('');
        fetchFeedbacks();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Submission failed.');
    }
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
    : 'N/A';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Customer Satisfaction (CSAT)</h1>
        <p className="text-muted-foreground">Monitor aggregate metrics and reviews directly from customer survey forms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">Submit Satisfaction Survey</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">CSAT Rating Score (1-5)</label>
              <select value={rating} onChange={e => setRating(e.target.value)} className="w-full border rounded p-2">
                <option value="5">5 ⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">4 ⭐⭐⭐⭐ Good</option>
                <option value="3">3 ⭐⭐⭐ Satisfactory</option>
                <option value="2">2 ⭐⭐ Fair</option>
                <option value="1">1 ⭐ Poor</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Optional Comments</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full border rounded p-2" placeholder="Tell us how we can improve..." />
            </div>
            <div>
              <label className="block font-medium mb-1">User ID</label>
              <input type="text" value={userId} onChange={e => setUserId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
              Submit Review
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-lg font-bold">Survey Analytics</h2>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Average CSAT</p>
              <p className="text-3xl font-extrabold text-blue-600">{avgRating} {avgRating !== 'N/A' && '⭐'}</p>
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading reviews...</p>
          ) : feedbacks.length === 0 ? (
            <p className="text-muted-foreground">No customer surveys submitted yet.</p>
          ) : (
            <div className="space-y-4 divide-y">
              {feedbacks.map((f) => (
                <div key={f.id} className="pt-4 flex gap-4 items-start">
                  <div className="text-2xl font-bold text-yellow-500">{'★'.repeat(f.rating)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-muted-foreground italic">"{f.comment || 'No comment left'}"</p>
                    <p className="text-xs text-muted-foreground/80 font-mono">By: {f.userid} • Org: {f.organizationid}</p>
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
`;
        }
        // 14. Usage Analytics
        else if (normalizedRoute === 'analytics') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

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
        ? \`/api/analytics/metrics?organizationId=\${encodeURIComponent(orgId)}\`
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
        <p className="text-muted-foreground">Monitor performance, system KPIs, and multi-tenant billing consumption.</p>
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
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Total Tracked Metrics</p>
          <p className="text-4xl font-black">{metrics.length}</p>
        </div>
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-2">
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Avg Metric Value</p>
          <p className="text-4xl font-black text-blue-600">
            {metrics.length > 0
              ? (metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length).toFixed(2)
              : '0.00'}
          </p>
        </div>
        <div className="p-5 border rounded-xl bg-card shadow-sm space-y-2">
          <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Status</p>
          <p className="text-4xl font-black text-green-600">Healthy</p>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden text-sm">
        {loading ? (
          <p className="p-6 text-muted-foreground text-center">Loading analytics charts...</p>
        ) : metrics.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">No analytical metrics captured yet.</p>
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
                  <td className="p-3 text-muted-foreground">{new Date(m.createdat).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
`;
        }
        // 15. Help Center (KB)
        else if (normalizedRoute === 'kb') {
          files[`app/${normalizedRoute}/page.tsx`] =
            `"use client";

import React, { useState, useEffect } from 'react';

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  createdat: string;
}

export default function HelpCenterPage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const url = categoryFilter
        ? \`/api/kb/articles?category=\${encodeURIComponent(categoryFilter)}\`
        : '/api/kb/articles';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setArticles(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [categoryFilter]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Help Center & Guides</h1>
        <p className="text-muted-foreground">Search and browse topic documentation to help you get the most out of our SaaS platform.</p>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <label className="font-semibold">Documentation Topic:</label>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-md p-2 bg-card">
          <option value="">All Categories</option>
          <option value="billing">Billing & Pricing</option>
          <option value="organizations">Organizations & Invites</option>
          <option value="security">Security & MFA</option>
          <option value="api">Developer API Guides</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading documentation...</p>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground">No articles matching this category found.</p>
          ) : (
            <div className="space-y-4">
              {articles.map((art) => (
                <div key={art.id} onClick={() => setSelectedArticle(art)} className="p-5 border rounded-xl bg-card hover:bg-muted/30 transition-colors shadow-sm cursor-pointer space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-blue-600 hover:underline">{art.title}</h3>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-muted text-muted-foreground">
                      {art.category.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{art.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-1 p-6 border rounded-xl bg-card shadow-sm h-fit space-y-4">
          {selectedArticle ? (
            <div className="space-y-4">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">
                {selectedArticle.category.toUpperCase()}
              </span>
              <h2 className="text-xl font-bold tracking-tight">{selectedArticle.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {selectedArticle.content}
              </div>
              <hr className="my-4" />
              <p className="text-xs text-muted-foreground/80 font-mono">Published: {new Date(selectedArticle.createdat).toLocaleDateString()}</p>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-semibold">No Guide Selected</p>
              <p className="text-xs mt-1">Click on any documentation article on the left to read its full guide details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 15.5 Workspaces
        else if (normalizedRoute === 'workspaces') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

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
        <p className="text-muted-foreground">Manage isolated team workspace environments in your tenant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Workspace</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Workspace Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded p-2" placeholder="e.g. Marketing" />
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
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
                    <p className="text-xs text-muted-foreground font-mono">Org ID: {w.organizationid}</p>
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
`;
        }
        // 15.6 Projects
        else if (normalizedRoute === 'projects') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

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
        <p className="text-muted-foreground">Manage and organize tasks and files inside workspaces.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Project</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Project Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded p-2" placeholder="e.g. Website Redesign" />
            </div>
            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded p-2" placeholder="Describe the project..." />
            </div>
            <div>
              <label className="block font-medium mb-1">Organization ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <div>
              <label className="block font-medium mb-1">Workspace ID</label>
              <input type="text" value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
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
                  {p.description && <p className="text-muted-foreground text-sm">{p.description}</p>}
                  <p className="text-xs text-muted-foreground font-mono">Workspace: {p.workspaceid} • Org: {p.organizationid}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 15.7 Tasks
        else if (normalizedRoute === 'tasks') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState, useEffect } from 'react';

interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectid: string;
  assigneeid?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusMsg, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating task...');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, projectId, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setTitle('');
        setDescription('');
        fetchTasks();
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
        <h1 className="text-4xl font-extrabold tracking-tight">Tasks Kanban</h1>
        <p className="text-muted-foreground">Manage agile workflows and assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Task</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Task Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border rounded p-2" placeholder="e.g. Design Landing Page" />
            </div>
            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded p-2" placeholder="Describe the task..." />
            </div>
            <div>
              <label className="block font-medium mb-1">Project ID</label>
              <input type="text" value={projectId} onChange={e => setProjectId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <div>
              <label className="block font-medium mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border rounded p-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
              Create Task
            </button>
            {statusMsg && <p className="text-xs text-center font-semibold mt-2">{statusMsg}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Your Tasks</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 border rounded-lg bg-muted text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base">{t.title}</span>
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-200 text-orange-800">
                        {t.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-200 text-blue-800">
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {t.description && <p className="text-muted-foreground">{t.description}</p>}
                  <p className="text-xs text-muted-foreground/80 font-mono">Project ID: {t.projectid}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 15.8 Documents
        else if (normalizedRoute === 'documents') {
          files[`app/${normalizedRoute}/page.tsx`] = `"use client";

import React, { useState, useEffect } from 'react';

interface DocumentRecord {
  id: string;
  title: string;
  content?: string;
  projectid: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating document...');
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: contentBody, projectId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setTitle('');
        setContentBody('');
        fetchDocs();
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
        <h1 className="text-4xl font-extrabold tracking-tight">Collaborative Documents</h1>
        <p className="text-muted-foreground">Draft specs, guides, and internal wiki resources inside your projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Document</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Document Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border rounded p-2" placeholder="e.g. Project Roadmap" />
            </div>
            <div>
              <label className="block font-medium mb-1">Content Body</label>
              <textarea value={contentBody} onChange={e => setContentBody(e.target.value)} rows={5} className="w-full border rounded p-2" placeholder="Write document content..." />
            </div>
            <div>
              <label className="block font-medium mb-1">Project ID</label>
              <input type="text" value={projectId} onChange={e => setProjectId(e.target.value)} required className="w-full border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95">
              Create Document
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Documents List</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents found.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="p-3 border rounded-lg bg-muted cursor-pointer hover:bg-muted/75 transition-colors">
                  <p className="font-bold text-base">{doc.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">Project ID: {doc.projectid}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-1 p-6 border rounded-xl bg-card shadow-sm h-fit">
          {selectedDoc ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">{selectedDoc.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {selectedDoc.content || 'No content inside this document yet.'}
              </div>
              <hr />
              <p className="text-xs text-muted-foreground font-mono">Document ID: {selectedDoc.id}</p>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p className="font-semibold">No Document Selected</p>
              <p className="text-xs mt-1">Select a document from the list on the left to read its full content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;
        }
        // 16. Generic Route Fallback Pages
        else {
          files[`app/${normalizedRoute}/page.tsx`] = `import React from 'react';

/**
 * ${desc}
 * Route: /${normalizedRoute}
 */
export default function ${name}Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-2xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">${name}</h1>
        <p className="text-muted-foreground">${desc}</p>
        <div className="p-4 rounded-md bg-muted text-sm text-muted-foreground font-mono">
          Render slot: ${uiDef.slot || 'none'}
        </div>
      </div>
    </div>
  );
}
`;
        }
      } else {
        files[`components/${componentName}`] = `import React from 'react';

/**
 * ${desc}
 */
export function ${name}() {
  return (
    <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm space-y-2">
      <h3 className="text-lg font-bold">${name}</h3>
      <p className="text-sm text-muted-foreground">${desc}</p>
      <div className="p-2 text-xs bg-muted font-mono rounded">
        Slot: ${uiDef.slot || 'none'}
      </div>
    </div>
  );
}
`;
      }
    }

    return files;
  }
}
