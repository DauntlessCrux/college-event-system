import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api.login(form);
      login(token, user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink">Log in</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-muted">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted">Password</label>
          <input
            type="password"
            required
            className="mt-1 w-full border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          disabled={busy}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-sm text-muted mt-4">
        New student?{' '}
        <Link to="/signup" className="text-primary font-medium">Create an account</Link>
      </p>
    </div>
  );
}
