import React from 'react';
import { inr, inrShort } from '../../lib/format';

const W = 640;
const H = 200;
const PAD_Y = 16;

// Projected balance for the next 7 days as an area chart, with a dashed line at the amount
// needed for EMIs. Days that fall below that line are marked. The SVG only draws shapes; all
// text is HTML so it stays readable at any screen and text size.
export function ProjectionChart({ days = [], emiLine = 0 }) {
  if (days.length === 0) return null;
  const n = days.length;
  const values = days.map((d) => d.projectedBalance);
  const max = Math.max(1, emiLine, ...values) * 1.08;
  const min = Math.min(emiLine > 0 ? emiLine : Infinity, ...values);
  const floor = Math.max(0, min - (max - min) * 0.4);
  // Each day sits in the middle of its column, so the HTML labels below line up with the points.
  const x = (i) => ((i + 0.5) / n) * W;
  const y = (v) => PAD_Y + (1 - (v - floor) / Math.max(1, max - floor)) * (H - PAD_Y * 2);

  const line = days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.projectedBalance).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1)},${H} L${x(0)},${H} Z`;
  const emiY = emiLine > 0 ? y(emiLine) : null;
  const anyRisk = days.some((d) => d.status === 'risk');

  return (
    <figure className="chart">
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="proj-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={f * H} y2={f * H} className="chart-grid" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#proj-fill)" />
          <path d={line} className="chart-line" vectorEffect="non-scaling-stroke" />
          {emiY !== null && <line x1="0" x2={W} y1={emiY} y2={emiY} className="chart-threshold" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* Dots are HTML so they stay round when the chart stretches. */}
        {days.map((d, i) => (
          <span
            key={d.day}
            className={`chart-dot ${d.status === 'risk' ? 'risk' : ''}`}
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(d.projectedBalance) / H) * 100}%` }}
          />
        ))}
      </div>
      <div className="chart-cols" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {days.map((d) => (
          <div key={d.day} className={`chart-col ${d.status === 'risk' ? 'risk' : ''}`}>
            <span className="chart-col-value">{inrShort(d.projectedBalance)}</span>
            <span className="chart-col-day">{d.day === 0 ? 'Today' : d.date.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      <figcaption className="chart-legend">
        <span><i className="lg-line" /> Your balance</span>
        {emiY !== null && <span><i className="lg-threshold" /> Needed for EMIs ({inr(emiLine)})</span>}
        {anyRisk && <span><i className="lg-risk" /> Below what EMIs need</span>}
      </figcaption>
      <table className="sr-only">
        <caption>Projected balance for the next 7 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day === 0 ? 'Today' : d.date}</th>
              <td>{inr(d.projectedBalance)}{d.status === 'risk' ? ' (below what EMIs need)' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
