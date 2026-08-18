import React from 'react';

export default function Ticket({ ticket }) {
  const { eventName, venue, eventDate, status, seatLabel, qrDataUrl, ticketStatus } = ticket;

  const statusLabel =
    status === 'CONFIRMED'
      ? ticketStatus === 'USED'
        ? 'Checked in'
        : 'Confirmed'
      : status === 'WAITLISTED'
      ? 'Waitlisted'
      : 'Cancelled';

  const statusColor =
    statusLabel === 'Confirmed'
      ? 'text-success'
      : statusLabel === 'Checked in'
      ? 'text-primary'
      : statusLabel === 'Waitlisted'
      ? 'text-amber-600'
      : 'text-danger';

  return (
    <div className="ticket-stub flex flex-col sm:flex-row max-w-2xl">
      <div className="p-6 flex-1">
        <p className="text-xs uppercase tracking-widest text-muted font-medium">Admit one</p>
        <h3 className="font-display font-semibold text-2xl text-ink mt-1">{eventName}</h3>
        <p className="text-sm text-muted mt-1">
          {new Date(eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          {venue ? ` · ${venue}` : ''}
        </p>

        <div className="mt-6 flex items-end gap-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Seat</p>
            <p className="seat-code text-3xl font-bold text-ink">{seatLabel || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Status</p>
            <p className={`font-display font-semibold text-lg ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
      </div>

      <div className="ticket-perforation p-6 flex flex-col items-center justify-center bg-bg sm:w-52">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Entry QR code" className="w-32 h-32 rounded-lg bg-white p-1" />
        ) : (
          <div className="w-32 h-32 rounded-lg bg-line flex items-center justify-center text-center text-xs text-muted p-2">
            {statusLabel === 'Waitlisted' ? "QR issued once you're confirmed" : 'No active QR'}
          </div>
        )}
        <p className="text-xs text-muted mt-2 text-center">Show this at the entrance</p>
      </div>
    </div>
  );
}
