import { BehaviorContext } from '../types.js';

/** Behavior 'auth.login'. */
export function authLogin(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
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

/** Behavior 'auth.logout'. */
export function authLogout(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function POST(_request: Request) {
  const supabase = await createSupabaseServerClient();
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

/** Behavior 'auth.reset-password'. */
export function authResetPassword(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
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

/** Behavior 'organizations.invite'. */
export function organizationsInvite(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { email, organization_id: organizationId, role } = await request.json();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 259200 * 1000).toISOString();

    const { data, error } = await supabase
      .from('invitation')
      .insert({
        organization_id: organizationId,
        email,
        token,
        role: role || 'member',
        expires_at: expiresAt,
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

/** Behavior 'storage.upload'. */
export function storageUpload(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const organizationId = formData.get('organization_id') as string || null;

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
        mime_type: file.type,
        organization_id: organizationId,
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

/** Behavior 'storage.delete'. */
export function storageDelete(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
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

/** Behavior 'notifications.send'. */
export function notificationsSend(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { user_id: userId, channel, title, content } = await request.json();

    if (!userId || !channel || !title || !content) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const status = 'sent';

    const { data, error } = await supabase
      .from('notification')
      .insert({
        user_id: userId,
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

/** Behavior 'search.query'. */
export function searchQuery(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
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

/** Behavior 'ai.chat.post'. */
export function aiChatPost(ctx: BehaviorContext): string {
  return `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { session_id: sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json({ success: false, error: 'Session ID and message content are required' }, { status: 400 });
    }

    const { error: userMsgError } = await supabase
      .from('chat_message')
      .insert({
        session_id: sessionId,
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
      .from('chat_message')
      .insert({
        session_id: sessionId,
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

const rpcRouteHead = (
  ctx: BehaviorContext
) => `import { createSupabaseServerClient } from '${ctx.serverClientImport}';
import { NextResponse } from 'next/server';
`;

const RPC_ERROR = `    if (error) {
      // 42501 is raised by the database function when the caller is not allowed.
      const status = error.code === '42501' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;

/** Behavior 'organizations.create': calls create_organization(), which also makes the caller owner. */
export function organizationsCreate(ctx: BehaviorContext): string {
  return `${rpcRouteHead(ctx)}
/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { name } = await request.json();
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Missing field: name' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('create_organization', { org_name: name.trim() });
${RPC_ERROR}`;
}

/** Behavior 'rbac.change-member-role': calls change_member_role(), which checks rbac.write. */
export function rbacChangeMemberRole(ctx: BehaviorContext): string {
  return `${rpcRouteHead(ctx)}
/**
 * ${ctx.description}
 * Path: /${ctx.routePath}
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { organization_id: organizationId, user_id: userId, role } = await request.json();
    if (!organizationId || !userId || !role) {
      return NextResponse.json(
        { success: false, error: 'organization_id, user_id and role are required' },
        { status: 400 }
      );
    }
    const { data, error } = await supabase.rpc('change_member_role', {
      org_id: organizationId,
      member_user_id: userId,
      new_role: role,
    });
${RPC_ERROR}`;
}
