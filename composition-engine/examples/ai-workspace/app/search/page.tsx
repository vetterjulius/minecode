'use client';

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
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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
        <p className="text-muted-foreground">
          Search globally across support tickets and articles.
        </p>
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
        <button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background font-bold px-6 rounded-lg text-sm hover:opacity-95"
        >
          Search
        </button>
      </form>

      {status && <p className="text-sm font-semibold">{status}</p>}

      <div className="space-y-4 text-sm">
        {results.map((item, idx) => (
          <div
            key={idx}
            className="p-4 border rounded-xl bg-card hover:bg-muted/50 transition-colors space-y-1"
          >
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
