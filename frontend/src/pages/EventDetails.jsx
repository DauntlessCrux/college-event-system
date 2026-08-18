import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Ticket from '../components/Ticket';

export default function EventDetails() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function load() {
    try {
      const data = await api.getEvent(id, token);
      setEvent(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegister() {
    setError('');
    setBusy(true);
    try {
      const res = await api.registerForEvent(id, token);
      setResult(res);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your registration for this event?')) return;
    setError('');
    setBusy(true);
    try {
      await api.cancelRegistration(event.myRegistration.id, token);
      setResult(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !event) return <div className="max-w-3xl mx-auto px-4 py-10 text-danger">{error}</div>;
  if (!event) return <div className="max-w-3xl mx-auto px-4 py-10 text-muted">Loading…</div>;

  const student = event.seatBreakdown.STUDENT || { available: 0, total: 0 };
  const myReg = event.myRegistration;
  const canRegister = user?.role === 'STUDENT' && event.status === 'OPEN' && (!myReg || myReg.status === 'CANCELLED');

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/" className="text-sm text-muted hover:text-ink">← Back to events</Link>

      <h1 className="font-display text-3xl font-semibold text-ink mt-3">{event.name}</h1>
      <p className="text-muted mt-1">
        {new Date(event.event_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
        {event.venue ? ` · ${event.venue}` : ''}
      </p>
      {event.description && <p className="text-ink mt-4">{event.description}</p>}

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SeatStat label="Student seats" available={student.available} total={student.total} />
        {Object.entries(event.seatBreakdown)
          .filter(([cat]) => cat !== 'STUDENT')
          .map(([cat, s]) => (
            <SeatStat key={cat} label={cat} available={s.available} total={s.total} muted />
          ))}
      </div>

      {error && <p className="text-danger text-sm mt-4">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">
            {result.status === 'CONFIRMED' ? '🎉 Seat confirmed!' : "You're on the waitlist."}
          </p>
          <Ticket
            ticket={{
              eventName: event.name,
              venue: event.venue,
              eventDate: event.event_date,
              status: result.status,
              seatLabel: result.seatLabel,
              qrDataUrl: result.qrDataUrl,
            }}
          />
        </div>
      )}

      {!result && myReg && myReg.status !== 'CANCELLED' && (
        <div className="mt-6 bg-surface border border-line rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm">
            You are <b>{myReg.status.toLowerCase()}</b> for this event.{' '}
            <Link to="/my-tickets" className="text-primary font-medium">View your ticket →</Link>
          </p>
          <button
            onClick={handleCancel}
            disabled={busy}
            className="text-sm text-danger font-medium hover:underline disabled:opacity-60"
          >
            Cancel registration
          </button>
        </div>
      )}

      {!result && canRegister && (
        <button
          onClick={handleRegister}
          disabled={busy}
          className="mt-6 bg-primary text-white rounded-lg px-6 py-2.5 font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
        >
          {busy ? 'Registering…' : student.available > 0 ? 'Register for this event' : 'Join the waitlist'}
        </button>
      )}

      {user?.role === 'STUDENT' && event.status !== 'OPEN' && !myReg && (
        <p className="mt-6 text-muted text-sm">Registration is not open for this event.</p>
      )}
      {!user && (
        <p className="mt-6 text-muted text-sm">
          <Link to="/login" className="text-primary font-medium">Log in</Link> to register for this event.
        </p>
      )}
    </div>
  );
}

function SeatStat({ label, available, total, muted }) {
  return (
    <div className={`rounded-xl p-3 border ${muted ? 'border-line bg-bg' : 'border-line bg-surface'}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono font-semibold text-ink">{available}/{total}</p>
    </div>
  );
}
