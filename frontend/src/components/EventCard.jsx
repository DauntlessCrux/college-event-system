import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-500',
  OPEN: 'bg-success/10 text-success',
  CLOSED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-danger/10 text-danger',
};

export default function EventCard({ event }) {
  const available = event.studentSeatsAvailable ?? 0;
  const total = event.studentSeatsTotal ?? 0;
  const full = total > 0 && available === 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-surface border border-line rounded-2xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-semibold text-lg text-ink">{event.name}</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[event.status]}`}>
          {event.status}
        </span>
      </div>

      <p className="text-sm text-muted mt-1">
        {new Date(event.event_date).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        {event.venue ? ` · ${event.venue}` : ''}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-sm text-ink">
          {available}/{total} <span className="text-muted">seats left</span>
        </span>
        {full && <span className="text-xs font-medium text-danger">Waitlist only</span>}
      </div>
    </Link>
  );
}
