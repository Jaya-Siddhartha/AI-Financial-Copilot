import React from 'react';
import { inr } from '../../lib/format';

// Up to five biggest categories get their own colour; the rest are grouped as "Everything else".
const MAX_SLICES = 5;

// Spending by category as a donut, with a plain list (name, amount, share) next to it.
export function CategoryDonut({ items = [] }) {
  const total = items.reduce((sum, c) => sum + c.amount, 0);
  if (total <= 0) return <div className="empty">No spending in the last 30 days.</div>;

  const top = items.slice(0, MAX_SLICES);
  const rest = items.slice(MAX_SLICES).reduce((sum, c) => sum + c.amount, 0);
  const slices = rest > 0 ? [...top, { category: 'Everything else', amount: rest }] : top;

  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut">
      <div className="donut-figure">
        <svg viewBox="0 0 180 180" className="donut-svg" aria-hidden="true" focusable="false">
          <circle cx="90" cy="90" r={r} className="donut-track" />
          {slices.map((s, i) => {
            const len = (s.amount / total) * c;
            const el = (
              <circle
                key={s.category}
                cx="90"
                cy="90"
                r={r}
                className={`donut-slice s${i}`}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 90 90)"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-total">{inr(total)}</span>
          <span className="donut-caption">spent in 30 days</span>
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((s, i) => (
          <li key={s.category}>
            <span className={`donut-dot s${i}`} aria-hidden="true" />
            <span className="donut-name">{s.category}</span>
            <span className="donut-amt">{inr(s.amount)}</span>
            <span className="donut-pct">{Math.round((s.amount / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
