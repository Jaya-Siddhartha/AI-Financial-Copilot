import React, { useState } from 'react';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { simulateSpend } from '../lib/affordability';
import { dueText, inr } from '../lib/format';

export function InsightsPage({ data }) {
  const { metrics, aiPrediction, projected7Days = [], categoryBreakdown = [], forecastHorizons = [], salaryCycle } = data;
  const [spend, setSpend] = useState('');
  const spendNum = Math.min(Number(spend) || 0, metrics.currentBalance);
  const after = simulateSpend(metrics, spendNum);
  const nextEmi = metrics.nextEMI;
  const tone = metrics.riskStatus === 'SAFE' ? 'brand' : metrics.riskStatus === 'CAUTION' ? 'amber' : 'red';

  // Scale bars between just below the lowest and the highest projected balance so that
  // day-to-day changes are visible instead of every bar looking full.
  const projectedValues = projected7Days.map((d) => d.projectedBalance);
  const maxProjected = Math.max(1, ...projectedValues);
  const minProjected = Math.min(maxProjected, ...projectedValues);
  const floor = Math.max(0, minProjected - (maxProjected - minProjected || maxProjected) * 0.5);
  const barHeight = (v) => 8 + ((v - floor) / Math.max(1, maxProjected - floor)) * 92;
  const maxCategory = Math.max(1, ...categoryBreakdown.map((c) => c.amount));

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Insights</h1>
        <p className="page-sub">How much you can spend without putting your EMIs at risk.</p>
      </div>

      <div className="grid-2">
        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Your status</h2>
              <StatusChip status={metrics.riskStatus} />
            </div>
            <p style={{ marginBottom: 12 }}>{aiPrediction.summary}</p>
            <Alert tone={tone}>{aiPrediction.advice}</Alert>
          </section>

          <section className="card">
            <h2 className="card-title">How safe-to-spend is worked out</h2>
            <p className="card-sub" style={{ marginBottom: 8 }}>
              Based on your balance, EMIs due before the next one clears, and your recent daily spending.
            </p>
            <div className="calc-row">
              <span>Current balance</span>
              <span>{inr(metrics.currentBalance)}</span>
            </div>
            <div className="calc-row">
              <span>
                EMIs due
                <div className="muted">{nextEmi ? `Next: ${nextEmi.name}, ${dueText(nextEmi.daysRemaining)}` : 'None this cycle'}</div>
              </span>
              <span>− {inr(metrics.totalUpcomingEMI)}</span>
            </div>
            <div className="calc-row">
              <span>
                Expected daily spending
                <div className="muted">
                  {inr(metrics.dailyBurnRate)}/day × {Math.max(1, nextEmi ? nextEmi.daysRemaining : 10)} days
                </div>
              </span>
              <span>− {inr(metrics.expectedNormalExpenses)}</span>
            </div>
            <div className="calc-row">
              <span>
                Safety buffer
                <div className="muted">Kept aside for surprises</div>
              </span>
              <span>− {inr(metrics.safetyReserve)}</span>
            </div>
            <div className="calc-row calc-total">
              <span>Safe to spend</span>
              <span>{inr(metrics.safeToSpend)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Can I afford it?</h2>
            <p className="card-sub">Try an amount to see how it affects your EMIs. Nothing is paid.</p>
            <div className="input-wrap" style={{ marginTop: 12 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)' }}>₹</span>
              <input
                className="input"
                style={{ paddingLeft: 30 }}
                inputMode="numeric"
                placeholder="Enter amount"
                aria-label="Amount to test"
                value={spend}
                onChange={(e) => setSpend(e.target.value.replace(/\D/g, '').slice(0, 7))}
              />
            </div>
            <input
              type="range"
              className="range"
              min="0"
              max={Math.max(0, Math.floor(metrics.currentBalance))}
              step="500"
              value={spendNum}
              onChange={(e) => setSpend(e.target.value === '0' ? '' : e.target.value)}
              aria-label="Amount slider"
            />
            <div className="compare">
              <div className="forecast-item">
                <div className="summary-stat-label">Safe to spend now</div>
                <div className="summary-stat-value">{inr(metrics.safeToSpend)}</div>
              </div>
              <div className="forecast-item">
                <div className="summary-stat-label">After spending {inr(spendNum)}</div>
                <div className="summary-stat-value">{inr(after.safeToSpend)}</div>
              </div>
            </div>
            {spendNum > 0 && (
              <div style={{ marginTop: 12 }}>
                {after.status === 'HIGH RISK' ? (
                  <Alert>
                    Not recommended. You could fall short by {inr(after.shortfall)} before your next EMI.
                  </Alert>
                ) : after.status === 'CAUTION' ? (
                  <Alert tone="amber">Possible, but your buffer before the next EMI gets thin.</Alert>
                ) : (
                  <Alert tone="green">You can afford this. Your EMIs stay covered.</Alert>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h2 className="card-title">Next 7 days</h2>
            <p className="card-sub">Projected balance at your current spending pace.</p>
            <div className="bars" role="img" aria-label="Projected balance for the next 7 days">
              {projected7Days.map((d) => (
                <div className="bar" key={d.day} title={`${d.date}: ${inr(d.projectedBalance)}`}>
                  <div
                    className={`bar-fill ${d.status === 'risk' ? 'risk' : ''}`}
                    style={{ height: `${barHeight(d.projectedBalance)}%` }}
                  />
                  <span className="bar-label">{d.day === 0 ? 'Today' : d.date.split(' ')[0]}</span>
                  <span className="bar-label" style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                    {Math.round(d.projectedBalance / 1000)}k
                  </span>
                </div>
              ))}
            </div>
            {projected7Days.length > 0 && (
              <p className="muted small" style={{ marginTop: 10 }}>
                Around {inr(projected7Days[projected7Days.length - 1].projectedBalance)} by{' '}
                {projected7Days[projected7Days.length - 1].date}
                {projected7Days.some((d) => d.status === 'risk') ? '. Red bars fall below your EMI amount.' : '.'}
              </p>
            )}
          </section>

          <section className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>Where your money went</h2>
            {categoryBreakdown.length === 0 ? (
              <div className="empty">No spending yet.</div>
            ) : (
              categoryBreakdown.map((c) => (
                <div className="hbar" key={c.category}>
                  <span>{c.category}</span>
                  <span style={{ fontWeight: 600 }}>{inr(c.amount)}</span>
                  <div className="hbar-track">
                    <span style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Outlook</h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              Assumes salary of {inr(salaryCycle.monthlyIncome)} and your current EMIs, rent and spending.
            </p>
            <div className="forecast">
              {forecastHorizons.map((h) => (
                <div className="forecast-item" key={h.horizonDays}>
                  <div className="summary-stat-label">{h.horizonDays} days</div>
                  <div className="summary-stat-value">{inr(h.projectedNetEndingBalance)}</div>
                  <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                    In {inr(h.projectedInflow)} · Out {inr(h.projectedObligations)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
