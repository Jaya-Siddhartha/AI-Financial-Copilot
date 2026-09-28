import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { errorText } from '../lib/format';

// Confirmation dialog. Optional second choice (onSecondary) and optional typed confirmation
// (requireText) for actions that cannot be undone.
export function ConfirmSheet({ title, message, confirmLabel, secondaryLabel, danger, requireText, onConfirm, onSecondary, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      locked={busy}
      footer={
        <div className="stack">
          <div className="btn-row">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              type="button"
              className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => run(onConfirm)}
              disabled={busy || (requireText && typed !== requireText)}
            >
              {busy ? 'Please wait…' : confirmLabel}
            </button>
          </div>
          {secondaryLabel && (
            <button type="button" className="btn btn-outline btn-block" onClick={() => run(onSecondary)} disabled={busy}>
              {secondaryLabel}
            </button>
          )}
        </div>
      }
    >
      <p>{message}</p>
      {requireText && (
        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="confirm-text">Type {requireText} to confirm</label>
          <input id="confirm-text" className="input" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} autoComplete="off" />
        </div>
      )}
      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
    </Sheet>
  );
}
