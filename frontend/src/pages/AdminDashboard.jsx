import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-500',
  OPEN: 'bg-success/10 text-success',
  CLOSED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-danger/10 text-danger',
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listEvents(token).then(setEvents).catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Manage events</h1>
        <Link
          to="/admin/events/new"
          className="bg-primary text-white rounded-lg px-4 py-2 font-medium hover:bg-primary-light transition-colors"
        >
          + New event
        </Link>
      </div>

      {error && <p className="text-danger mt-6">{error}</p>}

      <div className="mt-8 space-y-3">
        {events.map((e) => (
          <Link
            key={e.id}
            to={`/admin/events/${e.id}`}
            className="flex items-center justify-between bg-surface border border-line rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-display font-semibold text-ink">{e.name}</p>
              <p className="text-sm text-muted">
                {new Date(e.event_date).toLocaleDateString()} · Capacity {e.capacity}
              </p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[e.status]}`}>
              {e.status}
            </span>
          </Link>
        ))}

        {events.length === 0 && !error && (
          <div className="border border-dashed border-line rounded-2xl p-10 text-center text-muted">
            No events yet. Create your first one.
          </div>
        )}
      </div>
    </div>
  );
}
