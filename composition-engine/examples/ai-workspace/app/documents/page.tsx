'use client';

import React, { useState, useEffect } from 'react';

interface DocumentRecord {
  id: string;
  title: string;
  content?: string;
  projectid: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating document...');
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: contentBody, projectId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setTitle('');
        setContentBody('');
        fetchDocs();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Creation failed.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Collaborative Documents</h1>
        <p className="text-muted-foreground">
          Draft specs, guides, and internal wiki resources inside your projects.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Document</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="e.g. Project Roadmap"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Content Body</label>
              <textarea
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                rows={5}
                className="w-full border rounded p-2"
                placeholder="Write document content..."
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Project ID</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="uuid"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95"
            >
              Create Document
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Documents List</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents found.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="p-3 border rounded-lg bg-muted cursor-pointer hover:bg-muted/75 transition-colors"
                >
                  <p className="font-bold text-base">{doc.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Project ID: {doc.projectid}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-1 p-6 border rounded-xl bg-card shadow-sm h-fit">
          {selectedDoc ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">{selectedDoc.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {selectedDoc.content || 'No content inside this document yet.'}
              </div>
              <hr />
              <p className="text-xs text-muted-foreground font-mono">
                Document ID: {selectedDoc.id}
              </p>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p className="font-semibold">No Document Selected</p>
              <p className="text-xs mt-1">
                Select a document from the list on the left to read its full content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
