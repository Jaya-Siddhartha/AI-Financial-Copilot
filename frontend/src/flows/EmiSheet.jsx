import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { errorText, inr } from '../lib/format';

const digits = (v, max = 9) => v.replace(/[^0-9]/g, '').slice(0, max);

// Add or edit an EMI. `prefill` comes from the EMI calculator.
export function EmiSheet({ emi, prefill, actions, onClose }) {
  const src = emi || prefill || {};
  const [form, setForm] = useState({
    name: emi?.name || '',
    lender: emi?.lender || '',
    amount: src.amount ? String(Math.round(src.amount)) : '',
    dueDay: emi?.dueDay ? String(emi.dueDay) : '',
    remainingMonths: src.remainingMonths !== undefined && src.remainingMonths !== null ? String(src.remainingMonths) : '12',
    totalMonths: src.totalMonths ? String(src.totalMonths) : '',
    autopay: emi?.autopay ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, max) => (e) => setForm((f) => ({ ...f, [k]: max ? digits(e.target.value, max) : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const dueDay = Number(form.dueDay);
    const remaining = Number(form.remainingMonths);
    const total = form.totalMonths ? Number(form.totalMonths) : null;
    if (!form.name.trim()) return setError('Give the loan a name, e.g. "Car loan".');
    if (!(amount > 0)) return setError('Enter the monthly EMI amount.');
    if (!(dueDay >= 1 && dueDay <= 31)) return setError('Due day must be between 1 and 31.');
    if (!(remaining >= 0 && remaining <= 600)) return setError('Months left must be between 0 and 600.');
    if (total !== null && (total < remaining || total > 600)) return setError('Total months must be at least the months left (and at most 600).');
    setBusy(true);
    setError('');
    try {
      await actions.saveEmi({
        ...(emi ? { id: emi.id } : {}),
        name: form.name.trim(),
        lender: form.lender.trim(),
        amount,
        dueDay,
        remainingMonths: remaining,
        totalMonths: total,
        autopay: form.autopay,
        ...(prefill && !emi ? { principal: prefill.principal, interestRate: prefill.interestRate } : {}),
      });
      actions.notify(emi ? 'EMI saved' : `${form.name.trim()} added`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Sheet
      title={emi ? 'Edit EMI' : 'Add an EMI'}
      onClose={onClose}
      locked={busy}
      footer={
        <button type="submit" form="emi-form" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <LoaderCircle size={20} className="spin" /> : 'Save EMI'}
        </button>
      }
    >
      <form id="emi-form" onSubmit={save}>
        <div className="field">
          <label className="field-label" htmlFor="emi-name">Loan name</label>
          <input id="emi-name" className="input" maxLength={60} placeholder="e.g. Car loan, Phone EMI" value={form.name} onChange={set('name')} autoFocus={!emi} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="emi-lender">Bank or lender (optional)</label>
          <input id="emi-lender" className="input" maxLength={60} placeholder="e.g. HDFC Bank, Bajaj Finance" value={form.lender} onChange={set('lender')} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="emi-amount">Monthly EMI (₹)</label>
            <input id="emi-amount" className="input" inputMode="numeric" value={form.amount} onChange={set('amount', 9)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="emi-day">Due on day</label>
            <input id="emi-day" className="input" inputMode="numeric" placeholder="1 – 31" value={form.dueDay} onChange={set('dueDay', 2)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="emi-left">Months left</label>
            <input id="emi-left" className="input" inputMode="numeric" value={form.remainingMonths} onChange={set('remainingMonths', 3)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="emi-total">Total months (optional)</label>
            <input id="emi-total" className="input" inputMode="numeric" value={form.totalMonths} onChange={set('totalMonths', 3)} />
          </div>
        </div>
        <label className="switch" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={form.autopay} onChange={(e) => setForm((f) => ({ ...f, autopay: e.target.checked }))} />
          <span className="switch-ui" aria-hidden="true" />
          <span>Autopay: record it as paid automatically on the due date</span>
        </label>
        {Number(form.amount) > 0 && Number(form.remainingMonths) > 0 && (
          <p className="muted small" style={{ marginTop: 10 }}>
            Still to pay on this loan: {inr(Number(form.amount) * Number(form.remainingMonths))}.
          </p>
        )}
        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
      </form>
    </Sheet>
  );
}
