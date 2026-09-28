import React from 'react';
import { ArrowDownLeft, Bot, Calculator, ChevronRight, FileUp, HandCoins, Info, Landmark, Minus, Volume2 } from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { TransactionRow } from '../components/TransactionRow';
import { dueText, formatShortDate, inr, STATUS_META, statusTone } from '../lib/format';
import { canSpeak, speak } from '../lib/speech';
import { suggestions } from '../lib/advisor';

export function HomePage({ data, analysis: a, credit, actions }) {
  const { profile, transactions } = data;
  const next = a.nextEmi;
  const meta = STATUS_META[a.status] || STATUS_META.SAFE;
  const tone = statusTone(a.status);
  const tips = suggestions({ analysis: a, profile, credit }).filter((s) => s.tone !== 'green').slice(0, 2);
  const firstName = (profile.fullName || '').split(' ')[0];

  const sentence = !a.hasBalance
    ? 'Add your bank balance to see how much is safe to spend.'
    : a.status === 'SAFE'
      ? next
        ? `${meta.sentence} Next EMI: ${inr(next.amount)}, ${dueText(next.daysRemaining, next)}.`
        : 'No EMIs are waiting to be paid right now.'
      : a.status === 'HIGH RISK'
        ? `You could be ${inr(a.shortBy)} short for your ${next?.name || 'next'} EMI. Hold off on extra spending.`
        : a.overdue.length
          ? `Your ${a.overdue[0].name} EMI is late. Pay it soon.`
          : 'Your EMIs are covered, but only just. Spend carefully.';

  const readAloud = () =>
    speak(
      a.hasBalance
        ? `You can safely spend ${inr(a.safeToSpend)}. ${sentence} Your balance is ${inr(a.balance)}.`
        : sentence
    );

  return (
    <div className="page">
      <div className="greeting">
        <h1 className="page-title">{firstName ? `Hi, ${firstName}` : 'Hello'}</h1>
      </div>

      {a.overdue[0] && (
        <div className="banner red" role="alert">
          <HandCoins size={22} aria-hidden="true" />
          <div className="banner-text">
            <strong>{a.overdue[0].name} EMI is {a.overdue[0].daysOverdue} day{a.overdue[0].daysOverdue === 1 ? '' : 's'} late.</strong> Pay it to avoid late fees.
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.payEmi(a.overdue[0])}>Pay now</button>
        </div>
      )}

      <div className="grid-2">
        <div className="col">
          <section className={`hero frame tone-${tone}`} aria-labelledby="hero-label">
            <div className="hero-top">
              <span className="eyebrow" id="hero-label">You can spend safely</span>
              {a.hasBalance && <StatusChip status={a.status} />}
            </div>
            <div className="hero-value">{a.hasBalance ? inr(a.safeToSpend) : '—'}</div>
            <p className="hero-sentence">{sentence}</p>
            <div className="hero-actions">
              {a.hasBalance ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.go('insights')}>
                  Why this amount? <ChevronRight size={18} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={actions.updateBalance}>
                  <Landmark size={18} /> Add bank balance
                </button>
              )}
              {canSpeak() && (
                <button type="button" className="btn btn-outline btn-sm" onClick={readAloud}>
                  <Volume2 size={18} /> Read aloud
                </button>
              )}
            </div>
          </section>

          {a.hasBalance && (
            <section className="card balance-card" aria-labelledby="balance-label">
              <div className="balance-row">
                <div>
                  <div className="field-label" id="balance-label">Your balance</div>
                  <div className="balance-value">{inr(a.balance)}</div>
                </div>
                <button type="button" className="btn btn-soft btn-sm" onClick={actions.updateBalance}>
                  <Landmark size={18} /> Match with bank
                </button>
              </div>
              <p className="balance-note">
                {a.balanceInfo.debitsSince || a.balanceInfo.creditsSince ? (
                  <>
                    {inr(a.balanceInfo.anchor)} when you last matched it ({formatShortDate(a.balanceInfo.anchorDate)})
                    {a.balanceInfo.debitsSince > 0 && ` − ${inr(a.balanceInfo.debitsSince)} spent`}
                    {a.balanceInfo.creditsSince > 0 && ` + ${inr(a.balanceInfo.creditsSince)} received`} since then.
                  </>
                ) : (
                  <>Matched with your bank on {formatShortDate(a.balanceInfo.anchorDate)}. Nothing added since.</>
                )}
              </p>
              <p className="disclaimer">
                <Info size={18} aria-hidden="true" />
                <span>
                  Worked out from the transactions in this app. Anything you did not add or upload (cash, bank charges, other apps) is not included. Tap <strong>Match with bank</strong> now and then.
                </span>
              </p>
            </section>
          )}

          <section className="tiles tiles-4" aria-label="Quick actions">
            <IconTile icon={Minus} label="Add expense" onClick={() => actions.newTx('debit')} primary />
            <IconTile icon={ArrowDownLeft} label="Add income" onClick={() => actions.newTx('credit')} />
            <IconTile icon={FileUp} label="Upload statements" onClick={actions.upload} />
            <IconTile icon={Calculator} label="EMI calculator" onClick={() => actions.go('emis')} />
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
            {!a.emis.length ? (
              <div className="empty">
                No EMIs added.
                <button type="button" className="btn btn-soft btn-sm" style={{ marginTop: 10 }} onClick={() => actions.editEmi()}>Add an EMI</button>
              </div>
            ) : !next ? (
              <div className="empty">All EMIs are paid for now.</div>
            ) : (
              <div className="row" style={{ borderBottom: 'none' }}>
                <span className={`icon-circle ${next.status === 'overdue' ? 'danger' : ''}`}>
                  <HandCoins size={22} strokeWidth={1.8} />
                </span>
                <div className="row-main">
                  <div className="row-title">{next.name}</div>
                  <div className={`row-sub ${next.status === 'overdue' ? 'text-danger' : ''}`}>
                    {inr(next.amount)} · {next.status === 'overdue' ? '' : 'due '}
                    {dueText(next.daysRemaining, next)}
                    {next.autopay && ' · Autopay'}
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.payEmi(next)}>
                  Paid it
                </button>
              </div>
            )}
          </section>

          {tips.length > 0 && (
            <section className="card" aria-labelledby="tips-title">
              <div className="card-head">
                <h2 className="card-title" id="tips-title">For you</h2>
                <button type="button" className="link-btn" onClick={() => actions.go('assistant')}>
                  <Bot size={18} /> Ask AI
                </button>
              </div>
              <div className="stack">
                {tips.map((t) => (
                  <Alert key={t.title} tone={t.tone}>
                    <strong>{t.title}.</strong> {t.text}
                  </Alert>
                ))}
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="recent-title">
            <div className="card-head">
              <h2 className="card-title" id="recent-title">Recent</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('activity')}>
                See all <ChevronRight size={18} />
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="empty">
                Nothing yet. Add an expense or upload a statement.
                <button type="button" className="btn btn-soft btn-sm" style={{ marginTop: 10 }} onClick={actions.upload}>
                  <FileUp size={18} /> Upload statements
                </button>
              </div>
            ) : (
              <div className="list">
                {transactions.slice(0, 4).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onClick={() => actions.openTx(tx)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
