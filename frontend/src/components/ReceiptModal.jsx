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
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: `2px solid ${isCredit ? '#10B981' : '#6366F1'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: `0 0 30px ${isCredit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <CheckCircle size={38} color={isCredit ? '#10B981' : '#818CF8'} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px', color: '#FFFFFF' }}>
          {isCredit ? 'Money Received!' : 'Payment Successful!'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
          Simulated transaction processed instantly
        </p>

        {/* Amount Box */}
        <div
          style={{
            background: 'rgba(15, 21, 35, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Amount {isCredit ? 'Credited' : 'Debited'}
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: isCredit ? '#34D399' : '#FFFFFF',
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
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{isCredit ? 'Received From' : 'Paid To'}</span>
            <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
              {data.recipient || data.sender || data.merchant || 'Simulated Contact'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment Channel</span>
            <span style={{ color: 'var(--text-main)' }}>{data.paymentMethod || 'Simulated Transfer'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Transaction Reference</span>
            <span style={{ color: 'var(--text-faint)', fontFamily: 'monospace' }}>
              TXN-{Math.floor(100000 + Math.random() * 900000)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Updated Balance</span>
            <span style={{ fontWeight: 700, color: '#10B981' }}>
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
              style={{ flex: 1, fontSize: '0.86rem' }}
            >
              View in Ledger
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '0.86rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
