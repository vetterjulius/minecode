import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseStorageSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-storage';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    let hasStorage = false;
    for (const apiDef of plan.api) {
      if (apiDef.path.includes('/api/storage')) {
        hasStorage = true;
      }
    }

    if (!hasStorage) return files;

    // API: Upload
    files['app/api/storage/upload/route.ts'] =
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

    // Call Supabase Storage API
    const filePath = \`uploads/\${crypto.randomUUID()}_\${file.name}\`;
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Save to File table
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

    // API: Delete
    files['app/api/storage/delete/route.ts'] =
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

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([path]);

    if (storageError) throw storageError;

    // Delete from File table
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

    // UI: Dashboard
    files['app/storage/page.tsx'] = `import React, { useState, useEffect } from 'react';

export default function StorageDashboardPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/storage/files'); // generic API gets list
      const data = await res.json();
      if (data.success) {
        setFiles(data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load files:', err);
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
    } catch (err: any) {
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
    } catch (err: any) {
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
              <input type="file" name="file" required className="w-full text-sm border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization ID (Optional)</label>
              <input type="text" name="organizationId" className="w-full text-sm border rounded p-2" placeholder="uuid" />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95 text-sm">
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
                  <button onClick={() => handleDelete(file.id, file.path)} className="text-destructive font-bold hover:underline text-xs">
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
`;

    return files;
  }
}
