import React from 'react';
import {
  ArrowDownLeft,
  CalendarClock,
  ChevronRight,
  HandCoins,
  Landmark,
  PieChart,
  Plus,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { Avatar } from '../components/ui/Avatar';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { MoneySplit } from '../components/ui/MoneySplit';
import { Help } from '../components/ui/Help';
import { TransactionRow } from '../components/TransactionRow';
import { dueText, formatShortDate, inr, STATUS_META, statusTone } from '../lib/format';
import { canSpeak, speak } from '../lib/speech';

// EMIs that still need paying this month: late ones first, then by due date.
export function upcomingEmis(emis = []) {
  return emis
    .filter((e) => e.status === 'upcoming' || e.status === 'overdue')
    .sort((a, b) => a.daysRemaining - b.daysRemaining || (b.daysOverdue || 0) - (a.daysOverdue || 0));
}

export function HomePage({ data, contacts, actions, settings }) {
  const { metrics, aiPrediction, salaryCycle, recentTransactions = [] } = data;
  const dueEmis = upcomingEmis(data.emis);
  const nextEmi = dueEmis[0];
  const lateEmis = dueEmis.filter((e) => e.status === 'overdue');
  const soonEmis = dueEmis.filter((e) => e.status === 'upcoming' && e.daysRemaining <= 3);
  const meta = STATUS_META[metrics.riskStatus] || STATUS_META.SAFE;
  const tone = statusTone(metrics.riskStatus);

  const readAloud = () =>
    speak(
      `You can safely spend ${inr(metrics.safeToSpend)}. Status: ${meta.label}. ${aiPrediction.summary} ${aiPrediction.advice}`
    );

  return (
    <div className="page">
      {!settings.tourDone && (
        <section className="card tour" aria-labelledby="tour-title">
          <div className="card-head">
            <h2 className="card-title" id="tour-title">New here? FinCopilot in 3 steps</h2>
            <button type="button" className="icon-btn" aria-label="Hide these tips" onClick={() => actions.setSettings({ tourDone: true })}>
              <X size={20} />
            </button>
          </div>
          <ol className="tour-steps">
            <li><span><strong>Look at the big number.</strong> It is the money you can spend without missing a loan payment (EMI).</span></li>
            <li><span><strong>Pay as usual.</strong> Before you pay, FinCopilot warns you if the payment puts an EMI at risk.</span></li>
            <li><span><strong>Add your EMIs.</strong> Tell FinCopilot about your loans so it can keep money aside for them.</span></li>
          </ol>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.setSettings({ tourDone: true })}>
            Got it
          </button>
        </section>
      )}

      {lateEmis.map((emi) => (
        <div key={emi._id || emi.id} className="banner red" role="alert">
          <HandCoins size={22} aria-hidden="true" />
          <div className="banner-text">
            <strong>{emi.name} EMI is {emi.daysOverdue} day{emi.daysOverdue === 1 ? '' : 's'} late.</strong> Pay {inr(emi.amount)} now to avoid late fees.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.payEmi(emi)}>Pay now</button>
        </div>
      ))}
      {soonEmis.map((emi) => (
        <div key={emi._id || emi.id} className="banner amber">
          <CalendarClock size={22} aria-hidden="true" />
          <div className="banner-text">
            <strong>{emi.name} EMI of {inr(emi.amount)} is due {dueText(emi.daysRemaining, emi)}.</strong>
          </div>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.payEmi(emi)}>Pay</button>
        </div>
      ))}

      <div className="grid-2">
        <div className="col">
          <section className={`hero frame tone-${tone}`} aria-labelledby="hero-label">
            <div className="hero-top">
              <span className="eyebrow" id="hero-label">Money you can spend safely</span>
              <StatusChip status={metrics.riskStatus} />
            </div>
            <div className="hero-value">{inr(metrics.safeToSpend)}</div>
            <p className="hero-sentence">
              {meta.sentence}{' '}
              {nextEmi
                ? `Next EMI: ${inr(nextEmi.amount)}, ${dueText(nextEmi.daysRemaining, nextEmi)}.`
                : 'No EMIs left to pay this month.'}
            </p>

            <MoneySplit metrics={metrics} />

            <div className="hero-actions">
              {canSpeak() && (
                <button type="button" className="btn btn-outline btn-sm" onClick={readAloud}>
                  <Volume2 size={18} /> Read aloud
                </button>
              )}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.go('insights')}>
                <PieChart size={18} /> See the details
              </button>
            </div>

            <Help label="How is this number worked out?">
              We start with your balance of <strong>{inr(metrics.currentBalance)}</strong>, then keep aside the EMIs you still
              have to pay ({inr(metrics.totalUpcomingEMI)}), what you usually spend each day until the next EMI
              ({inr(metrics.expectedNormalExpenses)}), and a small safety cushion ({inr(metrics.safetyReserve)}). What is left is
              safe to spend.
            </Help>

            <div className="hero-foot">
              <div className="hero-stat">
                <span className="hero-stat-label">Balance</span>
                <span className="hero-stat-value">{inr(metrics.currentBalance)}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-label">EMIs to pay</span>
                <span className="hero-stat-value">{inr(metrics.totalUpcomingEMI)}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-label">Salary</span>
                <span className="hero-stat-value">{dueText(salaryCycle.daysUntilSalary)}</span>
              </div>
            </div>
            <div className="hero-check">
              <span className="muted small">
                Bank balance {inr(metrics.verifiedBalance)}, checked {formatShortDate(metrics.lastBalanceCheckDate)}
              </span>
              <button type="button" className="link-btn" onClick={actions.checkBalance}>
                Check now
              </button>
            </div>
          </section>

          <section className="card" aria-labelledby="actions-title">
            <h2 className="card-title" id="actions-title" style={{ marginBottom: 12 }}>What would you like to do?</h2>
            <div className="tiles">
              <IconTile icon={Send} label="Send money" onClick={() => actions.pay()} primary />
              <IconTile
                icon={HandCoins}
                label="Pay an EMI"
                onClick={() => (nextEmi ? actions.payEmi(nextEmi) : actions.go('emis'))}
              />
              <IconTile icon={ArrowDownLeft} label="Receive / My QR" onClick={actions.receive} />
              <IconTile icon={Landmark} label="Check balance" onClick={actions.checkBalance} />
              <IconTile icon={Plus} label="Add an EMI" onClick={actions.addEmi} />
              <IconTile icon={PieChart} label="My spending" onClick={() => actions.go('insights')} />
            </div>
          </section>

          <section className="card" aria-labelledby="people-title">
            <div className="card-head">
              <h2 className="card-title" id="people-title">Pay someone you know</h2>
              <button type="button" className="link-btn" onClick={() => actions.pay()}>
                New payment <ChevronRight size={18} />
              </button>
            </div>
            <div className="people">
              {contacts.map((c) => (
                <button key={c.phone} type="button" className="person" onClick={() => actions.pay(c)} aria-label={`Pay ${c.name}`}>
                  <Avatar name={c.name} size={52} />
                  <span className="person-name">{c.name.replace(/\s*\(.*\)/, '').split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card" aria-labelledby="insight-title">
            <div className="card-head">
              <h2 className="card-title" id="insight-title">Advice for this month</h2>
            </div>
            <p style={{ marginBottom: 12 }}>{aiPrediction.summary}</p>
            <Alert tone={tone}>{aiPrediction.advice}</Alert>
          </section>

          <section className="card" aria-labelledby="emi-title">
            <div className="card-head">
              <h2 className="card-title" id="emi-title">EMIs to pay</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('emis')}>
                All EMIs <ChevronRight size={18} />
              </button>
            </div>
            {dueEmis.length === 0 ? (
              <div className="empty">All EMIs are paid for this month.</div>
            ) : (
              <div className="list">
                {dueEmis.slice(0, 3).map((emi) => (
                  <div key={emi._id || emi.id} className="row">
                    <span className={`icon-circle ${emi.status === 'overdue' ? 'danger' : ''}`}>
                      <HandCoins size={22} strokeWidth={1.8} />
                    </span>
                    <div className="row-main">
                      <div className="row-title">{emi.name}</div>
                      <div className={`row-sub ${emi.status === 'overdue' ? 'text-danger' : ''}`}>
                        {inr(emi.amount)} · {emi.status === 'overdue' ? '' : 'due '}
                        {dueText(emi.daysRemaining, emi)}
                      </div>
                    </div>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.payEmi(emi)}>
                      Pay
                    </button>
                  </div>
                ))}
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
                {recentTransactions.slice(0, 5).map((tx) => (
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
