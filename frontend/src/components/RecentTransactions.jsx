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
      case 'Housing':
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
        marginBottom: '18px',
      }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
            Recent Transactions
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Latest verified ledger events from simulated account
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            View All Ledger
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
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 14px' }}>Transaction</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px' }}>Date & Time</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount</th>
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
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Title & Merchant */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: 'var(--radius-md)',
                            background: isCredit ? 'var(--emerald-light)' : 'var(--bg-surface-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isCredit ? '1px solid var(--emerald-border)' : '1px solid var(--border-subtle)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={18} color={isCredit ? 'var(--emerald)' : 'var(--text-muted)'} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-title)' }}>
                            {tx.title}
                          </div>
                          {tx.merchant && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {tx.merchant} • {tx.paymentMethod || 'UPI / Transfer'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.74rem', fontWeight: 600 }}>
                        {tx.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {formatDate(tx.date)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px' }}>
                      <span
                        className="badge badge-emerald"
                        style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 700 }}
                      >
                        ✓ {tx.status || 'Completed'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 800,
                          color: isCredit ? 'var(--emerald)' : 'var(--rose)',
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
