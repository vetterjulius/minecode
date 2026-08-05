import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseAiChatSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-ai-chat';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let hasAiChat = false;
    for (const apiDef of plan.api) {
      if (apiDef.path.includes('/api/ai/chat')) {
        hasAiChat = true;
      }
    }

    if (!hasAiChat) return files;

    // API: POST Chat
    files['app/api/ai/chat/route.ts'] =
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

    // 1. Insert User message
    const { error: userMsgError } = await supabase
      .from('chatmessage')
      .insert({
        sessionid: sessionId,
        role: 'user',
        content,
      });

    if (userMsgError) throw userMsgError;

    // 2. Perform Mock LLM Reply client-side/server-side
    const replies = [
      "I would be glad to help you with that support request!",
      "I've analyzed your account. It seems your Stripe billing subscription is fully active.",
      "To invite new team members, go to the Organizations page and send an invitation link.",
      "Could you please elaborate on the technical error you are facing in the console?",
      "I can assist you in creating a support ticket! Please specify the priority.",
    ];
    const mockReply = replies[Math.floor(Math.random() * replies.length)];

    // 3. Insert Assistant message
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

    // UI: Interactive chat
    files['app/ai/chat/page.tsx'] = `import React, { useState, useEffect, useRef } from 'react';

export default function ChatInterfacePage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/ai/chat'); // Generic fallback to load history
      const data = await res.json();
      if (data.success) {
        setMessages((data.data || []).filter((m: any) => m.sessionid === sessionId));
      }
    } catch (err) {
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

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: input };
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
    } catch (err: any) {
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

    return files;
  }
}
