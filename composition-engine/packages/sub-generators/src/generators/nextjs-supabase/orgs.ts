import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseOrgsSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-orgs';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    for (const apiDef of plan.api) {
      const normalizedPath = apiDef.path.replace(/^\/+|\/+$/g, '');
      const method = apiDef.method || 'GET';
      const name = apiDef.name;
      const desc = apiDef.description || `Handler for ${name} (${method})`;

      const fullRoutePath = normalizedPath.startsWith('api/')
        ? normalizedPath
        : `api/${normalizedPath}`;

      if (fullRoutePath === 'api/organizations' && method === 'GET') {
        files[`app/${fullRoutePath}/route.ts`] = `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberships, error: memberError } = await supabase
      .from('membership')
      .select('organizationId')
      .eq('userId', user.id);

    if (memberError) throw memberError;

    const orgIds = memberships.map(m => m.organizationId);
    const { data: organizations, error: orgError } = await supabase
      .from('organization')
      .select('*')
      .in('id', orgIds);

    if (orgError) throw orgError;

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      } else if (fullRoutePath === 'api/organizations/invite') {
        files[`app/${fullRoutePath}/route.ts`] = `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { organizationId, email, role } = await request.json();
    const { data: invitation, error } = await supabase
      .from('invitation')
      .insert({
        organizationId,
        email,
        role,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 259200 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: invitation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
    }

    for (const uiDef of plan.ui) {
      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');

        if (normalizedRoute === 'organizations') {
          files[`app/${normalizedRoute}/page.tsx`] = `import React, { useState, useEffect } from 'react';

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
`;
        }
      }
    }

    return files;
  }
}
