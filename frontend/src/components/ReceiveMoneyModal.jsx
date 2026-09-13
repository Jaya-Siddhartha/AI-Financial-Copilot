import React, { useState } from 'react';
import { ArrowDownLeft, User, DollarSign, Zap, AlertCircle, ArrowRight } from 'lucide-react';
import { receiveMoneyApi } from '../services/api';

export const ReceiveMoneyModal = ({
  isOpen,
  onClose,
  activeUserId,
  currency = '₹',
  onReceiveSuccess,
}) => {
  const [senderName, setSenderName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary / Inflow');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePreset = (sender, amt, cat, defaultNote) => {
    setSenderName(sender);
    setAmount(amt);
    setCategory(cat);
    setNote(defaultNote);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    const finalSender = senderName.trim() || 'External Sender';

    try {
      setIsSubmitting(true);
      const res = await receiveMoneyApi({
        userId: activeUserId,
        amount: amtNum,
        senderName: finalSender,
        category,
        note: note.trim(),
        paymentMethod: 'UPI',
      });

      if (res.success) {
        onClose();
        if (onReceiveSuccess) {
          onReceiveSuccess({
            amount: amtNum,
            sender: finalSender,
            paymentMethod: 'Direct Bank Transfer',
            newBalance: res.data.newBalance,
            type: 'credit',
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Receive money transaction failed.');
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
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <ArrowDownLeft size={22} color="#10B981" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              Receive Money / Add Credit
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Simulate cash inflow to increase your account balance
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Quick Demo Presets:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handlePreset('Friend', '5000', 'Freelance / Bonus', 'Repayment from friend')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              +₹5,000 from Friend
            </button>
            <button
              type="button"
              onClick={() => handlePreset('Acme Digital Labs', '12500', 'Freelance / Bonus', 'Freelance consulting payout')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              +₹12,500 Freelance
            </button>
            <button
              type="button"
              onClick={() => handlePreset('Amazon Marketplace', '1499', 'Other', 'Order refund returned')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              +₹1,499 Refund
            </button>
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
          {/* Sender */}
          <div className="form-group">
            <label className="form-label">
              <span>Sender / Source</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Friend, Client Corp, Bonus"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <User
                size={16}
                color="var(--text-faint)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Amount & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Amount ({currency})</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="5000"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ paddingLeft: '40px', fontSize: '1.05rem', fontWeight: 700, color: '#34D399' }}
                />
                <DollarSign
                  size={17}
                  color="#10B981"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Category</span>
              </label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Freelance / Bonus">Freelance / Bonus</option>
                <option value="Salary">Salary Top-up</option>
                <option value="Investments & Savings">Investment Return</option>
                <option value="Other">Other / Repayment</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <span>Note (Optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Project completion payout"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Buttons */}
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
              className="btn btn-emerald"
              style={{ flex: 2, padding: '12px', fontSize: '0.95rem' }}
            >
              {isSubmitting ? (
                'Processing Inflow...'
              ) : (
                <>
                  <span>Receive {amount ? `${currency}${Number(amount).toLocaleString('en-IN')}` : ''}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
