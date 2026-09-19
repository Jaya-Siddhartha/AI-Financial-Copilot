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
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
            Upcoming EMI Obligations
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Scheduled loan installments monitored by FinCopilot AI
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddEMI}
          className="btn btn-secondary"
          style={{ padding: '7px 14px', fontSize: '0.84rem' }}
        >
          <Plus size={15} />
          <span>Add EMI</span>
        </button>
      </div>

      {actionError && (
        <div
          style={{
            background: 'var(--rose-light)',
            border: '1px solid var(--rose-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--rose-text)',
            fontSize: '0.84rem',
            marginBottom: '14px',
          }}
        >
          {actionError}
        </div>
      )}

      {emis.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active EMI obligations configured. Click "Add EMI" to track loan installments.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {emis.map((emi) => {
            const isPaid = emi.status === 'paid_this_cycle';
            const isInsufficient = currentBalance < Number(emi.amount) && !isPaid;

            return (
              <div
                key={emi._id || emi.id || Math.random()}
                style={{
                  background: isPaid ? 'var(--emerald-light)' : 'var(--bg-surface-subtle)',
                  border: isPaid ? '1px solid var(--emerald-border)' : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-title)' }}>
                      {emi.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <Building size={14} />
                      <span>{emi.lender}</span>
                    </div>
                  </div>

                  <span className={`badge ${getBadgeClass(emi.urgencyLevel)}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {emi.reminderBadge || 'Upcoming'}
                  </span>
                </div>

                {/* Amount & Installments */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Installment Amount
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '2px' }}>
                      {currency} {Number(emi.amount).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Due Cycle
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {emi.dueDay || 10}th of month
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {emi.remainingInstallments ? `${emi.remainingInstallments} installments left` : 'Monthly'}
                  </div>

                  {isPaid ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald)', fontSize: '0.82rem', fontWeight: 700 }}>
                      <CheckCircle2 size={16} />
                      <span>Paid this cycle</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={payingId === (emi._id || emi.id) || isInsufficient}
                      onClick={() => handlePayEMI(emi)}
                      className="btn btn-emerald"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                      title={isInsufficient ? 'Insufficient balance to settle EMI' : 'Pay EMI now'}
                    >
                      {payingId === (emi._id || emi.id) ? (
                        'Processing...'
                      ) : isInsufficient ? (
                        'Insufficient Balance'
                      ) : (
                        <>
                          <span>Pay EMI Now</span>
                          <ArrowRight size={14} />
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
