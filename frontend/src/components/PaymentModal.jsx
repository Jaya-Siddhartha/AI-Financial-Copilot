import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  User,
  DollarSign,
  AlertCircle,
  Check,
  Send,
  ArrowRight,
  ShieldCheck,
  Zap,
  KeyRound,
  AtSign,
} from 'lucide-react';
import { makePaymentApi } from '../services/api';

export const PaymentModal = ({
  isOpen,
  onClose,
  currentBalance = 50000,
  activeUserId,
  onPaymentSuccess,
  preselectedContact = null,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [upiPin, setUpiPin] = useState('');
  const [payMode, setPayMode] = useState('mobile'); // 'mobile' | 'upi'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setUpiPin('');
      if (preselectedContact) {
        setRecipientName(preselectedContact.name || '');
        setMobileNumber(preselectedContact.phone || '');
        setUpiId(preselectedContact.upiId || '');
        setPayMode('mobile');
      } else {
        setRecipientName('');
        setMobileNumber('');
        setUpiId('');
        setAmount('');
      }
    }
  }, [isOpen, preselectedContact]);

  if (!isOpen) return null;

  // Indian demo contacts
  const demoContacts = [
    { name: 'Rahul Sharma', phone: '9123456780', upiId: 'rahul@fin', initial: 'R', color: '#6366F1' },
    { name: 'Priya Patel', phone: '9823456781', upiId: 'priya@okhdfc', initial: 'P', color: '#10B981' },
    { name: 'Amit Kumar (Landlord)', phone: '9988776655', upiId: 'amit.rent@fin', initial: 'A', color: '#F59E0B' },
    { name: 'Vikram Mehta', phone: '9012345678', upiId: 'vikram@paytm', initial: 'V', color: '#EC4899' },
    { name: 'Ananya Roy', phone: '9345678901', upiId: 'ananya@icici', initial: 'A', color: '#38BDF8' },
  ];

  const handleSelectContact = (contact) => {
    setRecipientName(contact.name);
    setMobileNumber(contact.phone);
    setUpiId(contact.upiId || '');
    setError('');
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setMobileNumber(val);

    const match = demoContacts.find((c) => c.phone === val);
    if (match) {
      setRecipientName(match.name);
      setUpiId(match.upiId || '');
    } else if (!recipientName || demoContacts.some((c) => c.name === recipientName)) {
      setRecipientName('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (payMode === 'mobile') {
      if (!mobileNumber || mobileNumber.length !== 10) {
        setError('Enter a valid 10-digit Indian mobile number.');
        return;
      }
    } else {
      if (!upiId || !upiId.includes('@')) {
        setError('Enter a valid UPI ID (e.g. rahul@fin).');
        return;
      }
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Enter an amount greater than ₹0.');
      return;
    }

    if (amtNum > currentBalance) {
      setError(`Insufficient balance! Available balance is ₹${currentBalance.toLocaleString('en-IN')}.`);
      return;
    }

    if (!upiPin || upiPin.length !== 4) {
      setError('Please enter your 4-digit UPI PIN.');
      return;
    }

    const finalRecipient = recipientName.trim() || (payMode === 'mobile' ? `+91 ${mobileNumber}` : upiId.trim());

    try {
      setIsSubmitting(true);
      const res = await makePaymentApi({
        senderId: activeUserId,
        recipientName: finalRecipient,
        recipientPhone: mobileNumber,
        recipientUpi: upiId,
        amount: amtNum,
        upiPin: upiPin.trim(),
        paymentMethod: 'UPI',
      });

      if (res.success) {
        onClose();
        if (onPaymentSuccess) {
          onPaymentSuccess({
            amount: amtNum,
            recipient: finalRecipient,
            recipientPhone: mobileNumber ? `+91 ${mobileNumber}` : '',
            recipientUpi: upiId || '',
            paymentMethod: 'UPI',
            newBalance: res.data.newBalance,
            type: 'debit',
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '480px', padding: '26px' }}>
        {/* Header with Balance Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              Pay via UPI
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Instant transfer with simulated UPI PIN authorization
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Available Balance
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
              ₹{currentBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: '#FB7185',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="#FB7185" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Recent Contacts Carousel/Tray */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
            Select Recent Contact:
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {demoContacts.map((c) => {
              const isSelected = mobileNumber === c.phone || (upiId && upiId === c.upiId);
              return (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '68px',
                    background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: c.color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {c.initial}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isSelected ? '#FFFFFF' : 'var(--text-muted)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '60px' }}>
                    {c.name.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transfer Mode Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setPayMode('mobile')}
            className={`btn ${payMode === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Smartphone size={14} />
            <span>To Mobile Number</span>
          </button>
          <button
            type="button"
            onClick={() => setPayMode('upi')}
            className={`btn ${payMode === 'upi' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <AtSign size={14} />
            <span>To UPI ID</span>
          </button>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit}>
          {payMode === 'mobile' ? (
            /* Mobile Number Input with Fixed +91 */
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">
                <span>Recipient Mobile Number</span>
                <span className="form-label-desc">10 Digits</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="98765 43210"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  maxLength={10}
                  required
                  style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.05em' }}
                />
              </div>
            </div>
          ) : (
            /* UPI ID Input */
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">
                <span>Recipient UPI ID</span>
                <span className="form-label-desc">e.g. rahul@fin</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="name@fin or phone@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                style={{ fontSize: '0.95rem', fontWeight: 600 }}
              />
            </div>
          )}

          {/* Recipient Name (Auto or custom) */}
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">
              <span>Recipient Name</span>
              <span className="form-label-desc">Display title</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">
              <span>Enter Amount</span>
              <span className="form-label-desc">₹ INR</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="form-input"
                placeholder="₹ 500"
                min="1"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  paddingLeft: '40px',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#10B981',
                }}
              >
                ₹
              </span>
            </div>

            {/* Quick Amount Suggestion Pills */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {[200, 500, 1000, 2000, 5000].map((quickAmt) => (
                <button
                  key={quickAmt}
                  type="button"
                  onClick={() => setAmount(String(quickAmt))}
                  style={{
                    background: amount === String(quickAmt) ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: amount === String(quickAmt) ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 8px',
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ₹{quickAmt}
                </button>
              ))}
            </div>
          </div>

          {/* UPI PIN Input Box */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={15} color="#818CF8" />
                <span>Enter 4-Digit UPI PIN</span>
              </label>
              <span style={{ fontSize: '0.7rem', color: '#A5B4FC' }}>
                Demo PIN: <strong>1234</strong>
              </span>
            </div>

            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={upiPin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setUpiPin(val);
              }}
              required
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: '1.4rem',
                letterSpacing: '0.4em',
                fontWeight: 800,
                background: 'rgba(15, 21, 35, 0.9)',
                border: '1px solid rgba(99, 102, 241, 0.5)',
                borderRadius: 'var(--radius-sm)',
                color: '#FFFFFF',
                padding: '8px 12px',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || upiPin.length !== 4}
              className="btn btn-primary"
              style={{ flex: 2, padding: '12px', fontSize: '0.92rem', fontWeight: 700 }}
            >
              {isSubmitting ? (
                'Processing UPI...'
              ) : (
                <>
                  <span>Pay {amount ? `₹${Number(amount).toLocaleString('en-IN')}` : 'Now'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
