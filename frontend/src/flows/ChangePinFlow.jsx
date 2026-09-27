import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { PinPad } from '../components/ui/PinPad';
import { Success } from '../components/ui/Success';
import { updateUpiPinApi } from '../services/api';
import { apiError, bankLabel, bankName } from '../lib/format';

// Three steps: current PIN, new PIN, confirm new PIN.
export function ChangePinFlow({ user, account, onClose }) {
  const [step, setStep] = useState('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitConfirm = async (pin) => {
    if (pin !== newPin) {
      setError('PINs do not match. Enter the new PIN again.');
      setStep('new');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateUpiPinApi({ userId: user.id, oldPin, newPin });
      setStep('done');
    } catch (err) {
      setError(apiError(err, 'Could not change PIN.'));
      setStep('old');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <Sheet
        title="UPI PIN changed"
        onClose={onClose}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        }
      >
        <Success title="Your UPI PIN was updated" subtitle={bankLabel(account)} />
      </Sheet>
    );
  }

  const titles = { old: 'ENTER CURRENT UPI PIN', new: 'ENTER NEW UPI PIN', confirm: 'RE-ENTER NEW UPI PIN' };

  return (
    <Sheet title="Change UPI PIN" onClose={onClose}>
      <PinPad
        key={step}
        title={titles[step]}
        busy={busy}
        error={error}
        onSubmit={(pin) => {
          if (step === 'old') {
            setOldPin(pin);
            setError('');
            setStep('new');
          } else if (step === 'new') {
            setNewPin(pin);
            setError('');
            setStep('confirm');
          } else {
            submitConfirm(pin);
          }
        }}
        summary={
          <div className="pin-head">
            <div style={{ fontWeight: 600 }}>{bankName(account)}</div>
            <div style={{ fontWeight: 600 }}>{account.accountNumberMasked}</div>
          </div>
        }
      />
    </Sheet>
  );
}
