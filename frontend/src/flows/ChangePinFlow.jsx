import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { PinPad } from '../components/ui/PinPad';
import { Success } from '../components/ui/Success';
import { updateUpiPinApi, verifyUpiPinApi } from '../services/api';
import { apiError, bankLabel, bankName } from '../lib/format';

// Three steps: current PIN (checked straight away), new PIN, confirm new PIN.
export function ChangePinFlow({ user, account, onClose }) {
  const [step, setStep] = useState('old');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitOld = async (pin) => {
    setBusy(true);
    setError('');
    try {
      await verifyUpiPinApi({ userId: user.id, upiPin: pin });
      setOldPin(pin);
      setStep('new');
    } catch (err) {
      setError(apiError(err, 'Could not check your PIN.'));
    } finally {
      setBusy(false);
    }
  };

  const submitNew = (pin) => {
    if (pin === oldPin) {
      setError('Choose a new PIN that is different from your current one.');
      return;
    }
    setNewPin(pin);
    setError('');
    setStep('confirm');
  };

  const submitConfirm = async (pin) => {
    if (pin !== newPin) {
      setError('The PINs did not match. Enter the new PIN again.');
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

  const titles = {
    old: 'STEP 1 OF 3 · ENTER YOUR CURRENT PIN',
    new: 'STEP 2 OF 3 · CHOOSE A NEW PIN',
    confirm: 'STEP 3 OF 3 · ENTER THE NEW PIN AGAIN',
  };
  const handlers = { old: submitOld, new: submitNew, confirm: submitConfirm };

  return (
    <Sheet title="Change UPI PIN" onClose={onClose} locked={busy}>
      <PinPad
        key={`${step}-${error}`}
        title={titles[step]}
        busy={busy}
        error={error}
        onSubmit={handlers[step]}
        summary={
          <div className="pin-head">
            <div className="strong">{bankName(account)}</div>
            <div className="strong">{account.accountNumberMasked}</div>
          </div>
        }
      />
    </Sheet>
  );
}
