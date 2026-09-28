import React from 'react';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import { dueText, inr, ordinal } from '../lib/format';
import { upcomingEmis } from './HomePage';

const URGENCY_TONE = { critical: 'red', warning: 'amber', normal: 'brand', paid: 'green' };

export function EmisPage({ data, actions }) {
  const emis = [...(data.emis || [])].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const active = emis.filter((e) => e.status !== 'closed');
  const monthlyTotal = active.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const next = upcomingEmis(emis)[0];

  return (
    <div className="page">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">EMIs</span>
          <h1 className="page-title">Your loans</h1>
          <p className="page-sub">FinCopilot keeps money aside for each of these.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={actions.addEmi}>
          <Plus size={18} /> Add EMI
        </button>
      </div>

      <section className="card summary frame">
        <div className="eyebrow">Total EMIs every month</div>
        <div className="summary-value">{inr(monthlyTotal)}</div>
        <div className="summary-stats">
          <div className="summary-stat">
            <div className="summary-stat-label">Active loans</div>
            <div className="summary-stat-value">{active.length}</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-label">Next due</div>
            <div className="summary-stat-value">{next ? dueText(next.daysRemaining, next) : 'None'}</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-label">Still to pay this month</div>
            <div className="summary-stat-value">{inr(data.metrics.totalUpcomingEMI)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        {emis.length === 0 ? (
          <div className="empty">
            No EMIs yet. Add your loans so your safe-to-spend amount accounts for them.
          </div>
        ) : (
          emis.map((emi) => {
            const installments = Number(emi.remainingInstallments) || 0;
            const total = Number(emi.totalLoanAmount) || 0;
            const paidShare = total > 0 ? Math.min(1, Math.max(0, 1 - (installments * Number(emi.amount)) / total)) : 0;
            const isDue = emi.status === 'upcoming' || emi.status === 'overdue';
            return (
              <article className={`emi ${emi.status === 'overdue' ? 'late' : ''}`} key={emi._id || emi.id}>
                <div className="emi-top">
                  <span className={`icon-circle ${emi.status === 'overdue' ? 'danger' : ''}`}>
                    <HandCoins size={22} strokeWidth={1.8} />
                  </span>
                  <div className="row-main">
                    <div className="row-title">{emi.name}</div>
                    <div className="row-sub">
                      {emi.lender} · {ordinal(emi.dueDay)} of every month
                    </div>
                  </div>
                  <span className={`chip ${URGENCY_TONE[emi.urgencyLevel] || 'brand'}`}>{emi.reminderBadge}</span>
                </div>
                <div className="emi-foot">
                  <div className="emi-amount">{inr(emi.amount)}</div>
                  <span className="muted small">
                    {installments} {installments === 1 ? 'month' : 'months'} left
                    {total > 0 && ` · ${Math.round(paidShare * 100)}% repaid`}
                  </span>
                </div>
                {total > 0 && (
                  <div className="progress" aria-label={`${Math.round(paidShare * 100)}% of loan repaid`}>
                    <span style={{ width: `${paidShare * 100}%` }} />
                  </div>
                )}
                <div className="emi-foot">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${emi.name}`}
                    onClick={() => actions.removeEmi(emi)}
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!isDue}
                    onClick={() => actions.payEmi(emi)}
                  >
                    {emi.status === 'paid_this_cycle' ? 'Paid' : emi.status === 'closed' ? 'Closed' : `Pay ${inr(emi.amount)}`}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
