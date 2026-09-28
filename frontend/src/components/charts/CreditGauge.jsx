import React from 'react';

// Half-circle gauge for the 300–900 credit health estimate, with the factors behind it.
export function CreditGauge({ credit }) {
  if (!credit) return null;
  const share = (credit.score - 300) / 600;
  const r = 80;
  const len = Math.PI * r;
  return (
    <div className="credit">
      <div className="credit-gauge">
        <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
          <path d="M20 100 A80 80 0 0 1 180 100" className="gauge-track" />
          <path d="M20 100 A80 80 0 0 1 180 100" className={`gauge-fill ${credit.tone}`} strokeDasharray={`${share * len} ${len}`} />
        </svg>
        <div className="credit-score">
          <span className="credit-number">{credit.score}</span>
          <span className={`credit-band ${credit.tone}`}>{credit.label}</span>
        </div>
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>
        Out of 900. An estimate from your FinCopilot data{credit.confidence === 'low' ? ' (not much data yet, so treat it as a rough guide)' : ''}. Your real CIBIL score comes from your full credit report.
      </p>
      <ul className="factors">
        {credit.factors.map((f) => (
          <li key={f.name}>
            <div className="factor-head">
              <span className="factor-name">{f.name}</span>
              <span className="factor-weight">{f.weight}%</span>
            </div>
            <div className="progress" aria-label={`${f.name}: ${f.score} out of 100`}>
              <span style={{ width: `${f.score}%` }} className={f.score >= 75 ? '' : f.score >= 50 ? 'warn' : 'bad'} />
            </div>
            <div className="factor-note">{f.note}. {f.tip}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
