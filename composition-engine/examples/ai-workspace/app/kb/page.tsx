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
        ? `/api/kb/articles?category=${encodeURIComponent(categoryFilter)}`
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
        <p className="text-muted-foreground">
          Search and browse topic documentation to help you get the most out of our SaaS platform.
        </p>
      </div>

      <div className="flex gap-4 items-center text-sm">
        <label className="font-semibold">Documentation Topic:</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-md p-2 bg-card"
        >
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
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="p-5 border rounded-xl bg-card hover:bg-muted/30 transition-colors shadow-sm cursor-pointer space-y-2"
                >
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
              <p className="text-xs text-muted-foreground/80 font-mono">
                Published: {new Date(selectedArticle.createdat).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-semibold">No Guide Selected</p>
              <p className="text-xs mt-1">
                Click on any documentation article on the left to read its full guide details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
