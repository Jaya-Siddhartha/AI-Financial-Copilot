import React from 'react';
import { CheckCircle, ArrowDownLeft, ArrowUpRight, ShieldCheck, X, Share2 } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, data, currency = '₹', onNavigateToTransactions }) => {
  if (!isOpen || !data) return null;

  const isCredit = data.type === 'credit' || data.isCredit;
  const amount = Number(data.amount || 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '440px', padding: '28px', textAlign: 'center' }}>
        {/* Animated Checkmark Badge */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isCredit ? 'var(--emerald-light)' : 'var(--primary-light)',
            border: `2px solid ${isCredit ? 'var(--emerald)' : 'var(--primary)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <CheckCircle size={36} color={isCredit ? 'var(--emerald)' : 'var(--primary)'} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-title)' }}>
          {isCredit ? 'Money Received!' : 'Payment Successful!'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
          Simulated transaction processed instantly
        </p>

        {/* Amount Box */}
        <div
          style={{
            background: isCredit ? 'var(--emerald-light)' : 'var(--bg-surface-subtle)',
            border: `1px solid ${isCredit ? 'var(--emerald-border)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            marginBottom: '18px',
          }}
        >
          <div style={{ fontSize: '0.74rem', color: isCredit ? 'var(--emerald-text)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
            Amount {isCredit ? 'Credited' : 'Debited'}
          </div>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: isCredit ? 'var(--emerald)' : 'var(--text-title)',
              letterSpacing: '-0.02em',
            }}
          >
            {isCredit ? '+' : '-'}
            {currency} {amount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Transaction Details List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '22px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{isCredit ? 'Received From' : 'Paid To'}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-title)' }}>
              {data.recipient || data.sender || data.merchant || 'Simulated Contact'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment Channel</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{data.paymentMethod || 'Simulated Transfer'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Transaction Reference</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
              TXN-{Math.floor(100000 + Math.random() * 900000)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Updated Balance</span>
            <span style={{ fontWeight: 800, color: 'var(--emerald)' }}>
              {currency} {Number(data.newBalance || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {onNavigateToTransactions && (
            <button
              onClick={() => {
                onClose();
                onNavigateToTransactions();
              }}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '0.88rem' }}
            >
              View in Ledger
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '0.88rem', fontWeight: 700 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
