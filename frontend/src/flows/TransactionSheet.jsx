import React, { useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { categorize, CREDIT_CATEGORIES, DEBIT_CATEGORIES } from '../lib/categories';
import { errorText, inr } from '../lib/format';

const toInputDate = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Add or edit a transaction. Opening an existing one shows its details with edit and delete.
export function TransactionSheet({ tx, defaultType = 'debit', actions, onClose }) {
  const editing = Boolean(tx);
  const [form, setForm] = useState({
    type: tx?.type || defaultType,
    amount: tx ? String(tx.amount) : '',
    description: tx?.description || '',
    category: tx?.category || '',
    date: toInputDate(tx?.date),
    note: tx?.note || '',
  });
  const [touchedCategory, setTouchedCategory] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const suggested = categorize(form.description, form.type);
  const category = touchedCategory && form.category ? form.category : suggested;
  const categories = form.type === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
  const amount = Number(form.amount);
  const today = toInputDate();

  const save = async (e) => {
    e.preventDefault();
    if (!(amount > 0)) return setError('Enter an amount above ₹0.');
    if (amount > 1e9) return setError('That amount is too large.');
    if (!form.description.trim()) return setError(form.type === 'credit' ? 'Say where the money came from.' : 'Say what it was for.');
    if (form.date > today) return setError('The date cannot be in the future.');
    setBusy(true);
    setError('');
    // Keep the original time when the day is unchanged; new entries on today use the current time.
    const [y, m, d] = form.date.split('-').map(Number);
    const base = tx && toInputDate(tx.date) === form.date ? new Date(tx.date) : form.date === today ? new Date() : new Date(y, m - 1, d, 12);
    const record = {
      ...(tx || {}),
      type: form.type,
      amount: Math.round(amount * 100) / 100,
      description: form.description.trim(),
      category,
      date: base.toISOString(),
      note: form.note.trim(),
      source: tx?.source || 'manual',
    };
    try {
      if (editing) await actions.updateTransaction(record);
      else await actions.addTransaction(record);
      actions.notify(editing ? 'Saved' : `${form.type === 'credit' ? 'Income' : 'Expense'} of ${inr(record.amount)} added`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
    return undefined;
  };

  const remove = () =>
    actions.confirm({
      title: 'Delete this transaction?',
      message: `${tx.description}, ${inr(tx.amount)}. Your balance and insights will update.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await actions.deleteTransaction(tx);
        actions.closeSheet();
        actions.notify('Deleted');
      },
    });

  return (
    <Sheet
      title={editing ? 'Transaction' : form.type === 'credit' ? 'Add income' : 'Add expense'}
      onClose={onClose}
      locked={busy}
      footer={
        <button type="submit" form="tx-form" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <LoaderCircle size={20} className="spin" /> : editing ? 'Save changes' : 'Save'}
        </button>
      }
    >
      <form id="tx-form" onSubmit={save}>
        <div className="segmented big" role="radiogroup" aria-label="Type" style={{ marginBottom: 14 }}>
          <button type="button" role="radio" aria-checked={form.type === 'debit'} className={`seg ${form.type === 'debit' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, type: 'debit' }))}>
            Money out
          </button>
          <button type="button" role="radio" aria-checked={form.type === 'credit'} className={`seg ${form.type === 'credit' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, type: 'credit' }))}>
            Money in
          </button>
        </div>
        <label className="amount-entry">
          <span>₹</span>
          <input
            inputMode="decimal"
            autoFocus={!editing}
            placeholder="0"
            aria-label="Amount"
            style={{ width: `${Math.max(1, form.amount.length) + 0.6}ch` }}
            value={form.amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '');
              if (/^\d{0,9}(\.\d{0,2})?$/.test(v)) setForm((f) => ({ ...f, amount: v }));
            }}
          />
        </label>
        <div className="field">
          <label className="field-label" htmlFor="tx-desc">{form.type === 'credit' ? 'From' : 'What for / paid to'}</label>
          <input id="tx-desc" className="input" maxLength={120} placeholder={form.type === 'credit' ? 'e.g. Salary, Priya' : 'e.g. Swiggy, petrol, rent'} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="tx-cat">Category</label>
            <select id="tx-cat" className="input" value={category} onChange={(e) => { setTouchedCategory(true); setForm((f) => ({ ...f, category: e.target.value })); }}>
              {!categories.includes(category) && <option value={category}>{category}</option>}
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-date">Date</label>
            <input id="tx-date" className="input" type="date" max={today} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="tx-note">Note (optional)</label>
          <input id="tx-note" className="input" maxLength={120} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
        {editing && tx.source !== 'manual' && (
          <p className="muted small">{tx.source === 'statement' ? 'Added from an uploaded statement.' : 'Recorded by EMI autopay.'}</p>
        )}
        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
        {editing && (
          <button type="button" className="btn btn-outline btn-block danger-text" style={{ marginTop: 14 }} onClick={remove} disabled={busy}>
            <Trash2 size={18} /> Delete transaction
          </button>
        )}
      </form>
    </Sheet>
  );
}
