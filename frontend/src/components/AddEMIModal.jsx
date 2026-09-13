import React, { useState } from 'react';
import { Calendar, Building, DollarSign, Clock, Layers, ArrowRight, AlertCircle } from 'lucide-react';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <Clock size={22} color="#F59E0B" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              Add EMI Obligation
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Add upcoming loan or recurring payment for AI prediction
            </p>
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
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* EMI Name */}
          <div className="form-group">
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
          <div className="form-group">
            <label className="form-label">
              <span>Lender / Bank / Company</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ABC Finance, HDFC Bank, Bajaj Finserv"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Building
                size={16}
                color="var(--text-faint)"
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
                  style={{ paddingLeft: '40px', fontSize: '1rem', fontWeight: 700 }}
                />
                <DollarSign
                  size={16}
                  color="#F59E0B"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
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
                  style={{ paddingLeft: '40px' }}
                />
                <Calendar
                  size={16}
                  color="var(--text-faint)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>
          </div>

          {/* Total Loan Amount & Remaining Installments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '20px' }}>
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
              style={{ flex: 2, padding: '12px' }}
            >
              {isSubmitting ? 'Saving EMI...' : 'Add EMI Obligation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
