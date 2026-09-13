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
      <div className="modal-content" style={{ maxWidth: '440px', padding: '26px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={20} color="#818CF8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Check Bank Balance
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                {account?.bankName || 'Simulated Bank'} • {account?.accountNumberMasked || '•••• 4092'}
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

        {!verifiedResult ? (
          /* Step 1: UPI PIN Entry */
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '18px',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <KeyRound size={16} color="#818CF8" />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#FFFFFF' }}>
                  Enter 4-Digit UPI PIN
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
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
                    background: 'rgba(15, 21, 35, 0.9)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: 'var(--radius-md)',
                    color: '#FFFFFF',
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
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  color: '#A5B4FC',
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
                style={{ flex: 2, padding: '10px', fontSize: '0.9rem', fontWeight: 700 }}
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
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10B981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={34} color="#10B981" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: '#FFFFFF' }}>
              Bank Balance Verified!
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Verified via simulated UPI bank server
            </p>

            {/* Verified Balance Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(18, 24, 38, 0.9) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#34D399', textTransform: 'uppercase', fontWeight: 700 }}>
                Verified Bank Balance
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '4px 0 8px 0' }}>
                ₹{Number(verifiedResult.verifiedBalance || verifiedResult.currentBalance).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Checked on: <strong style={{ color: '#FFFFFF' }}>{formatDate(verifiedResult.lastBalanceCheckDate)}</strong>
              </div>
            </div>

            {/* Reset Baseline Explainer */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                marginBottom: '18px',
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                textAlign: 'left',
              }}
            >
              💡 <strong>Baseline Reset:</strong> Your calculation baseline is now synced to ₹{Number(verifiedResult.verifiedBalance || verifiedResult.currentBalance).toLocaleString('en-IN')}. Future known transactions will be estimated from this verified checkpoint.
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.92rem', fontWeight: 700 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
