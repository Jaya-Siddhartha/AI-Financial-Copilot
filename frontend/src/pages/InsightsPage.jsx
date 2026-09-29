import React, { useState } from 'react';
import { ChevronRight, Repeat } from 'lucide-react';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { Help } from '../components/ui/Help';
import { MoneySplit } from '../components/ui/MoneySplit';
import { ProjectionChart } from '../components/charts/ProjectionChart';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { MoneyCalendar } from '../components/charts/MoneyCalendar';
import { TrendBars } from '../components/charts/TrendBars';
import { CreditGauge } from '../components/charts/CreditGauge';
import { GoalsCard } from '../components/GoalsCard';
import { whatIf } from '../lib/engine';
import { suggestions } from '../lib/advisor';
import { dueText, inr, statusTone } from '../lib/format';

const QUICK_TRIES = [500, 2000, 5000, 10000];

export function InsightsPage({ data, analysis: a, credit, engineInput, actions }) {
  const [spend, setSpend] = useState('');
  const amount = Number(spend) || 0;
  const after = amount > 0 && a.hasBalance ? whatIf(engineInput, amount) : null;
  const tone = statusTone(a.status);
  const tips = suggestions({ analysis: a, profile: data.profile, credit });
  const split = {
    currentBalance: a.balance || 0,
    totalUpcomingEMI: a.totalDue,
    expectedNormalExpenses: a.expectedSpend,
    safetyReserve: a.buffer,
    safeToSpend: a.safeToSpend || 0,
  };
  const days = a.nextEmi ? Math.max(1, a.nextEmi.daysRemaining) : 0;

  return (
    <div className="page">
      <div>
        <span className="eyebrow">Insights</span>
        <h1 className="page-title">Your money at a glance</h1>
      </div>

      <div className="grid-2">
        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Safe to spend</h2>
              {a.hasBalance && <StatusChip status={a.status} />}
            </div>
            {!a.hasBalance ? (
              <Alert tone="amber">
                Add your bank balance first.{' '}
                <button type="button" className="link-btn" onClick={actions.updateBalance}>Add balance</button>
              </Alert>
            ) : (
              <>
                <MoneySplit metrics={split} />
                <div className="calc">
                  <div className="calc-row"><span>Your balance</span><span>{inr(a.balance)}</span></div>
                  <div className="calc-row">
                    <span>EMIs due in the next month<span className="calc-note">{a.nextEmi ? `Next: ${a.nextEmi.name}, ${dueText(a.nextEmi.daysRemaining, a.nextEmi)}` : 'None'}</span></span>
                    <span>− {inr(a.totalDue)}</span>
                  </div>
                  <div className="calc-row">
                    <span>Everyday spending until then<span className="calc-note">{a.nextEmi ? `${inr(a.dailySpend)} a day × ${days} day${days === 1 ? '' : 's'}` : 'Not needed: no EMI waiting'}</span></span>
                    <span>− {inr(a.expectedSpend)}</span>
                  </div>
                  <div className="calc-row">
                    <span>Safety buffer<span className="calc-note">{a.buffer ? 'Your choice, set in Settings' : 'Off (you can turn it on in Settings)'}</span></span>
                    <span>− {inr(a.buffer)}</span>
                  </div>
                  <div className="calc-row calc-total"><span>Safe to spend</span><span>{inr(a.safeToSpend)}</span></div>
                </div>
                <Help>
                  "Everyday spending" is what you usually spend in a day ({inr(a.dailySpend)}), from your last {a.daysOfData} days of transactions. Rent, EMIs,
                  savings and one-off payments over {inr(a.oneOffThreshold)} are left out.
                </Help>
              </>
            )}
          </section>

          {a.hasBalance && (
            <section className="card">
              <h2 className="card-title">Next 7 days</h2>
              <p className="card-sub">Your balance if you keep spending like you usually do.</p>
              <ProjectionChart
                days={a.projection.map((p) => ({ day: p.day, date: p.date, projectedBalance: p.balance, status: p.risk ? 'risk' : 'safe' }))}
                emiLine={a.totalDue}
              />
            </section>
          )}

          <section className="card">
            <h2 className="card-title">Can I afford it?</h2>
            <p className="card-sub">Try an amount. Nothing is spent.</p>
            <div className="input-wrap" style={{ marginTop: 12 }}>
              <span className="input-prefix" aria-hidden="true">₹</span>
              <input className="input input-money" inputMode="numeric" placeholder="Type an amount" aria-label="Amount to test" value={spend} onChange={(e) => setSpend(e.target.value.replace(/\D/g, '').slice(0, 8))} />
            </div>
            <div className="quick-amounts">
              {QUICK_TRIES.map((q) => (
                <button key={q} type="button" className="seg" onClick={() => setSpend(String(q))}>{inr(q)}</button>
              ))}
            </div>
            {!a.hasBalance && amount > 0 && <Alert tone="amber">Add your bank balance first so this can be worked out.</Alert>}
            {after && (
              <>
                <div className="compare">
                  <div className="compare-item"><div className="compare-label">Safe to spend now</div><div className="compare-value">{inr(a.safeToSpend)}</div></div>
                  <div className="compare-item"><div className="compare-label">After spending {inr(amount)}</div><div className="compare-value">{inr(after.safeToSpend)}</div></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  {amount > a.balance ? (
                    <Alert>That is more than your balance of {inr(a.balance)}.</Alert>
                  ) : after.status === 'HIGH RISK' ? (
                    <Alert>Not a good idea right now. You could be {inr(after.shortBy)} short for your next EMI.</Alert>
                  ) : amount > a.safeToSpend ? (
                    <Alert tone="amber">Not a good idea right now: that is {inr(amount - a.safeToSpend)} more than you can safely spend, so it would use money kept for {a.totalDue ? 'EMIs, ' : ''}everyday needs or your safety cushion.</Alert>
                  ) : after.status === 'CAUTION' ? (
                    <Alert tone="amber">Possible, but you would have very little spare before your next EMI.</Alert>
                  ) : (
                    <Alert tone="green">Yes, you can afford this. Your EMIs stay covered.</Alert>
                  )}
                </div>
              </>
            )}
          </section>

          <GoalsCard data={data} analysis={a} actions={actions} />

          <section className="card">
            <h2 className="card-title">Things to do</h2>
            <div className="stack" style={{ marginTop: 12 }}>
              {tips.map((t) => (
                <Alert key={t.title} tone={t.tone}>
                  <strong>{t.title}.</strong> {t.text}
                </Alert>
              ))}
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Credit health (estimate)</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('credit')}>
                Real score <ChevronRight size={18} />
              </button>
            </div>
            <CreditGauge credit={credit} />
          </section>

          <section className="card">
            <h2 className="card-title">This month</h2>
            <div className="compare">
              <div className="compare-item"><div className="compare-label">Spent</div><div className="compare-value">{inr(a.month.spent)}</div></div>
              <div className="compare-item"><div className="compare-label">Received</div><div className="compare-value text-green">{inr(a.month.income)}</div></div>
            </div>
            {a.pace && (
              <div style={{ marginTop: 12 }}>
                <Alert tone={a.pace.ahead ? 'amber' : 'green'}>
                  Everyday spending so far: {inr(a.pace.spentSoFar)}. By this date you usually spend about {inr(a.pace.usualByNow)} (about {inr(a.pace.usualMonth)} a month).
                </Alert>
              </div>
            )}
            {a.spikes.map((s) => (
              <div key={s.category} style={{ marginTop: 8 }}>
                <Alert tone="amber">More on {s.category}: {inr(s.thisMonth)} this month against your usual {inr(s.usual)}.</Alert>
              </div>
            ))}
            <h3 className="sub-title">Last 6 months</h3>
            <TrendBars months={a.trend} />
          </section>

          <section className="card">
            <h2 className="card-title">Coming up</h2>
            <p className="card-sub" style={{ marginBottom: 12 }}>EMIs and salary in the next month.</p>
            <MoneyCalendar events={a.events} />
          </section>

          <section className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>Where your money went (30 days)</h2>
            <CategoryDonut items={a.categoryBreakdown} />
          </section>

          <section className="card">
            <h2 className="card-title">Repeating payments</h2>
            <p className="card-sub" style={{ marginBottom: 8 }}>Same payee, similar amount, in 2 or more months.</p>
            {a.recurring.length === 0 ? (
              <div className="empty">None found yet. They show up after 2 months of transactions.</div>
            ) : (
              <div className="list">
                {a.recurring.map((r) => (
                  <div className="row" key={r.name}>
                    <span className="icon-circle"><Repeat size={20} /></span>
                    <div className="row-main">
                      <div className="row-title">{r.label}</div>
                      <div className="row-sub">{r.category} · seen in {r.months} months</div>
                    </div>
                    <div className="row-amount">{inr(r.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
