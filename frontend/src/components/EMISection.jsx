import React, { useState } from 'react';
import { Calendar, Building, Clock, CheckCircle2, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { payEMIApi } from '../services/api';

export const EMISection = ({
  emis = [],
  currency = '₹',
  currentBalance = 50000,
  activeUserId,
  onOpenAddEMI,
  onEMIUpdated,
}) => {
  const [payingId, setPayingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const handlePayEMI = async (emi) => {
    if (!window.confirm(`Confirm payment of ${currency}${Number(emi.amount).toLocaleString('en-IN')} for ${emi.name} (${emi.lender})?`)) {
      return;
    }

    try {
      setActionError('');
      setPayingId(emi._id || emi.id);
      const res = await payEMIApi(emi._id || emi.id, activeUserId);
      if (res.success) {
        if (onEMIUpdated) onEMIUpdated();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Failed to process EMI payment.');
    } finally {
      setPayingId(null);
    }
  };

  const getBadgeClass = (urgencyLevel) => {
    if (urgencyLevel === 'paid') return 'badge-emerald';
    if (urgencyLevel === 'critical') return 'badge-rose';
    if (urgencyLevel === 'warning') return 'badge-amber';
    return 'badge-blue';
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
            Upcoming EMI Obligations
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Scheduled loan installments analyzed by FinCopilot AI
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddEMI}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.82rem' }}
        >
          <Plus size={15} />
          <span>Add EMI</span>
        </button>
      </div>

      {actionError && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: '#FB7185',
            fontSize: '0.82rem',
            marginBottom: '14px',
          }}
        >
          {actionError}
        </div>
      )}

      {emis.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active EMI obligations configured. Click "Add EMI" to track loan installments.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {emis.map((emi) => {
            const isPaid = emi.status === 'paid_this_cycle';
            const isInsufficient = currentBalance < Number(emi.amount) && !isPaid;

            return (
              <div
                key={emi._id || emi.id || Math.random()}
                style={{
                  background: isPaid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 21, 35, 0.65)',
                  border: isPaid ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {emi.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Building size={13} />
                      <span>{emi.lender}</span>
                    </div>
                  </div>

                  <span className={`badge ${getBadgeClass(emi.urgencyLevel)}`} style={{ fontSize: '0.72rem' }}>
                    {emi.reminderBadge || 'Upcoming'}
                  </span>
                </div>

                {/* Amount & Installments */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                      Installment Amount
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FCD34D' }}>
                      {currency} {Number(emi.amount).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                      Due Cycle
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>
                      {emi.dueDay || 10}th of month
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    {emi.remainingInstallments ? `${emi.remainingInstallments} installments left` : 'Monthly'}
                  </div>

                  {isPaid ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontSize: '0.78rem', fontWeight: 600 }}>
                      <CheckCircle2 size={15} />
                      <span>Paid for this cycle</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={payingId === (emi._id || emi.id) || isInsufficient}
                      onClick={() => handlePayEMI(emi)}
                      className="btn btn-emerald"
                      style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                      title={isInsufficient ? 'Insufficient balance to settle EMI' : 'Pay EMI now'}
                    >
                      {payingId === (emi._id || emi.id) ? (
                        'Processing...'
                      ) : isInsufficient ? (
                        'Insufficient Balance'
                      ) : (
                        <>
                          <span>Pay EMI Now</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
