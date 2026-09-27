import React, { useEffect, useState } from 'react';
import { Check, Delete, LoaderCircle } from 'lucide-react';
import { Alert } from './Alert';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

// UPI-style PIN entry with an on-screen keypad. Also accepts the physical keyboard.
export function PinPad({ title = 'ENTER 4-DIGIT UPI PIN', summary, error, busy = false, onSubmit }) {
  const [pin, setPin] = useState('');

  // Clear the digits once a submission finishes (a successful one unmounts this screen).
  useEffect(() => {
    if (!busy) setPin('');
  }, [busy]);

  const press = (key) => {
    if (busy) return;
    if (key === 'del') setPin((p) => p.slice(0, -1));
    else if (key === 'ok') {
      if (pin.length === PIN_LENGTH) onSubmit(pin);
    } else setPin((p) => (p.length < PIN_LENGTH ? p + key : p));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('ok');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      {summary}
      <div className="pin-title">{title}</div>
      <div className="pin-dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${i === pin.length ? 'current' : ''}`} />
        ))}
      </div>
      <div className="pin-hint">Demo UPI PIN is 1234</div>
      {error && (
        <div className="pin-error">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="keypad">
        {KEYS.map((key) =>
          key === 'del' ? (
            <button key={key} type="button" className="key" onClick={() => press('del')} aria-label="Delete digit">
              <Delete size={22} />
            </button>
          ) : key === 'ok' ? (
            <button
              key={key}
              type="button"
              className="key key-submit"
              onClick={() => press('ok')}
              disabled={pin.length !== PIN_LENGTH || busy}
              aria-label="Submit PIN"
            >
              {busy ? <LoaderCircle size={22} className="spin" /> : <Check size={22} />}
            </button>
          ) : (
            <button key={key} type="button" className="key" onClick={() => press(key)}>
              {key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
