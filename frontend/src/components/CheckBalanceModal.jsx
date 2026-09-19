import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
  KeyRound,
} from 'lucide-react';
import { checkBankBalanceApi } from '../services/api';

export const CheckBalanceModal = ({
  isOpen,
  onClose,
  account,
  user,
  activeUserId,
  onBalanceVerified,
}) => {
  const [upiPin, setUpiPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setUpiPin('');
      setError('');
      setVerifiedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!upiPin || upiPin.length !== 4) {
      setError('Please enter your 4-digit UPI PIN.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await checkBankBalanceApi({
        userId: activeUserId,
        upiPin: upiPin.trim(),
      });

      if (res.success) {
        setVerifiedResult(res.data);
        if (onBalanceVerified) {
          onBalanceVerified(res.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Incorrect UPI PIN. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '440px', padding: '28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                Check Bank Balance
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {account?.bankName || 'HDFC Bank'} • {account?.accountNumberMasked || '•••• 4092'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--rose-light)',
              border: '1px solid var(--rose-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--rose-text)',
              fontSize: '0.84rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} color="var(--rose)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!verifiedResult ? (
          /* Step 1: UPI PIN Entry */
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <KeyRound size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-title)' }}>
                  Enter 4-Digit UPI PIN
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                To view your live bank balance and reset the estimation baseline
              </p>

              {/* 4-Digit Input */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={upiPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                    setUpiPin(val);
                  }}
                  style={{
                    width: '180px',
                    textAlign: 'center',
                    fontSize: '1.6rem',
                    letterSpacing: '0.4em',
                    fontWeight: 800,
                    background: '#FFFFFF',
                    border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-title)',
                    padding: '8px 12px',
                  }}
                />
              </div>

              {/* Demo Hint Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px',
                  fontSize: '0.74rem',
                  color: 'var(--primary-text)',
                  fontWeight: 600,
                }}
              >
                <span>Demo UPI PIN:</span>
                <strong>1234</strong>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || upiPin.length !== 4}
                className="btn btn-primary"
                style={{ flex: 2, padding: '11px', fontSize: '0.92rem', fontWeight: 700 }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Fetch Balance</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Verified Result Screen */
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--emerald-light)',
                border: '2px solid var(--emerald)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={34} color="var(--emerald)" />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-title)' }}>
              Bank Balance Verified!
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
              Verified via simulated UPI banking ledger
            </p>

            {/* Verified Balance Card */}
            <div
              style={{
                background: 'var(--emerald-light)',
                border: '1px solid var(--emerald-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--emerald-text)', textTransform: 'uppercase', fontWeight: 700 }}>
                Verified Bank Balance
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--emerald-text)', letterSpacing: '-0.02em', margin: '4px 0 8px 0' }}>
                ₹{Number(verifiedResult.verifiedBalance || verifiedResult.currentBalance).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Checked on: <strong style={{ color: 'var(--text-title)' }}>{formatDate(verifiedResult.lastBalanceCheckDate)}</strong>
              </div>
            </div>

            {/* Reset Baseline Explainer */}
            <div
              style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                lineHeight: 1.45,
                textAlign: 'left',
              }}
            >
              💡 <strong>Baseline Sync:</strong> Your calculation baseline is now synced to ₹{Number(verifiedResult.verifiedBalance || verifiedResult.currentBalance).toLocaleString('en-IN')}. Future known transactions will be estimated from this verified checkpoint.
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.94rem', fontWeight: 700 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
