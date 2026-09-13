import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
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
  RefreshCw,
} from 'lucide-react';
import { fetchTransactions } from '../services/api';

export const TransactionsPage = ({ activeUserId, currency = '₹' }) => {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    'all',
    'Daily Expenses',
    'Food & Dining',
    'Groceries & Food',
    'Shopping',
    'Utilities & Bills',
    'Transport',
    'Recharge',
    'Housing',
    'Salary / Inflow',
    'Other',
  ];

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const params = { userId: activeUserId };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await fetchTransactions(params);
      if (res.success) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeUserId, selectedCategory, selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTransactions();
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Salary / Inflow':
      case 'Salary':
      case 'Freelance / Bonus':
        return Briefcase;
      case 'Housing':
      case 'Housing & Rent':
      case 'Rent':
        return Home;
      case 'Groceries & Food':
      case 'Grocery':
        return ShoppingBag;
      case 'Food & Dining':
      case 'Dining & Cafes':
      case 'Restaurant':
        return Utensils;
      case 'Utilities & Bills':
      case 'Electricity':
      case 'Broadband':
        return Zap;
      case 'Recharge':
      case 'Mobile Recharge':
        return Smartphone;
      case 'Shopping':
      case 'Shopping & Lifestyle':
        return ShoppingBag;
      case 'Transport':
      case 'Transport & Fuel':
      case 'Cab/Metro':
        return Car;
      default:
        return Tag;
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title & Filter Bar */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              All Transactions
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Simulated UPI and banking ledger for this account
            </p>
          </div>

          <button
            onClick={loadTransactions}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Search & Type Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search recipient, sender, merchant or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <Search
              size={17}
              color="var(--text-faint)"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
          </form>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'debit', label: 'Money Sent' },
              { id: 'credit', label: 'Money Received' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`btn ${selectedType === t.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedCategory === cat ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found. Make a payment to see it here!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-faint)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Transaction Details</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Payment Channel</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
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
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: isCredit ? 'var(--emerald-subtle)' : 'rgba(255, 255, 255, 0.04)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isCredit ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={17} color={isCredit ? '#10B981' : '#94A3B8'} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>
                              {tx.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {tx.description || (isCredit ? `Received from ${tx.merchant || 'UPI'}` : `Paid to ${tx.merchant || 'UPI'}`)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-indigo" style={{ fontSize: '0.74rem' }}>
                          {tx.category || 'Daily Expenses'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {tx.paymentMethod || 'UPI'}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {formatDate(tx.date)}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                          ✓ {isCredit ? 'Received' : 'Completed'}
                        </span>
                      </td>

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
    </div>
  );
};
