import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { Success } from '../components/ui/Success';
import { payEMIApi } from '../services/api';
import { apiError, bankLabel, dueText, formatDateTime, inr, ordinal } from '../lib/format';

export function PayEmiSheet({ emi, user, account, balance, onClose, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const amount = Number(emi.amount);
  const insufficient = balance < amount;

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await payEMIApi(emi._id || emi.id, user.id);
      setResult(res.data);
      onPaid();
    } catch (err) {
      setError(apiError(err, 'EMI payment failed.'));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Sheet
        title="EMI paid"
        onClose={onClose}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        }
      >
        <Success
          title={`${emi.name} · ${emi.lender}`}
          amount={inr(amount)}
          subtitle={formatDateTime(result.transaction.date)}
          details={[
            ['Transaction ID', result.transaction._id || result.transaction.id],
            ['Installments left', String(result.remainingInstallments)],
            ['Balance after payment', inr(result.newBalance)],
          ]}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Pay EMI"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={busy || insufficient} onClick={pay}>
          {busy ? 'Paying…' : `Pay ${inr(amount)}`}
        </button>
      }
    >
      <dl className="details" style={{ marginTop: 0 }}>
        <div className="detail"><dt>Loan</dt><dd>{emi.name}</dd></div>
        <div className="detail"><dt>Lender</dt><dd>{emi.lender}</dd></div>
        <div className="detail"><dt>Due</dt><dd>{ordinal(emi.dueDay)} of every month · {dueText(emi.daysRemaining)}</dd></div>
        <div className="detail"><dt>Amount</dt><dd>{inr(amount)}</dd></div>
        <div className="detail"><dt>Pay from</dt><dd>{bankLabel(account)}</dd></div>
        <div className="detail"><dt>Balance after</dt><dd>{inr(Math.max(0, balance - amount))}</dd></div>
      </dl>
      {insufficient && (
        <div style={{ marginTop: 14 }}>
          <Alert>Your balance of {inr(balance)} is not enough for this EMI. Add money first.</Alert>
        </div>
      )}
      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
    </Sheet>
  );
}
