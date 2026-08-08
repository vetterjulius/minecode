'use client';

import React, { useState, useEffect } from 'react';

interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimetype: string;
}

export default function StorageDashboardPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/storage/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus('Uploading...');
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Uploaded successfully!');
        fetchFiles();
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      setStatus('Upload failed.');
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, path }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles();
      } else {
        alert('Delete failed: ' + data.error);
      }
    } catch (err: unknown) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">File Storage</h1>
        <p className="text-muted-foreground">Manage your organization's files and documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-xl font-bold">Upload File</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select File</label>
              <input
                type="file"
                name="file"
                required
                className="w-full text-sm border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID (Optional)</label>
              <input
                type="text"
                name="organizationId"
                className="w-full text-sm border rounded p-2"
                placeholder="uuid"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95 text-sm"
            >
              Upload
            </button>
            {status && <p className="text-xs text-center font-semibold mt-2">{status}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-xl font-bold">Your Files</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="divide-y text-sm">
              {files.map((file) => (
                <div key={file.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {file.mimetype}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id, file.path)}
                    className="text-destructive font-bold hover:underline text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
