import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseFeedbackSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-customer-feedback';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let hasFeedback = false;
    for (const apiDef of plan.api) {
      if (apiDef.path.includes('/api/feedback')) {
        hasFeedback = true;
      }
    }

    if (!hasFeedback) return files;

    // API: POST create feedback
    files['app/api/feedback/route.ts'] =
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

    // UI: CSAT Dashboard
    files['app/feedback/page.tsx'] = `import React, { useState, useEffect } from 'react';

export default function FeedbackDashboardPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback'); // Generic GET
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data || []);
      }
    } catch (err) {
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
    } catch (err) {
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

    return files;
  }
}
