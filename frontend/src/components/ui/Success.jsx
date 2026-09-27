import React from 'react';
import { Check } from 'lucide-react';

// Confirmation screen shown after a payment, credit or EMI settlement.
export function Success({ title, amount, subtitle, details = [] }) {
  return (
    <div className="success">
      <div className="success-icon">
        <Check size={38} strokeWidth={3} />
      </div>
      <div className="success-title">{title}</div>
      {amount && <div className="success-amount">{amount}</div>}
      {subtitle && <div className="success-sub">{subtitle}</div>}
      {details.length > 0 && (
        <dl className="details">
          {details.map(([label, value]) => (
            <div className="detail" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
