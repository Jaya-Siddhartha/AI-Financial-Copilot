import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { dueText, errorText, inr, ordinal } from '../lib/format';

// Records that an EMI was paid (the payment itself happens at the bank or by autopay).
export function PayEmiSheet({ emi, analysis, actions, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const low = analysis.hasBalance && analysis.balance < emi.amount;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await actions.recordEmiPayment(emi);
      actions.notify(`${emi.name} EMI of ${inr(emi.amount)} marked as paid`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Mark EMI as paid"
      onClose={onClose}
      locked={busy}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={confirm} disabled={busy}>
          {busy ? <LoaderCircle size={20} className="spin" /> : `Yes, I paid ${inr(emi.amount)}`}
        </button>
      }
    >
      <dl className="details" style={{ marginTop: 0 }}>
        <div className="detail"><dt>Loan</dt><dd>{emi.name}</dd></div>
        {emi.lender && <div className="detail"><dt>Lender</dt><dd>{emi.lender}</dd></div>}
        <div className="detail"><dt>Due</dt><dd>{ordinal(emi.dueDay)} of the month · {dueText(emi.daysRemaining, emi)}</dd></div>
        <div className="detail"><dt>Amount</dt><dd>{inr(emi.amount)}</dd></div>
        {analysis.hasBalance && <div className="detail"><dt>Balance after</dt><dd>{inr(Math.max(0, analysis.balance - emi.amount))}</dd></div>}
      </dl>
      <p className="muted small" style={{ marginTop: 12 }}>
        This adds the EMI to your history and marks this month as paid. It does not send money: pay your lender as usual.
      </p>
      {low && <div style={{ marginTop: 12 }}><Alert tone="amber">Your balance in the app ({inr(analysis.balance)}) is less than this EMI. If you have already paid, update your balance to match your bank.</Alert></div>}
      {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
    </Sheet>
  );
}
