import React, { useMemo, useState } from 'react';
import { AtSign, ChevronRight, Landmark, Search, ShieldAlert, Smartphone } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { PinPad } from '../components/ui/PinPad';
import { Success } from '../components/ui/Success';
import { makePaymentApi } from '../services/api';
import { simulateSpend } from '../lib/affordability';
import { apiError, bankLabel, bankName, dueText, formatDateTime, inr } from '../lib/format';

const MAX_UPI_AMOUNT = 100000;
const QUICK_AMOUNTS = [100, 500, 1000, 2000];
const UPI_ID_PATTERN = /^[a-z0-9._-]{2,}@[a-z]{2,}$/i;

// Turns whatever was typed in the search box into a payee, if it is a mobile number or UPI ID.
const payeeFromQuery = (query) => {
  const text = query.trim();
  const digits = text.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
  if (/^[6-9]\d{9}$/.test(digits)) return { name: '', phone: digits, upiId: '' };
  if (UPI_ID_PATTERN.test(text)) return { name: '', phone: '', upiId: text.toLowerCase() };
  return null;
};

const payeeLabel = (payee) => payee.name || (payee.phone ? `+91 ${payee.phone}` : payee.upiId);

export function PayFlow({ contacts, initialPayee, mode, user, account, metrics, onClose, onPaid, onViewHistory }) {
  const [step, setStep] = useState(initialPayee ? 'amount' : 'payee');
  const [query, setQuery] = useState('');
  const [payee, setPayee] = useState(initialPayee || null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [riskAck, setRiskAck] = useState(false);

  const balance = Number(metrics.currentBalance) || 0;
  const amountNum = Number(amount) || 0;
  const typedRaw = payeeFromQuery(query);
  const typedPayee = typedRaw
    ? contacts.find((c) => (typedRaw.phone && c.phone === typedRaw.phone) || (typedRaw.upiId && c.upiId === typedRaw.upiId)) || typedRaw
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '') || '~') || c.upiId.includes(q)
    );
  }, [contacts, query]);

  // Someone typed in by number or UPI ID who is not in the contact list: the usual scam pattern.
  const isNewPayee = Boolean(payee) && !contacts.some((c) => (payee.phone && c.phone === payee.phone) || (payee.upiId && c.upiId === payee.upiId));

  const choosePayee = (next) => {
    setPayee(next);
    setError('');
    setStep('amount');
  };

  const amountError =
    amountNum > balance
      ? `Insufficient balance. Available: ${inr(balance)}`
      : amountNum > MAX_UPI_AMOUNT
        ? `UPI payments are limited to ${inr(MAX_UPI_AMOUNT)} per transaction.`
        : '';

  const impact = amountNum > 0 ? simulateSpend(metrics, amountNum) : null;
  const nextEmi = metrics.nextEMI;
  const risky = Boolean(impact && nextEmi && impact.status === 'HIGH RISK');

  const submitPin = async (pin) => {
    setBusy(true);
    setError('');
    try {
      const res = await makePaymentApi({
        senderId: user.id,
        recipientName: payee.name,
        recipientPhone: payee.phone,
        recipientUpi: payee.upiId,
        amount: amountNum,
        note: note.trim(),
        upiPin: pin,
      });
      setReceipt(res.data);
      setStep('done');
      onPaid();
    } catch (err) {
      setError(apiError(err, 'Payment failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done' && receipt) {
    const tx = receipt.transaction;
    return (
      <Sheet
        title="Payment successful"
        onClose={onClose}
        footer={
          <div className="btn-row">
            <button type="button" className="btn btn-outline" onClick={onViewHistory}>
              View history
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        }
      >
        <Success
          title={`Paid to ${receipt.recipientUser || payeeLabel(payee)}`}
          amount={inr(tx.amount)}
          subtitle={formatDateTime(tx.date)}
          details={[
            ['UPI transaction ID', tx._id || tx.id],
            ['To', payee.upiId || (payee.phone ? `+91 ${payee.phone}` : payeeLabel(payee))],
            ['Debited from', bankLabel(account)],
            ['Balance after payment', inr(receipt.newBalance)],
          ]}
        />
      </Sheet>
    );
  }

  if (step === 'pin') {
    return (
      <Sheet title={bankName(account)} onClose={onClose} onBack={() => setStep('amount')} locked={busy}>
        <PinPad
          busy={busy}
          error={error}
          onSubmit={submitPin}
          summary={
            <div className="pin-head">
              <div>
                <div className="muted small">To</div>
                <div className="strong">{payeeLabel(payee)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted small">Sending</div>
                <div className="strong">{inr(amountNum)}</div>
              </div>
            </div>
          }
        />
      </Sheet>
    );
  }

  if (step === 'amount' && payee) {
    return (
      <Sheet
        title="Pay"
        onClose={onClose}
        onBack={initialPayee ? undefined : () => setStep('payee')}
        footer={
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={amountNum <= 0 || Boolean(amountError) || (risky && !riskAck)}
            onClick={() => {
              setError('');
              setStep('pin');
            }}
          >
            {amountNum <= 0 ? 'Enter amount' : risky ? `Pay ${inr(amountNum)} anyway` : `Pay ${inr(amountNum)}`}
          </button>
        }
      >
        {isNewPayee && (
          <div className="new-payee" role="note">
            <ShieldAlert size={20} aria-hidden="true" />
            <div>
              <strong>First time paying {payeeLabel(payee)}.</strong> Check the name with the person before you pay. You never need to pay or enter your PIN to receive money.
            </div>
          </div>
        )}

        <div className="payee">
          {payee.name ? (
            <Avatar name={payee.name} size={56} />
          ) : (
            <span className="icon-circle" style={{ width: 56, height: 56 }}>
              {payee.upiId ? <AtSign size={26} /> : <Smartphone size={26} />}
            </span>
          )}
          <div className="payee-name">{payeeLabel(payee)}</div>
          <div className="payee-sub">
            {payee.name
              ? [payee.phone && `+91 ${payee.phone}`, payee.upiId].filter(Boolean).join(' · ')
              : payee.upiId
                ? 'UPI ID'
                : 'Mobile number'}
          </div>
        </div>

        <label className="amount-entry">
          <span>₹</span>
          <input
            inputMode="decimal"
            autoFocus
            placeholder="0"
            aria-label="Amount"
            style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }}
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '');
              if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) {
                setAmount(v);
                setRiskAck(false);
              }
            }}
          />
        </label>
        <div className="quick-amounts">
          {QUICK_AMOUNTS.map((q) => (
            <button key={q} type="button" className="seg" onClick={() => { setAmount(String(q)); setRiskAck(false); }}>
              {inr(q)}
            </button>
          ))}
        </div>
        <input
          className="input note-input"
          placeholder="Add a note"
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
        />

        {amountError ? (
          <Alert>{amountError}</Alert>
        ) : impact && impact.status !== 'SAFE' && nextEmi ? (
          <Alert tone={impact.status === 'HIGH RISK' ? 'red' : 'amber'}>
            {impact.status === 'HIGH RISK'
              ? `After this payment you may be ${inr(impact.shortfall)} short for your ${nextEmi.name} EMI of ${inr(nextEmi.amount)}, due ${dueText(nextEmi.daysRemaining, nextEmi)}.`
              : `This leaves very little spare before your ${nextEmi.name} EMI, due ${dueText(nextEmi.daysRemaining, nextEmi)}.`}
          </Alert>
        ) : impact ? (
          <Alert tone="green">Safe to pay. You can still spend {inr(impact.safeToSpend)} after this.</Alert>
        ) : null}

        {risky && !amountError && (
          <label className="ack">
            <input type="checkbox" checked={riskAck} onChange={(e) => setRiskAck(e.target.checked)} />
            <span>I understand this payment could leave me short for my EMI.</span>
          </label>
        )}

        <div className="source" style={{ marginTop: 12 }}>
          <span className="icon-circle" style={{ width: 36, height: 36 }}>
            <Landmark size={18} />
          </span>
          <div className="row-main">
            <div className="strong">{bankLabel(account)}</div>
            <div className="row-sub">Balance {inr(balance)}</div>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={mode === 'upi' ? 'Pay to UPI ID' : mode === 'mobile' ? 'Pay to mobile number' : 'Send money'} onClose={onClose}>
      <div className="input-wrap">
        {mode === 'upi' ? <AtSign size={18} /> : mode === 'mobile' ? <Smartphone size={18} /> : <Search size={18} />}
        <input
          className="input"
          autoFocus
          inputMode={mode === 'mobile' ? 'tel' : 'text'}
          placeholder={
            mode === 'upi' ? 'Enter UPI ID, e.g. rahul@fin' : mode === 'mobile' ? 'Enter 10-digit mobile number' : 'Search name, number or UPI ID'
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Payee"
        />
      </div>

      {typedPayee && (
        <button type="button" className="row" onClick={() => choosePayee(typedPayee)} style={{ marginTop: 8 }}>
          <span className="icon-circle" style={{ width: 40, height: 40 }}>
            {typedPayee.upiId ? <AtSign size={20} /> : <Smartphone size={20} />}
          </span>
          <div className="row-main">
            <div className="row-title">Pay {payeeLabel(typedPayee)}</div>
            <div className="row-sub">
              {typedPayee.name ? `+91 ${typedPayee.phone} · ${typedPayee.upiId}` : typedPayee.upiId ? 'UPI ID' : 'Mobile number'}
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-3)" />
        </button>
      )}

      {query.trim() && !typedPayee && filtered.length === 0 && (
        <div className="empty">
          {mode === 'upi' ? 'Enter a valid UPI ID like name@bank' : 'Enter a valid 10-digit mobile number or UPI ID'}
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="month-label">Contacts</div>
          <div className="list">
            {filtered.map((c) => (
              <button key={c.phone} type="button" className="row" onClick={() => choosePayee(c)}>
                <Avatar name={c.name} />
                <div className="row-main">
                  <div className="row-title">{c.name}</div>
                  <div className="row-sub">
                    +91 {c.phone} · {c.upiId}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
