import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { createEMIApi } from '../services/api';
import { apiError } from '../lib/format';

export function AddEmiSheet({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', lender: '', amount: '', dueDay: '', months: '12' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const digits = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/\D/g, '') }));

  const dueDay = Number(form.dueDay);
  const valid = form.name.trim() && Number(form.amount) > 0 && dueDay >= 1 && dueDay <= 31;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      await createEMIApi({
        userId: user.id,
        name: form.name.trim(),
        lender: form.lender.trim(),
        amount: Number(form.amount),
        dueDay,
        remainingInstallments: Number(form.months) || 12,
      });
      onSaved(`${form.name.trim()} added`);
    } catch (err) {
      setError(apiError(err, 'Could not add the EMI.'));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Add an EMI"
      onClose={onClose}
      footer={
        <button type="submit" form="emi-form" className="btn btn-primary btn-block" disabled={!valid || busy}>
          {busy ? 'Saving…' : 'Save EMI'}
        </button>
      }
    >
      <form id="emi-form" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="emi-name">Loan name</label>
          <input id="emi-name" className="input" placeholder="e.g. Car loan" value={form.name} onChange={set('name')} maxLength={40} autoFocus />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="emi-lender">Lender</label>
          <input id="emi-lender" className="input" placeholder="e.g. HDFC Bank" value={form.lender} onChange={set('lender')} maxLength={40} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="emi-amount">Monthly EMI (₹)</label>
            <input id="emi-amount" className="input" inputMode="numeric" placeholder="0" value={form.amount} onChange={digits('amount')} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="emi-day">Due day of month</label>
            <input id="emi-day" className="input" inputMode="numeric" placeholder="1 – 31" maxLength={2} value={form.dueDay} onChange={digits('dueDay')} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="emi-months">Months remaining</label>
          <input id="emi-months" className="input" inputMode="numeric" value={form.months} onChange={digits('months')} maxLength={3} />
          <span className="field-hint">Used to show how much of the loan is left.</span>
        </div>
        {form.dueDay && (dueDay < 1 || dueDay > 31) && (
          <div style={{ marginTop: 14 }}><Alert>Due day must be between 1 and 31.</Alert></div>
        )}
        {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
      </form>
    </Sheet>
  );
}
