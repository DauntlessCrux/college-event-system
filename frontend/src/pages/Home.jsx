import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';

export default function Home() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listEvents(token)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Upcoming events</h1>
      <p className="text-muted mt-1">Register early — seats are allotted first-come, first-served.</p>

      {loading && <p className="text-muted mt-8">Loading events…</p>}
      {error && <p className="text-danger mt-8">{error}</p>}

      {!loading && events.length === 0 && (
        <div className="mt-10 border border-dashed border-line rounded-2xl p-10 text-center text-muted">
          No events are open right now. Check back soon.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
