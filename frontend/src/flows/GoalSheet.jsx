import React, { useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { errorText, todayInput } from '../lib/format';

const digits = (v) => v.replace(/[^0-9]/g, '').slice(0, 9);

// Add or edit a savings goal (e.g. "Emergency fund", "Diwali gifts").
export function GoalSheet({ goal, actions, onClose }) {
  const [form, setForm] = useState({
    name: goal?.name || '',
    target: goal ? String(goal.target) : '',
    saved: goal ? String(goal.saved || '') : '',
    targetDate: goal?.targetDate || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give the goal a name, e.g. "Emergency fund".');
    if (!(Number(form.target) > 0)) return setError('Enter how much you want to save.');
    if (Number(form.saved) > Number(form.target)) return setError('Saved so far cannot be more than the goal.');
    setBusy(true);
    setError('');
    try {
      await actions.saveGoal({ ...(goal ? { id: goal.id } : {}), name: form.name.trim(), target: Number(form.target), saved: Number(form.saved || 0), targetDate: form.targetDate || null });
      actions.notify(goal ? 'Goal saved' : `${form.name.trim()} added`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
    return undefined;
  };

  const remove = () =>
    actions.confirm({
      title: `Delete ${goal.name}?`,
      message: 'The goal will be removed. Your transactions are not affected.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await actions.deleteGoal(goal);
        actions.closeSheet();
        actions.notify('Goal deleted');
      },
    });

  return (
    <Sheet
      title={goal ? 'Edit goal' : 'New savings goal'}
      onClose={onClose}
      locked={busy}
      footer={
        <button type="submit" form="goal-form" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <LoaderCircle size={20} className="spin" /> : 'Save goal'}
        </button>
      }
    >
      <form id="goal-form" onSubmit={save}>
        <div className="field">
          <label className="field-label" htmlFor="goal-name">What are you saving for?</label>
          <input id="goal-name" className="input" maxLength={60} placeholder="e.g. Emergency fund, new phone, Diwali" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus={!goal} />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="goal-target">Goal (₹)</label>
            <input id="goal-target" className="input" inputMode="numeric" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: digits(e.target.value) }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="goal-saved">Saved so far (₹)</label>
            <input id="goal-saved" className="input" inputMode="numeric" value={form.saved} onChange={(e) => setForm((f) => ({ ...f, saved: digits(e.target.value) }))} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="goal-date">By when (optional)</label>
          <input id="goal-date" className="input" type="date" min={todayInput()} value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
        </div>
        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
        {goal && (
          <button type="button" className="btn btn-outline btn-block danger-text" style={{ marginTop: 14 }} onClick={remove} disabled={busy}>
            <Trash2 size={18} /> Delete goal
          </button>
        )}
      </form>
    </Sheet>
  );
}
