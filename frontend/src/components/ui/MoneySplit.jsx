import React from 'react';
import { inr } from '../../lib/format';

// One bar that shows where the balance goes: EMIs, everyday spending, a safety cushion, and
// what is left to spend. If the balance does not cover the first three, the gap is shown too.
export function MoneySplit({ metrics }) {
  const balance = Math.max(0, Number(metrics.currentBalance) || 0);
  const parts = [
    { key: 'emi', label: 'Kept for EMIs', value: Number(metrics.totalUpcomingEMI) || 0 },
    { key: 'daily', label: 'Everyday spending until then', value: Number(metrics.expectedNormalExpenses) || 0 },
    { key: 'cushion', label: 'Safety cushion', value: Number(metrics.safetyReserve) || 0 },
    { key: 'safe', label: 'Safe to spend', value: Number(metrics.safeToSpend) || 0 },
  ];
  const needed = parts[0].value + parts[1].value + parts[2].value;
  const short = Math.max(0, needed - balance);
  if (short > 0) parts.push({ key: 'short', label: 'Short by', value: short });
  const total = Math.max(1, balance + short);

  // Fill the bar in order until the balance runs out; anything beyond it is the shortfall.
  let left = balance;
  const segments = parts.map((p) => {
    if (p.key === 'short') return { ...p, shown: p.value };
    const shown = Math.min(p.value, left);
    left -= shown;
    return { ...p, shown };
  });

  return (
    <div className="split">
      <div className="split-bar" role="img" aria-label={segments.map((s) => `${s.label} ${inr(s.value)}`).join(', ')}>
        {segments
          .filter((s) => s.shown > 0)
          .map((s) => (
            <span key={s.key} className={`split-seg ${s.key}`} style={{ width: `${(s.shown / total) * 100}%` }} />
          ))}
      </div>
      <ul className="split-legend">
        {segments.map((s) => (
          <li key={s.key} className={s.key === 'safe' || s.key === 'short' ? 'strong' : ''}>
            <span className={`split-dot ${s.key}`} aria-hidden="true" />
            <span className="split-label">{s.label}</span>
            <span className="split-value">{inr(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
