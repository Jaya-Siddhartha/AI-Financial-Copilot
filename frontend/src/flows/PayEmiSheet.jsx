import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { PinPad } from '../components/ui/PinPad';
import { Success } from '../components/ui/Success';
import { payEMIApi } from '../services/api';
import { apiError, bankLabel, bankName, dueText, formatDateTime, inr, ordinal } from '../lib/format';

// Review → UPI PIN → done. An EMI payment moves money, so it needs the PIN like any payment.
export function PayEmiSheet({ emi, user, account, balance, onClose, onPaid }) {
  const [step, setStep] = useState('review');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const amount = Number(emi.amount);
  const insufficient = balance < amount;
  const overdue = emi.status === 'overdue';

  const pay = async (pin) => {
    setBusy(true);
    setError('');
    try {
      const res = await payEMIApi(emi._id || emi.id, user.id, pin);
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
            ['Months left on this loan', String(result.remainingInstallments)],
            ['Balance after payment', inr(result.newBalance)],
          ]}
        />
      </Sheet>
    );
  }

  if (step === 'pin') {
    return (
      <Sheet title={bankName(account)} onClose={onClose} onBack={() => setStep('review')} locked={busy}>
        <PinPad
          busy={busy}
          error={error}
          onSubmit={pay}
          summary={
            <div className="pin-head">
              <div>
                <div className="muted small">EMI to</div>
                <div className="strong">{emi.lender}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted small">Paying</div>
                <div className="strong">{inr(amount)}</div>
              </div>
            </div>
          }
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Pay EMI"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={insufficient} onClick={() => setStep('pin')}>
          Continue to pay {inr(amount)}
        </button>
      }
    >
      {overdue && (
        <div style={{ marginBottom: 14 }}>
          <Alert>This EMI is {emi.daysOverdue} day{emi.daysOverdue === 1 ? '' : 's'} late. Paying now helps avoid late fees.</Alert>
        </div>
      )}
      <dl className="details" style={{ marginTop: 0 }}>
        <div className="detail"><dt>Loan</dt><dd>{emi.name}</dd></div>
        <div className="detail"><dt>Lender</dt><dd>{emi.lender}</dd></div>
        <div className="detail"><dt>Due</dt><dd>{ordinal(emi.dueDay)} of every month · {dueText(emi.daysRemaining, emi)}</dd></div>
        <div className="detail"><dt>Amount</dt><dd>{inr(amount)}</dd></div>
        <div className="detail"><dt>Pay from</dt><dd>{bankLabel(account)}</dd></div>
        <div className="detail"><dt>Balance after</dt><dd>{inr(Math.max(0, balance - amount))}</dd></div>
      </dl>
      {insufficient && (
        <div style={{ marginTop: 14 }}>
          <Alert>Your balance of {inr(balance)} is not enough for this EMI. Add money first.</Alert>
        </div>
      )}
    </Sheet>
  );
}
