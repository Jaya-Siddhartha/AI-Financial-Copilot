import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Utensils,
  Home,
  Zap,
  Briefcase,
  Smartphone,
  Car,
  Tv,
  HeartPulse,
  Tag,
} from 'lucide-react';

export const RecentTransactions = ({ transactions = [], currency = '₹', onViewAll }) => {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Salary':
      case 'Freelance / Bonus':
        return Briefcase;
      case 'Housing & Rent':
        return Home;
      case 'Groceries & Food':
        return ShoppingBag;
      case 'Dining & Cafes':
        return Utensils;
      case 'Utilities & Bills':
        return Zap;
      case 'Shopping & Lifestyle':
        return Smartphone;
      case 'Transport & Fuel':
        return Car;
      case 'Entertainment & Subscriptions':
        return Tv;
      case 'Healthcare & Wellness':
        return HeartPulse;
      default:
        return Tag;
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="glass-card">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            Recent Transactions
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Latest verified ledger events from simulated account
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            View All Transactions
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No transactions found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-faint)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Transaction</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Date & Time</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const Icon = getCategoryIcon(tx.category);
                const isCredit = tx.type === 'credit';

                return (
                  <tr
                    key={tx._id || tx.id || Math.random()}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Title & Merchant */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isCredit ? 'var(--emerald-subtle)' : 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isCredit ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={18} color={isCredit ? '#10B981' : '#94A3B8'} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>
                            {tx.title}
                          </div>
                          {tx.merchant && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {tx.merchant} • {tx.paymentMethod || 'UPI / Transfer'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.74rem' }}>
                        {tx.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {formatDate(tx.date)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        className="badge badge-emerald"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                      >
                        ✓ {tx.status || 'Completed'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: isCredit ? '#34D399' : '#FB7185',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                        }}
                      >
                        {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        <span>
                          {isCredit ? '+' : '-'}
                          {currency} {Number(tx.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
