import React from 'react';
import { inr, inrShort } from '../../lib/format';

// Money in and out for the last six months, side by side. Labels are HTML so they stay readable.
export function TrendBars({ months = [] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.spent, m.income]));
  if (!months.some((m) => m.spent || m.income)) return <div className="empty">No history yet.</div>;
  return (
    <figure className="trend">
      <div className="trend-cols" role="img" aria-label={months.map((m) => `${m.label}: spent ${inr(m.spent)}, received ${inr(m.income)}`).join('; ')}>
        {months.map((m) => (
          <div className="trend-col" key={m.key}>
            <div className="trend-bars">
              <span className="trend-bar in" style={{ height: `${(m.income / max) * 100}%` }} title={`Received ${inr(m.income)}`} />
              <span className="trend-bar out" style={{ height: `${(m.spent / max) * 100}%` }} title={`Spent ${inr(m.spent)}`} />
            </div>
            <span className="trend-value">{m.spent ? inrShort(m.spent) : '—'}</span>
            <span className="trend-label">{m.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="chart-legend">
        <span><i className="lg-in" /> Received</span>
        <span><i className="lg-out" /> Spent (value shown)</span>
      </figcaption>
    </figure>
  );
}
