import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseSearchSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-search';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let hasSearch = false;
    for (const apiDef of plan.api) {
      if (apiDef.path.includes('/api/search')) {
        hasSearch = true;
      }
    }

    if (!hasSearch) return files;

    // API: Search
    files['app/api/search/route.ts'] =
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

    // Execute PostgreSQL trigram / full-text query
    const { data: ticketResults, error: ticketError } = await supabase
      .from('ticket')
      .select('*')
      .ilike('title', \`%\${query}%\`);

    const { data: kbResults, error: kbError } = await supabase
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

    // UI: Results
    files['app/search/page.tsx'] = `import React, { useState } from 'react';

export default function SearchResultsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
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
    } catch (err: any) {
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

      <div className="space-y-4">
        {results.map((item, idx) => (
          <div key={idx} className="p-4 border rounded-xl bg-card hover:bg-muted/50 transition-colors space-y-1 text-sm">
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

    return files;
  }
}
