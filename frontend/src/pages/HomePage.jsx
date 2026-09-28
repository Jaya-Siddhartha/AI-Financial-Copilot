import React from 'react';
import { ArrowDownLeft, ChevronRight, HandCoins, History, Info, Landmark, Send, Volume2, X } from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { StatusChip } from '../components/ui/StatusChip';
import { TransactionRow } from '../components/TransactionRow';
import { dueText, formatShortDate, inr, STATUS_META, statusTone } from '../lib/format';
import { canSpeak, speak } from '../lib/speech';

// EMIs that still need paying this month: late ones first, then by due date.
export function upcomingEmis(emis = []) {
  return emis
    .filter((e) => e.status === 'upcoming' || e.status === 'overdue')
    .sort((a, b) => a.daysRemaining - b.daysRemaining || (b.daysOverdue || 0) - (a.daysOverdue || 0));
}

// Home keeps to what most people need at a glance: how much they can spend, their balance,
// the four common actions, the next EMI and the last few payments. Details live in Insights.
export function HomePage({ data, actions, settings }) {
  const { metrics, aiPrediction, recentTransactions = [] } = data;
  const dueEmis = upcomingEmis(data.emis);
  const nextEmi = dueEmis[0];
  const meta = STATUS_META[metrics.riskStatus] || STATUS_META.SAFE;
  const tone = statusTone(metrics.riskStatus);

  const sentence =
    metrics.riskStatus === 'SAFE'
      ? nextEmi
        ? `${meta.sentence} Next EMI: ${inr(nextEmi.amount)}, ${dueText(nextEmi.daysRemaining, nextEmi)}.`
        : 'All EMIs for this month are paid.'
      : aiPrediction.advice;

  const readAloud = () =>
    speak(`You can safely spend ${inr(metrics.safeToSpend)}. ${sentence} Your balance is ${inr(metrics.currentBalance)}.`);

  return (
    <div className="page">
      {!settings.tourDone && (
        <section className="card tour" aria-labelledby="tour-title">
          <div className="card-head">
            <h2 className="card-title" id="tour-title">Welcome! How this works</h2>
            <button type="button" className="icon-btn" aria-label="Hide these tips" onClick={() => actions.setSettings({ tourDone: true })}>
              <X size={20} />
            </button>
          </div>
          <ol className="tour-steps">
            <li><span><strong>The big number</strong> is money you can spend without missing a loan payment (EMI).</span></li>
            <li><span><strong>Before you pay,</strong> we warn you if the payment puts an EMI at risk.</span></li>
          </ol>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.setSettings({ tourDone: true })}>
            Got it
          </button>
        </section>
      )}

      {nextEmi?.status === 'overdue' && (
        <div className="banner red" role="alert">
          <HandCoins size={22} aria-hidden="true" />
          <div className="banner-text">
            <strong>{nextEmi.name} EMI is {nextEmi.daysOverdue} day{nextEmi.daysOverdue === 1 ? '' : 's'} late.</strong> Pay it now to avoid late fees.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.payEmi(nextEmi)}>Pay now</button>
        </div>
      )}

      <div className="grid-2">
        <div className="col">
          <section className={`hero frame tone-${tone}`} aria-labelledby="hero-label">
            <div className="hero-top">
              <span className="eyebrow" id="hero-label">You can spend safely</span>
              <StatusChip status={metrics.riskStatus} />
            </div>
            <div className="hero-value">{inr(metrics.safeToSpend)}</div>
            <p className="hero-sentence">{sentence}</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.go('insights')}>
                Why this amount? <ChevronRight size={18} />
              </button>
              {canSpeak() && (
                <button type="button" className="btn btn-outline btn-sm" onClick={readAloud}>
                  <Volume2 size={18} /> Read aloud
                </button>
              )}
            </div>
          </section>

          <section className="card balance-card" aria-labelledby="balance-label">
            <div className="balance-row">
              <div>
                <div className="field-label" id="balance-label">Your balance</div>
                <div className="balance-value">{inr(metrics.currentBalance)}</div>
              </div>
              <button type="button" className="btn btn-soft btn-sm" onClick={actions.checkBalance}>
                <Landmark size={18} /> Check with bank
              </button>
            </div>
            <p className="balance-note">
              Worked out from your payments in this app: {inr(metrics.verifiedBalance)} at your last bank check (
              {formatShortDate(metrics.lastBalanceCheckDate)})
              {metrics.debitsSinceCheck > 0 && ` − ${inr(metrics.debitsSinceCheck)} paid`}
              {metrics.creditsSinceCheck > 0 && ` + ${inr(metrics.creditsSinceCheck)} received`} since.
            </p>
            <p className="disclaimer">
              <Info size={18} aria-hidden="true" />
              <span>
                Money taken out or added outside this app (cash withdrawals, bank charges, cheques) is not counted until you tap
                <strong> Check with bank</strong>.
              </span>
            </p>
          </section>

          <section className="tiles tiles-4" aria-label="What would you like to do?">
            <IconTile icon={Send} label="Send money" onClick={() => actions.pay()} primary />
            <IconTile icon={ArrowDownLeft} label="Receive money" onClick={actions.receive} />
            <IconTile icon={HandCoins} label="Pay an EMI" onClick={() => (nextEmi ? actions.payEmi(nextEmi) : actions.go('emis'))} />
            <IconTile icon={History} label="My payments" onClick={() => actions.go('history')} />
          </section>
        </div>

        <div className="col">
          <section className="card" aria-labelledby="emi-title">
            <div className="card-head">
              <h2 className="card-title" id="emi-title">Next EMI</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('emis')}>
                All EMIs <ChevronRight size={18} />
              </button>
            </div>
            {!nextEmi ? (
              <div className="empty">All EMIs are paid for this month.</div>
            ) : (
              <div className="row" style={{ borderBottom: 'none' }}>
                <span className={`icon-circle ${nextEmi.status === 'overdue' ? 'danger' : ''}`}>
                  <HandCoins size={22} strokeWidth={1.8} />
                </span>
                <div className="row-main">
                  <div className="row-title">{nextEmi.name}</div>
                  <div className={`row-sub ${nextEmi.status === 'overdue' ? 'text-danger' : ''}`}>
                    {inr(nextEmi.amount)} · {nextEmi.status === 'overdue' ? '' : 'due '}
                    {dueText(nextEmi.daysRemaining, nextEmi)}
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.payEmi(nextEmi)}>
                  Pay
                </button>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="recent-title">
            <div className="card-head">
              <h2 className="card-title" id="recent-title">Recent payments</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('history')}>
                See all <ChevronRight size={18} />
              </button>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="empty">No payments yet.</div>
            ) : (
              <div className="list">
                {recentTransactions.slice(0, 3).map((tx) => (
                  <TransactionRow key={tx._id || tx.id} tx={tx} onClick={() => actions.openTx(tx)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
