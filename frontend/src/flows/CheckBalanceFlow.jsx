import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { PinPad } from '../components/ui/PinPad';
import { Success } from '../components/ui/Success';
import { Alert } from '../components/ui/Alert';
import { checkBankBalanceApi } from '../services/api';
import { apiError, bankLabel, bankName, formatDateTime, inr } from '../lib/format';

export function CheckBalanceFlow({ user, account, onClose, onVerified }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (pin) => {
    setBusy(true);
    setError('');
    try {
      const res = await checkBankBalanceApi({ userId: user.id, upiPin: pin });
      setResult(res.data);
      onVerified();
    } catch (err) {
      setError(apiError(err, 'Could not fetch balance.'));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Sheet
        title="Bank balance"
        onClose={onClose}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        }
      >
        <Success
          title="Balance at your bank"
          amount={inr(result.verifiedBalance)}
          subtitle={bankLabel(result)}
          details={[
            ['Checked on', formatDateTime(result.lastBalanceCheckDate)],
            ['Balance this app had worked out', inr(result.previousAppBalance ?? result.verifiedBalance)],
          ]}
        />
        <div style={{ marginTop: 14 }}>
          {!result.difference ? (
            <Alert tone="green">Your app balance matches your bank. Nothing changed outside this app.</Alert>
          ) : (
            <Alert tone="amber">
              Your bank shows {inr(Math.abs(result.difference))} {result.difference < 0 ? 'less' : 'more'} than this app knew about
              {result.difference < 0 ? ' (money spent outside this app, like a cash withdrawal)' : ' (money added outside this app, like interest)'}.
              Your balance is now updated, and it is listed in your payments as a bank balance update.
            </Alert>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Check balance" onClose={onClose}>
      <PinPad
        busy={busy}
        error={error}
        onSubmit={submit}
        summary={
          <div className="pin-head">
            <div>
              <div className="muted small">Account</div>
              <div style={{ fontWeight: 600 }}>{bankName(account)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="muted small">A/c no.</div>
              <div style={{ fontWeight: 600 }}>{account.accountNumberMasked}</div>
            </div>
          </div>
        }
      />
    </Sheet>
  );
}
