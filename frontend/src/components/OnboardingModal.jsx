import React, { useState } from 'react';
import {
  Sparkles,
  User,
  DollarSign,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const OnboardingModal = ({ isOpen, onSubmit, initialData = null, onClose = null }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(initialData?.monthlyIncome || '');
  const [salaryDate, setSalaryDate] = useState(initialData?.salaryDate || '1');
  const [startingBalance, setStartingBalance] = useState(initialData?.startingBalance || '');
  const [currency, setCurrency] = useState(initialData?.currency || '₹');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePreFillDemo = () => {
    setName('Alex Rivera');
    setMonthlyIncome('50000');
    setSalaryDate('1');
    setStartingBalance('50000');
    setCurrency('₹');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const incomeVal = Number(monthlyIncome);
    if (isNaN(incomeVal) || incomeVal <= 0) {
      setError('Please enter a valid positive monthly income.');
      return;
    }

    const salaryDateVal = Number(salaryDate);
    if (isNaN(salaryDateVal) || salaryDateVal < 1 || salaryDateVal > 31) {
      setError('Salary date must be between 1 and 31.');
      return;
    }

    const balanceVal = Number(startingBalance);
    if (isNaN(balanceVal) || balanceVal < 0) {
      setError('Please enter a valid starting balance (0 or higher).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        monthlyIncome: incomeVal,
        salaryDate: salaryDateVal,
        startingBalance: balanceVal,
        currency,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save account setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '32px' }}>
        {/* Header with glowing badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366F1 0%, #10B981 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={28} color="#FFFFFF" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
            {initialData ? 'Update Financial Profile' : 'AI Financial Copilot Setup'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
            Initialize your simulated financial account to activate the intelligent dashboard and ledger.
          </p>
        </div>

        {/* Quick Demo Pre-fill banner */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#818CF8" />
            <span style={{ fontSize: '0.8rem', color: '#C7D2FE', fontWeight: 500 }}>
              Need instant demo figures?
            </span>
          </div>
          <button
            type="button"
            onClick={handlePreFillDemo}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Auto-fill Sample Data
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
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Currency Selection */}
          <div className="form-group">
            <label className="form-label">
              <span>Currency Preference</span>
              <span className="form-label-desc">Display symbol</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['₹', '$', '€', '£'].map((curr) => (
                <button
                  type="button"
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: currency === curr ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-input)',
                    border: currency === curr ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                    color: currency === curr ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* User Name */}
          <div className="form-group">
            <label className="form-label">
              <span>Full Name</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <User
                size={17}
                color="var(--text-faint)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Monthly Income */}
          <div className="form-group">
            <label className="form-label">
              <span>Monthly Income ({currency})</span>
              <span className="form-label-desc">Primary monthly cash inflow</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 75000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                min="0"
                required
                style={{ paddingLeft: '40px' }}
              />
              <DollarSign
                size={17}
                color="var(--text-faint)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Income / Salary Date & Starting Account Balance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Income Date */}
            <div className="form-group">
              <label className="form-label">
                <span>Salary Date</span>
                <span className="form-label-desc">Day (1-31)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1"
                  min="1"
                  max="31"
                  value={salaryDate}
                  onChange={(e) => setSalaryDate(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
                <Calendar
                  size={17}
                  color="var(--text-faint)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>

            {/* Starting Balance */}
            <div className="form-group">
              <label className="form-label">
                <span>Starting Balance</span>
                <span className="form-label-desc">{currency}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="35000"
                  min="0"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
                <Wallet
                  size={17}
                  color="var(--text-faint)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-emerald"
              style={{ flex: 2, padding: '12px' }}
            >
              {isSubmitting ? (
                'Initializing Account...'
              ) : (
                <>
                  <span>{initialData ? 'Save & Recalculate' : 'Launch Dashboard'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info note */}
        <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10B981" />
          <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>
            Simulated Sandbox Mode • No real bank connection or banking credentials needed
          </span>
        </div>
      </div>
    </div>
  );
};
