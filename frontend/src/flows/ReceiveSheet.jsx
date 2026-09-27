import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Success } from '../components/ui/Success';
import { receiveMoneyApi } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import { apiError, formatDateTime, inr } from '../lib/format';

const CREDIT_TYPES = [
  { value: CATEGORIES.SALARY, label: 'Salary or income' },
  { value: CATEGORIES.OTHER, label: 'From a person / refund' },
];

export function ReceiveSheet({ user, onClose, onReceived, notify }) {
  const [sender, setSender] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.OTHER);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(user.upiId);
      notify('UPI ID copied');
    } catch {
      notify(user.upiId);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await receiveMoneyApi({
        userId: user.id,
        senderName: sender.trim(),
        amount: Number(amount),
        category,
        note: note.trim(),
      });
      setResult(res.data);
      onReceived();
    } catch (err) {
      setError(apiError(err, 'Could not add the credit.'));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Sheet
        title="Money received"
        onClose={onClose}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        }
      >
        <Success
          title={`Received from ${result.transaction.merchant}`}
          amount={inr(result.transaction.amount)}
          subtitle={formatDateTime(result.transaction.date)}
          details={[
            ['Transaction ID', result.transaction._id || result.transaction.id],
            ['New balance', inr(result.newBalance)],
          ]}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Receive money"
      onClose={onClose}
      footer={
        <button type="submit" form="receive-form" className="btn btn-primary btn-block" disabled={busy || !(Number(amount) > 0) || !sender.trim()}>
          {busy ? 'Adding…' : Number(amount) > 0 ? `Add ${inr(amount)}` : 'Add credit'}
        </button>
      }
    >
      <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={user.name} size={44} />
        <div className="row-main">
          <div className="row-sub">Your UPI ID</div>
          <div style={{ fontWeight: 600 }}>{user.upiId}</div>
        </div>
        <button type="button" className="btn btn-soft btn-sm" onClick={copyUpiId}>
          <Copy size={16} /> Copy
        </button>
      </div>

      <div className="month-label">Simulate an incoming payment</div>
      <form id="receive-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="rcv-from">From</label>
          <input id="rcv-from" className="input" placeholder="Name of sender" value={sender} onChange={(e) => setSender(e.target.value)} maxLength={50} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="rcv-amt">Amount (₹)</label>
            <input
              id="rcv-amt"
              className="input"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rcv-type">Type</label>
            <select id="rcv-type" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CREDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="rcv-note">Note (optional)</label>
          <input id="rcv-note" className="input" placeholder="e.g. Rent share" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} />
        </div>
        {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
      </form>
    </Sheet>
  );
}
