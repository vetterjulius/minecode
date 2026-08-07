'use client';

import React, { useState, useEffect } from 'react';

interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectid: string;
  assigneeid?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusMsg, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating task...');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, projectId, priority }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Created successfully!');
        setTitle('');
        setDescription('');
        fetchTasks();
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
        <h1 className="text-4xl font-extrabold tracking-tight">Tasks Kanban</h1>
        <p className="text-muted-foreground">Manage agile workflows and assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div className="md:col-span-1 p-6 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
          <h2 className="text-lg font-bold">New Task</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border rounded p-2"
                placeholder="e.g. Design Landing Page"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="Describe the task..."
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
            <div>
              <label className="block font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-2 rounded font-bold hover:opacity-95"
            >
              Create Task
            </button>
            {statusMsg && <p className="text-xs text-center font-semibold mt-2">{statusMsg}</p>}
          </form>
        </div>

        <div className="md:col-span-2 p-6 border rounded-xl bg-card space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">Your Tasks</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 border rounded-lg bg-muted text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base">{t.title}</span>
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-200 text-orange-800">
                        {t.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-200 text-blue-800">
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {t.description && <p className="text-muted-foreground">{t.description}</p>}
                  <p className="text-xs text-muted-foreground/80 font-mono">
                    Project ID: {t.projectid}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
