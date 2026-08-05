import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseAuthSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-auth';

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

      if (fullRoutePath === 'api/auth/login') {
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
    const { email, password } = await request.json();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      } else if (fullRoutePath === 'api/auth/logout') {
        files[`app/${fullRoutePath}/route.ts`] = `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      } else if (fullRoutePath === 'api/auth/reset-password') {
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
    const { email } = await request.json();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: \`\${new URL(request.url).origin}/auth/update-password\`,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Password reset email sent' });
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

        if (normalizedRoute === 'auth/login') {
          files[`app/${normalizedRoute}/page.tsx`] = `import React, { useState } from 'react';

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
    } catch (err: any) {
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
        } else if (normalizedRoute === 'auth/reset-password') {
          files[`app/${normalizedRoute}/page.tsx`] = `import React, { useState } from 'react';

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
    } catch (err: any) {
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
      }
    }

    return files;
  }
}
