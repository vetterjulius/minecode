import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseApiSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-api';

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

      // 1. Auth: Login
      if (fullRoutePath === 'api/auth/login') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
      }
      // 2. Auth: Logout
      else if (fullRoutePath === 'api/auth/logout') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
      }
      // 3. Auth: Reset Password
      else if (fullRoutePath === 'api/auth/reset-password') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
      // 4. Billing: Checkout
      else if (fullRoutePath === 'api/billing/checkout') {
        files[`app/${fullRoutePath}/route.ts`] = `import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(_request: Request) {
  try {
    const checkoutSessionUrl = \`https://checkout.stripe.com/pay/session_mock_\${crypto.randomUUID()}\`;
    return NextResponse.json({ success: true, url: checkoutSessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 5. Billing: Webhook
      else if (fullRoutePath === 'api/billing/webhook') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const payload = await request.json();
    const eventType = payload.type;

    if (eventType === 'checkout.session.completed') {
      const session = payload.data.object;
      const organizationId = session.metadata?.organizationId;
      const stripeCustomerId = session.customer;

      await supabase
        .from('stripecustomer')
        .insert({
          organizationId,
          stripeCustomerId
        });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 6. Orgs: Invite
      else if (fullRoutePath === 'api/organizations/invite') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { email, organizationId, role } = await request.json();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 259200 * 1000).toISOString();

    const { data, error } = await supabase
      .from('invitation')
      .insert({
        organizationid: organizationId,
        email,
        token,
        role: role || 'member',
        expiresat: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, invitation: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 7. Rbac: Roles
      else if (fullRoutePath === 'api/rbac/roles') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('role')
      .select('*, permission(*)');

    if (error) throw error;
    return NextResponse.json({ success: true, roles: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 8. Storage: Upload
      else if (fullRoutePath === 'api/storage/upload') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const organizationId = formData.get('organizationId') as string || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const filePath = \`uploads/\${crypto.randomUUID()}_\${file.name}\`;
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
      .from('file')
      .insert({
        name: file.name,
        path: filePath,
        size: file.size,
        mimetype: file.type,
        organizationid: organizationId,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 9. Storage: Delete
      else if (fullRoutePath === 'api/storage/delete') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { id, path } = await request.json();

    if (!id || !path) {
      return NextResponse.json({ success: false, error: 'Missing ID or path' }, { status: 400 });
    }

    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from('file')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 10. Notifications: Send
      else if (fullRoutePath === 'api/notifications/send') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { userId, channel, title, content } = await request.json();

    if (!userId || !channel || !title || !content) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const status = 'sent';

    const { data, error } = await supabase
      .from('notification')
      .insert({
        userid: userId,
        channel,
        title,
        content,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 11. Search: Search
      else if (fullRoutePath === 'api/search') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    const { data: ticketResults } = await supabase
      .from('ticket')
      .select('*')
      .ilike('title', \`%\${query}%\`);

    const { data: kbResults } = await supabase
      .from('article')
      .select('*')
      .ilike('title', \`%\${query}%\`);

    const results = [
      ...(ticketResults || []).map((t) => ({ id: t.id, type: 'Ticket', title: t.title, desc: \`Status: \${t.status}\` })),
      ...(kbResults || []).map((k) => ({ id: k.id, type: 'Article', title: k.title, desc: k.category })),
    ];

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 12. Audit Logs: Fetch
      else if (fullRoutePath === 'api/audit-logs') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || null;

    let query = supabase
      .from('auditlog')
      .select('*')
      .order('createdat', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 13. AI Chat: Send
      else if (fullRoutePath === 'api/ai/chat') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json({ success: false, error: 'Session ID and message content are required' }, { status: 400 });
    }

    const { error: userMsgError } = await supabase
      .from('chatmessage')
      .insert({
        sessionid: sessionId,
        role: 'user',
        content,
      });

    if (userMsgError) throw userMsgError;

    const replies = [
      "I would be glad to help you with that support request!",
      "I've analyzed your account. It seems your Stripe billing subscription is fully active.",
      "To invite new team members, go to the Organizations page and send an invitation link.",
      "Could you please elaborate on the technical error you are facing in the console?",
      "I can assist you in creating a support ticket! Please specify the priority.",
    ];
    const mockReply = replies[Math.floor(Math.random() * replies.length)];

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chatmessage')
      .insert({
        sessionid: sessionId,
        role: 'assistant',
        content: mockReply,
      })
      .select()
      .single();

    if (assistantMsgError) throw assistantMsgError;

    return NextResponse.json({ success: true, reply: assistantMsg });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 14. Whiteboard: Create
      else if (fullRoutePath === 'api/whiteboards') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { name, organizationId } = await request.json();

    if (!name || !organizationId) {
      return NextResponse.json({ success: false, error: 'Missing name or organizationId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('whiteboardsession')
      .insert({
        name,
        organizationid: organizationId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 15. Tickets: Create
      else if (fullRoutePath === 'api/tickets') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { title, priority, organizationId, assigneeId } = await request.json();

    if (!title || !organizationId) {
      return NextResponse.json({ success: false, error: 'Title and organizationId are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ticket')
      .insert({
        title,
        status: 'open',
        priority: priority || 'medium',
        organizationid: organizationId,
        assigneeid: assigneeId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 16. Feedback: Create
      else if (fullRoutePath === 'api/feedback') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { rating, comment, userId, organizationId } = await request.json();

    if (!rating || !userId || !organizationId) {
      return NextResponse.json({ success: false, error: 'Rating, userId, and organizationId are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        rating: Number(rating),
        comment: comment || null,
        userid: userId,
        organizationid: organizationId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 17. Analytics: Fetch
      else if (fullRoutePath === 'api/analytics/metrics') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || null;

    let query = supabase
      .from('metric')
      .select('*')
      .order('createdat', { ascending: false });

    if (orgId) {
      query = query.eq('organizationid', orgId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 18. KB Articles: Fetch
      else if (fullRoutePath === 'api/kb/articles') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || null;

    let query = supabase
      .from('article')
      .select('*')
      .order('createdat', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 19. Orgs: List / Get (special case)
      else if (fullRoutePath === 'api/organizations' && method === 'GET') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('organization')
      .select('*, membership(*)');

    if (error) throw error;
    return NextResponse.json({ success: true, organizations: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
      // 19.1 Workspaces APIs
      else if (fullRoutePath === 'api/workspaces') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('workspace')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { name, organizationId } = await request.json();

    if (!name || !organizationId) {
      return NextResponse.json({ success: false, error: 'Missing name or organizationId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('workspace')
      .insert({
        id: crypto.randomUUID(),
        name,
        organizationid: organizationId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 19.2 Projects APIs
      else if (fullRoutePath === 'api/projects') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { name, description, organizationId, workspaceId } = await request.json();

    if (!name || !organizationId || !workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing name, organizationId, or workspaceId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('project')
      .insert({
        id: crypto.randomUUID(),
        name,
        description: description || null,
        status: 'active',
        organizationid: organizationId,
        workspaceid: workspaceId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 19.3 Tasks APIs
      else if (fullRoutePath === 'api/tasks') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('task')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { title, description, projectId, priority, assigneeId } = await request.json();

    if (!title || !projectId) {
      return NextResponse.json({ success: false, error: 'Missing title or projectId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task')
      .insert({
        id: crypto.randomUUID(),
        title,
        description: description || null,
        status: 'todo',
        priority: priority || 'medium',
        projectid: projectId,
        assigneeid: assigneeId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 19.4 Documents APIs
      else if (fullRoutePath === 'api/documents') {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('document')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { title, content, projectId } = await request.json();

    if (!title || !projectId) {
      return NextResponse.json({ success: false, error: 'Missing title or projectId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('document')
      .insert({
        id: crypto.randomUUID(),
        title,
        content: content || null,
        projectid: projectId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      }
      // 20. Generic Fallback APIs
      else {
        files[`app/${fullRoutePath}/route.ts`] =
          `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function ${method.toUpperCase()}(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const tableName = '${fullRoutePath.split('/').pop() || 'data'}';
    if ('${method.toUpperCase()}' === 'GET') {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      const body = await request.json();
      const { data, error } = await supabase
        .from(tableName)
        .insert(body)
        .select();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
      }
    }

    return files;
  }
}
