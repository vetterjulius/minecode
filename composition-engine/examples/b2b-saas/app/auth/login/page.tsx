import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Logging in...');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Logged in successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form
        onSubmit={handleLogin}
        className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">Login</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90"
        >
          Sign In
        </button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
