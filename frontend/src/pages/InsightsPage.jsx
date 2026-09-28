import React, { useState } from 'react';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { Help } from '../components/ui/Help';
import { MoneySplit } from '../components/ui/MoneySplit';
import { ProjectionChart } from '../components/charts/ProjectionChart';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { MoneyCalendar } from '../components/charts/MoneyCalendar';
import { simulateSpend } from '../lib/affordability';
import { dueText, inr, statusTone } from '../lib/format';

const QUICK_TRIES = [500, 2000, 5000, 10000];

export function InsightsPage({ data }) {
  const {
    metrics,
    aiPrediction,
    projected7Days = [],
    categoryBreakdown = [],
    forecastHorizons = [],
    timelineEvents = [],
    salaryCycle,
  } = data;
  const [spend, setSpend] = useState('');
  const typed = Number(spend) || 0;
  const overBalance = typed > metrics.currentBalance;
  const spendNum = Math.min(typed, metrics.currentBalance);
  const after = simulateSpend(metrics, spendNum);
  const nextEmi = metrics.nextEMI;
  const tone = statusTone(metrics.riskStatus);
  const days = Math.max(1, nextEmi ? nextEmi.daysRemaining : 10);

  return (
    <div className="page">
      <div>
        <span className="eyebrow">Insights</span>
        <h1 className="page-title">Your money, month ahead</h1>
        <p className="page-sub">How much you can spend without putting your EMIs at risk.</p>
      </div>

      <div className="grid-2">
        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Where you stand</h2>
              <StatusChip status={metrics.riskStatus} />
            </div>
            <p style={{ marginBottom: 12 }}>{aiPrediction.summary}</p>
            <Alert tone={tone}>{aiPrediction.advice}</Alert>
          </section>

          <section className="card">
            <h2 className="card-title">Next 7 days</h2>
            <p className="card-sub">Your balance if you keep spending like you usually do.</p>
            <ProjectionChart days={projected7Days} emiLine={metrics.totalUpcomingEMI} />
            <Help>
              Each point is your expected balance at the end of that day. We take away about {inr(metrics.dailyBurnRate)} a day
              (your usual spending over the last 30 days, not counting one-off payments over {inr(metrics.oneOffThreshold)}, rent
              or EMIs) and any EMI due that day. The dashed line is the money your EMIs need.
              If a point falls below it, you could be short when the EMI is due.
            </Help>
          </section>

          <section className="card">
            <h2 className="card-title">How safe-to-spend is worked out</h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>Simple sum, nothing hidden.</p>
            <MoneySplit metrics={metrics} />
            <div className="calc">
              <div className="calc-row">
                <span>Your balance now</span>
                <span>{inr(metrics.currentBalance)}</span>
              </div>
              <div className="calc-row">
                <span>
                  EMIs still to pay
                  <span className="calc-note">{nextEmi ? `Next: ${nextEmi.name}, ${dueText(nextEmi.daysRemaining, nextEmi)}` : 'None this month'}</span>
                </span>
                <span>− {inr(metrics.totalUpcomingEMI)}</span>
              </div>
              <div className="calc-row">
                <span>
                  Everyday spending until then
                  <span className="calc-note">
                    {nextEmi ? `${inr(metrics.dailyBurnRate)} a day × ${days} day${days === 1 ? '' : 's'}` : 'Not needed: all EMIs are paid'}
                  </span>
                </span>
                <span>− {inr(metrics.expectedNormalExpenses)}</span>
              </div>
              <div className="calc-row">
                <span>
                  Safety cushion
                  <span className="calc-note">{nextEmi ? 'Kept aside for surprises' : 'Not needed: all EMIs are paid'}</span>
                </span>
                <span>− {inr(metrics.safetyReserve)}</span>
              </div>
              <div className="calc-row calc-total">
                <span>Safe to spend</span>
                <span>{inr(metrics.safeToSpend)}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Can I afford it?</h2>
            <p className="card-sub">Try an amount. Nothing is paid.</p>
            <div className="input-wrap" style={{ marginTop: 12 }}>
              <span className="input-prefix" aria-hidden="true">₹</span>
              <input
                className="input input-money"
                inputMode="numeric"
                placeholder="Type an amount"
                aria-label="Amount to test"
                value={spend}
                onChange={(e) => setSpend(e.target.value.replace(/\D/g, '').slice(0, 7))}
              />
            </div>
            <div className="quick-amounts">
              {QUICK_TRIES.map((q) => (
                <button key={q} type="button" className="seg" onClick={() => setSpend(String(q))}>
                  {inr(q)}
                </button>
              ))}
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
              <div className="compare-item">
                <div className="compare-label">Safe to spend now</div>
                <div className="compare-value">{inr(metrics.safeToSpend)}</div>
              </div>
              <div className="compare-item">
                <div className="compare-label">After spending {inr(spendNum)}</div>
                <div className="compare-value">{inr(after.safeToSpend)}</div>
              </div>
            </div>
            {overBalance && (
              <div style={{ marginTop: 12 }}>
                <Alert>That is more than your balance of {inr(metrics.currentBalance)}.</Alert>
              </div>
            )}
            {!overBalance && spendNum > 0 && (
              <div style={{ marginTop: 12 }}>
                {after.status === 'HIGH RISK' ? (
                  <Alert>Not a good idea right now. You could be {inr(after.shortfall)} short for your next EMI.</Alert>
                ) : after.status === 'CAUTION' ? (
                  <Alert tone="amber">Possible, but you would have very little spare before your next EMI.</Alert>
                ) : (
                  <Alert tone="green">Yes, you can afford this. Your EMIs stay covered.</Alert>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h2 className="card-title">Coming up</h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>Money in and out over the next month.</p>
            <MoneyCalendar events={timelineEvents} />
          </section>

          <section className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>Where your money went</h2>
            <CategoryDonut items={categoryBreakdown} />
          </section>

          <section className="card">
            <h2 className="card-title">Looking further ahead</h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              If your salary stays at {inr(salaryCycle.monthlyIncome)} and your EMIs, rent and spending stay the same.
            </p>
            <div className="forecast">
              {forecastHorizons.map((h) => {
                const short = h.projectedNetEndingBalance < 0;
                return (
                  <div className={`forecast-item ${short ? 'short' : ''}`} key={h.horizonDays}>
                    <div className="compare-label">In {h.horizonDays} days</div>
                    <div className="compare-value">
                      {short ? `Short ${inr(Math.abs(h.projectedNetEndingBalance))}` : inr(h.projectedNetEndingBalance)}
                    </div>
                    <div className="forecast-sub">
                      In {inr(h.projectedInflow)} · Out {inr(h.projectedObligations)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
