import React from 'react';

// Half-circle gauge on the 300–900 credit score scale.
export function ScoreGauge({ score, label, tone, caption }) {
  const share = Math.min(1, Math.max(0, (Number(score) - 300) / 600));
  const len = Math.PI * 80;
  return (
    <div className="credit-gauge">
      <svg viewBox="0 0 200 112" aria-hidden="true" focusable="false">
        <path d="M20 100 A80 80 0 0 1 180 100" className="gauge-track" />
        <path d="M20 100 A80 80 0 0 1 180 100" className={`gauge-fill ${tone}`} strokeDasharray={`${share * len} ${len}`} />
      </svg>
      <div className="credit-score" role="img" aria-label={`${score} out of 900, ${label}`}>
        <span className="credit-number">{score}</span>
        <span className={`credit-band ${tone}`}>{label}</span>
        {caption && <span className="credit-caption">{caption}</span>}
      </div>
    </div>
  );
}

// The estimate: gauge plus the factors behind it.
export function CreditGauge({ credit, showGauge = true }) {
  if (!credit) return null;
  return (
    <div className="credit">
      {showGauge && <ScoreGauge score={credit.score} label={credit.label} tone={credit.tone} caption="FinCopilot estimate" />}
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
