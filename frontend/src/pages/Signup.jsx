import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({
    name: '', email: '', rollNo: '', department: '', year: '', phone: '', password: '',
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.signup(form);
      setMessage('Account created. Enter the verification code sent to your email.');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.verifyOtp(form.email, otp);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'otp') {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display text-2xl font-semibold text-ink">Verify your email</h1>
        <p className="text-sm text-muted mt-1">{message}</p>
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            required
            placeholder="6-digit code"
            className="w-full border border-line rounded-lg px-3 py-2 tracking-widest font-mono text-center text-lg"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            disabled={busy}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Verify & continue to login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink">Create your student account</h1>
      <form onSubmit={handleSignup} className="mt-6 space-y-3">
        <input required placeholder="Full name" className="w-full border border-line rounded-lg px-3 py-2"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="College email" className="w-full border border-line rounded-lg px-3 py-2"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required placeholder="Roll number" className="w-full border border-line rounded-lg px-3 py-2"
          value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Department" className="border border-line rounded-lg px-3 py-2"
            value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input placeholder="Year" className="border border-line rounded-lg px-3 py-2"
            value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </div>
        <input placeholder="Phone (optional)" className="w-full border border-line rounded-lg px-3 py-2"
          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input required type="password" placeholder="Password" className="w-full border border-line rounded-lg px-3 py-2"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          disabled={busy}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </div>
  );
}
