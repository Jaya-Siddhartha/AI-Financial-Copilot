import React from 'react';
import { ArrowDownLeft, HandCoins } from 'lucide-react';
import { inr, shortDate } from '../../lib/format';

const when = (e) => {
  if (e.overdue) return 'Late';
  if (e.daysRemaining === 0) return 'Today';
  if (e.daysRemaining === 1) return 'Tomorrow';
  return `In ${e.daysRemaining} days`;
};

// Money coming in and going out over the next month, in date order.
export function MoneyCalendar({ events = [] }) {
  if (events.length === 0) return <div className="empty">Nothing scheduled.</div>;
  return (
    <ol className="timeline">
      {events.map((e, i) => {
        const incoming = e.type === 'salary';
        const [day, month] = shortDate(e.daysRemaining).split(' ');
        return (
          <li key={`${e.type}-${e.title}-${i}`} className={`timeline-item ${incoming ? 'in' : 'out'} ${e.overdue ? 'late' : ''}`}>
            <div className="timeline-date" aria-hidden="true">
              <span className="timeline-day">{e.overdue ? '!' : day}</span>
              <span className="timeline-month">{e.overdue ? 'LATE' : month}</span>
            </div>
            <div className="timeline-body">
              <div className="row-title">
                {incoming ? <ArrowDownLeft size={16} aria-hidden="true" /> : <HandCoins size={16} aria-hidden="true" />} {e.title}
              </div>
              <div className="row-sub">
                {when(e)} · {incoming ? 'Money in' : 'EMI payment'}
              </div>
            </div>
            <div className={`timeline-amount ${incoming ? 'in' : 'out'}`}>
              {incoming ? '+' : '−'} {inr(e.amount)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
