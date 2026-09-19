import React, { useState } from 'react';
import { Calendar, Building, DollarSign, Clock, Layers, ArrowRight, AlertCircle, X } from 'lucide-react';
import { createEMIApi } from '../services/api';

export const AddEMIModal = ({
  isOpen,
  onClose,
  activeUserId,
  currency = '₹',
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [frequency, setFrequency] = useState('Monthly');
  const [totalLoanAmount, setTotalLoanAmount] = useState('');
  const [remainingInstallments, setRemainingInstallments] = useState('12');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter the EMI obligation name.');
      return;
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid positive EMI amount.');
      return;
    }

    const dayNum = Number(dueDay);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError('Due day must be between 1 and 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createEMIApi({
        userId: activeUserId,
        name: name.trim(),
        lender: lender.trim() || 'Financial Institution',
        amount: amtNum,
        dueDay: dayNum,
        frequency,
        totalLoanAmount: Number(totalLoanAmount) || amtNum * (Number(remainingInstallments) || 12),
        remainingInstallments: Number(remainingInstallments) || 12,
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add EMI obligation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '480px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--amber-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--amber-border)',
              }}
            >
              <Clock size={22} color="var(--amber)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                Add EMI Obligation
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Track loan commitments for AI risk calculations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
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
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* EMI Name */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">
              <span>EMI Name / Loan Title</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Personal Loan, Car Loan, MacBook EMI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Lender Name */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">
              <span>Lender / Bank / Institution</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HDFC Bank, ABC Finance, Bajaj Finserv"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Building
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Amount & Due Date in 2 cols */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>EMI Amount ({currency})</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="20000"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ paddingLeft: '36px', fontSize: '1.05rem', fontWeight: 700 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--amber)',
                  }}
                >
                  ₹
                </span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Due Day</span>
                <span className="form-label-desc">1-31</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  style={{ paddingLeft: '38px' }}
                />
                <Calendar
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>
          </div>

          {/* Total Loan Amount & Remaining Installments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '22px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Total Loan ({currency}) (Optional)</span>
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 240000"
                value={totalLoanAmount}
                onChange={(e) => setTotalLoanAmount(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Remaining Months</span>
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="12"
                min="1"
                value={remainingInstallments}
                onChange={(e) => setRemainingInstallments(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
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
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 2, padding: '12px', fontWeight: 700 }}
            >
              {isSubmitting ? 'Saving EMI...' : 'Add EMI Obligation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
