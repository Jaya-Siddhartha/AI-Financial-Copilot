import React from 'react';
import { ExternalLink, FileUp, Info, Plus, Trash2 } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Help } from '../components/ui/Help';
import { CreditGauge, ScoreGauge } from '../components/charts/CreditGauge';
import { FREE_REPORT_LINKS, scoreBand } from '../lib/creditReport';
import { formatDay as niceDate } from '../lib/format';

// Your real score (typed in or read from your own credit report) next to FinCopilot's estimate.
export function CreditPage({ data, credit, actions }) {
  const scores = data.creditScores;
  const latest = scores[0];
  const band = latest ? scoreBand(latest.score) : null;
  const previous = scores[1];
  const change = latest && previous ? latest.score - previous.score : null;
  const ageDays = latest ? Math.floor((Date.now() - new Date(`${latest.date}T12:00:00`).getTime()) / 86400000) : null;
  const history = [...scores].reverse().slice(-8);
  const min = Math.min(300, ...history.map((s) => s.score));
  // "14 Sept" under each bar; the year is added only when the history spans more than one year.
  const oneYear = new Set(history.map((s) => s.date.slice(0, 4))).size === 1;
  const barLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', oneYear ? { day: 'numeric', month: 'short' } : { month: 'short', year: '2-digit' });

  const remove = (entry) =>
    actions.confirm({
      title: 'Delete this score?',
      message: `${entry.bureau} ${entry.score} from ${niceDate(entry.date)} will be removed from your history.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await actions.deleteCreditScore(entry);
        actions.closeSheet();
        actions.notify('Score deleted');
      },
    });

  return (
    <div className="page narrow">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Credit score</span>
          <h1 className="page-title">Your credit score</h1>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={actions.addScore}>
          <Plus size={18} /> Add score
        </button>
      </div>

      <section className="card">
        <h2 className="card-title">Your real score</h2>
        {!latest ? (
          <>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              Add your CIBIL (or Experian, Equifax, CRIF) score to keep track of it here. Type it in, or upload the free credit report PDF and FinCopilot reads the score for you.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={actions.addScore}><Plus size={18} /> Type my score</button>
              <button type="button" className="btn btn-outline" onClick={actions.addScore}><FileUp size={18} /> Upload report</button>
            </div>
          </>
        ) : (
          <>
            <ScoreGauge score={latest.score} label={band.label} tone={band.tone} caption={`${latest.bureau} · ${niceDate(latest.date)}`} />
            <p style={{ textAlign: 'center' }}>{band.note}</p>
            {change !== null && (
              <p className={`score-change ${change >= 0 ? 'text-green' : 'text-danger'}`}>
                {change === 0 ? 'Same as last time' : `${change > 0 ? '▲ Up' : '▼ Down'} ${Math.abs(change)} points since ${niceDate(previous.date)}`}
              </p>
            )}
            {ageDays > 180 && (
              <div style={{ marginTop: 10 }}>
                <Alert tone="amber">This score is {Math.round(ageDays / 30)} months old. Download a fresh free report to see where you stand now.</Alert>
              </div>
            )}
          </>
        )}
      </section>

      {history.length > 1 && (
        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 12 }}>Score history</h2>
          <div className="score-bars" role="img" aria-label={history.map((s) => `${niceDate(s.date)}: ${s.score}`).join(', ')}>
            {history.map((s) => (
              <div className="score-bar-col" key={s.id}>
                <span className="score-bar-value">{s.score}</span>
                <span className={`score-bar ${scoreBand(s.score).tone}`} style={{ height: `${((s.score - min) / (900 - min)) * 100}%` }} />
                <span className="score-bar-label">{barLabel(s.date)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {scores.length > 0 && (
        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 8 }}>All scores</h2>
          <div className="list">
            {scores.map((s) => (
              <div className="row" key={s.id}>
                <span className={`score-pill ${scoreBand(s.score).tone}`}>{s.score}</span>
                <div className="row-main">
                  <div className="row-title">{s.bureau}</div>
                  <div className="row-sub">{niceDate(s.date)} · {s.source === 'report' ? 'Read from your report' : 'Typed in'}</div>
                </div>
                <button type="button" className="icon-btn" aria-label={`Delete ${s.bureau} score ${s.score}`} onClick={() => remove(s)}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Get your free credit report</h2>
        <p className="card-sub" style={{ marginBottom: 10 }}>
          By RBI rules, each of the four credit bureaus gives you one free full credit report every year. Download it from their website, then upload the PDF here.
        </p>
        <div className="list">
          {FREE_REPORT_LINKS.map((l) => (
            <a key={l.bureau} className="row link-row" href={l.url} target="_blank" rel="noopener noreferrer">
              <span className="icon-circle"><ExternalLink size={20} /></span>
              <div className="row-main">
                <div className="row-title">{l.bureau}</div>
                <div className="row-sub">{l.note}</div>
              </div>
            </a>
          ))}
        </div>
        <Help label="Why can't FinCopilot fetch my CIBIL score by itself?">
          Credit bureaus only share scores with registered lenders and licensed partners, and only with your consent. Apps like PhonePe or Paytm show a free score because they pay a bureau for a business partnership. FinCopilot has no such partnership and never asks for your PAN, so it lets you bring in your own score or report instead. Your report stays on your device.
        </Help>
      </section>

      <section className="card">
        <h2 className="card-title">FinCopilot estimate</h2>
        <p className="card-sub" style={{ marginBottom: 4 }}>
          <Info size={14} aria-hidden="true" /> Worked out from your EMIs, spending and savings in this app. It is a guide to what helps or hurts your score, not your official score.
        </p>
        <CreditGauge credit={credit} />
      </section>
    </div>
  );
}
