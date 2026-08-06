import React, { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending reset email...');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('Reset email sent successfully!');
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form
        onSubmit={handleReset}
        className="max-w-md w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-4"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a password reset link.
        </p>
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
        <button
          type="submit"
          className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90"
        >
          Send Reset Link
        </button>
        {status && <p className="text-center text-sm font-semibold">{status}</p>}
      </form>
    </div>
  );
}
