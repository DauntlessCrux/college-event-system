import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminEventForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', venue: '',
    eventDate: '', registrationStart: '', registrationEnd: '',
    totalCapacity: '',
    reserved: { GUEST: '', FACULTY: '', MANAGEMENT: '', ORGANIZER: '' },
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reservedTotal = Object.values(form.reserved).reduce((s, v) => s + (Number(v) || 0), 0);
  const studentSeats = Math.max(0, (Number(form.totalCapacity) || 0) - reservedTotal);

  function setReserved(cat, value) {
    setForm({ ...form, reserved: { ...form.reserved, [cat]: value } });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.createEvent(form, token);
      navigate(`/admin/events/${res.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Create event</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Event name">
          <input required className="w-full border border-line rounded-lg px-3 py-2"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field label="Description">
          <textarea className="w-full border border-line rounded-lg px-3 py-2" rows={3}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        <Field label="Venue">
          <input className="w-full border border-line rounded-lg px-3 py-2"
            value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </Field>

        <Field label="Event date & time">
          <input required type="datetime-local" className="w-full border border-line rounded-lg px-3 py-2"
            value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration opens">
            <input required type="datetime-local" className="w-full border border-line rounded-lg px-3 py-2"
              value={form.registrationStart} onChange={(e) => setForm({ ...form, registrationStart: e.target.value })} />
          </Field>
          <Field label="Registration closes">
            <input required type="datetime-local" className="w-full border border-line rounded-lg px-3 py-2"
              value={form.registrationEnd} onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })} />
          </Field>
        </div>

        <Field label="Total auditorium capacity">
          <input required type="number" min="1" className="w-full border border-line rounded-lg px-3 py-2"
            value={form.totalCapacity} onChange={(e) => setForm({ ...form, totalCapacity: e.target.value })} />
        </Field>

        <div>
          <p className="text-sm text-muted mb-2">Reserved seats (subtracted from student pool)</p>
          <div className="grid grid-cols-2 gap-3">
            {['GUEST', 'FACULTY', 'MANAGEMENT', 'ORGANIZER'].map((cat) => (
              <input
                key={cat}
                type="number"
                min="0"
                placeholder={cat}
                className="border border-line rounded-lg px-3 py-2"
                value={form.reserved[cat]}
                onChange={(e) => setReserved(cat, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="bg-bg border border-line rounded-xl p-3 text-sm">
          Student seats available for registration: <b className="font-mono">{studentSeats}</b>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          disabled={busy}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create event & generate seats'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
