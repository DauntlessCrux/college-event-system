import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Ticket from '../components/Ticket';

export default function MyTicket() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyTickets(token)
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">My tickets</h1>

      {loading && <p className="text-muted mt-8">Loading…</p>}
      {error && <p className="text-danger mt-8">{error}</p>}

      {!loading && tickets.length === 0 && (
        <div className="mt-10 border border-dashed border-line rounded-2xl p-10 text-center text-muted">
          You haven't registered for any events yet.
        </div>
      )}

      <div className="mt-8 space-y-6">
        {tickets.map((t) => (
          <Ticket key={t.registrationId} ticket={t} />
        ))}
      </div>
    </div>
  );
}
