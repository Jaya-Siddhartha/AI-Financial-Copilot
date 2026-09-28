import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { errorText, inr } from '../lib/format';

// "Match with bank": the user types the balance their bank shows. From then on the app adds and
// subtracts transactions from this figure.
export function BalanceSheet({ analysis, actions, onClose }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bank = Number(value);
  const diff = value !== '' && analysis.hasBalance ? Math.round((bank - analysis.balance) * 100) / 100 : null;

  const save = async (e) => {
    e.preventDefault();
    if (value === '' || !(bank >= 0)) return setError('Enter the balance your bank shows.');
    setBusy(true);
    setError('');
    try {
      await actions.saveProfile({ balanceAmount: bank, balanceDate: new Date().toISOString() });
      actions.notify(diff ? `Balance updated. ${inr(Math.abs(diff))} ${diff < 0 ? 'less' : 'more'} than the app had.` : 'Balance saved', 'ok', true);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Sheet
      title={analysis.hasBalance ? 'Match with your bank' : 'Add your bank balance'}
      onClose={onClose}
      locked={busy}
      footer={
        <button type="submit" form="bal-form" className="btn btn-primary btn-block" disabled={busy || value === ''}>
          {busy ? <LoaderCircle size={20} className="spin" /> : 'Save balance'}
        </button>
      }
    >
      <form id="bal-form" onSubmit={save}>
        <p>Open your bank or UPI app, check your balance, and type it here.</p>
        {analysis.hasBalance && (
          <p className="muted small" style={{ marginTop: 6 }}>
            FinCopilot has worked out {inr(analysis.balance)} from your transactions.
          </p>
        )}
        <label className="amount-entry" style={{ marginTop: 12 }}>
          <span>₹</span>
          <input
            inputMode="decimal"
            autoFocus
            placeholder="0"
            aria-label="Bank balance"
            style={{ width: `${Math.max(1, value.length) + 0.6}ch` }}
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '');
              if (/^\d{0,10}(\.\d{0,2})?$/.test(v)) setValue(v);
            }}
          />
        </label>
        {diff !== null && diff !== 0 && (
          <Alert tone="amber">
            That is {inr(Math.abs(diff))} {diff < 0 ? 'less' : 'more'} than the app worked out: probably money {diff < 0 ? 'spent' : 'received'} outside the app (cash, bank charges, another app). Saving makes your bank's figure the new starting point.
          </Alert>
        )}
        {diff === 0 && <Alert tone="green">It matches. Your transactions are all accounted for.</Alert>}
        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
      </form>
    </Sheet>
  );
}
