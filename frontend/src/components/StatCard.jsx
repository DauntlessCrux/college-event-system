import React from 'react';

export default function StatCard({ label, value, accent = false }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className={`font-display text-3xl font-semibold mt-1 ${accent ? 'text-accent-dark' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}
