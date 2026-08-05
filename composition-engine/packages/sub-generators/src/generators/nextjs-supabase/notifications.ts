import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseNotificationsSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-notifications';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let hasNotifications = false;
    for (const apiDef of plan.api) {
      if (apiDef.path.includes('/api/notifications')) {
        hasNotifications = true;
      }
    }

    if (!hasNotifications) return files;

    // API: Send
    files['app/api/notifications/send/route.ts'] =
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

    // Call Resend, Twilio, or Slack Webhook SDK logic here...
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

    // UI: Notification Center
    files['app/notifications/page.tsx'] = `import React, { useState, useEffect } from 'react';

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [channel, setChannel] = useState('email');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications'); // generic GET
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (err: any) {
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
    } catch (err: any) {
      setStatus('Send failed.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Manage and dispatch multi-channel communications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit text-sm">
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

    return files;
  }
}
