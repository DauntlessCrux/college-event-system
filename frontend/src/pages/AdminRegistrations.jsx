import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';

const STATUS_OPTIONS = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'];

export default function AdminRegistrations() {
  const { id } = useParams();
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [dash, regs] = await Promise.all([
        api.getDashboard(id, token),
        api.listRegistrationsForEvent(id, filter || undefined, token),
      ]);
      setDashboard(dash);
      setRegistrations(regs);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filter]);

  async function handleStatusChange(status) {
    setBusy(true);
    setError('');
    try {
      await api.setEventStatus(id, status, token);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      await api.downloadRegistrationsCsv(id, token);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!dashboard) return <div className="max-w-4xl mx-auto px-4 py-10 text-muted">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{dashboard.event.name}</h1>
          <p className="text-sm text-muted mt-1">Capacity {dashboard.event.capacity}</p>
        </div>

        <select
          value={dashboard.event.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={busy}
          className="border border-line rounded-lg px-3 py-2 text-sm font-medium"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-danger text-sm mt-4">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard label="Student seats" value={`${dashboard.studentSeats.available}/${dashboard.studentSeats.total}`} />
        <StatCard label="Confirmed" value={dashboard.confirmed} accent />
        <StatCard label="Waitlisted" value={dashboard.waitlisted} />
        <StatCard label="Checked in" value={dashboard.checkedIn} accent />
      </div>

      {Object.keys(dashboard.reserved).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(dashboard.reserved).map(([cat, s]) => (
            <span key={cat} className="text-xs bg-surface border border-line rounded-full px-3 py-1 text-muted font-medium">
              {cat}: {s.available}/{s.total} available
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'CONFIRMED', 'WAITLISTED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                filter === s ? 'bg-primary text-white border-primary' : 'border-line text-muted'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="text-sm text-primary font-medium hover:underline">
          Export CSV
        </button>
      </div>

      <div className="mt-4 bg-surface border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg text-muted text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Roll No</th>
              <th className="px-4 py-2 font-medium">Seat</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Checked in</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.registrationId} className="border-t border-line">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 font-mono">{r.rollNo}</td>
                <td className="px-4 py-2 font-mono">{r.seatLabel || '—'}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.checkedIn ? '✓' : '—'}</td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">No registrations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
