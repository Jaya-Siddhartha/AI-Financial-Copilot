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
  Check,
  Edit3,
} from 'lucide-react';
import { fetchTransactions, updateTransactionCategoryApi } from '../services/api';
import { CANONICAL_CATEGORIES } from '../constants/categories';

export const TransactionsPage = ({ activeUserId, currency = '₹' }) => {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [updateFeedback, setUpdateFeedback] = useState(null);

  const categories = ['all', ...CANONICAL_CATEGORIES];

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

  const handleCategoryChange = async (txId, newCategory) => {
    try {
      setUpdatingId(txId);
      const res = await updateTransactionCategoryApi(txId, newCategory);
      if (res.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            (t.id === txId || t._id === txId) ? { ...t, category: newCategory } : t
          )
        );
        setUpdateFeedback({ txId, message: 'Category updated!' });
        setTimeout(() => setUpdateFeedback(null), 2500);
      }
    } catch (err) {
      console.error('Failed to update category:', err);
      alert('Failed to update category.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Salary / Inflow':
      case 'Salary':
      case 'Freelance / Bonus':
        return Briefcase;
      case 'Housing & Rent':
      case 'Housing':
      case 'Rent':
        return Home;
      case 'Groceries & Food':
      case 'Grocery':
        return ShoppingBag;
      case 'Dining & Cafes':
      case 'Food & Dining':
        return Utensils;
      case 'Utilities & Bills':
      case 'Electricity':
      case 'Broadband':
        return Zap;
      case 'Shopping & Lifestyle':
      case 'Shopping':
        return ShoppingBag;
      case 'Transport & Fuel':
      case 'Transport':
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
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Filter Bar */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
              Transaction Ledger
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Simulated UPI and banking ledger with manual category re-assignment
            </p>
          </div>

          <button
            onClick={loadTransactions}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Search & Type Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search recipient, sender, merchant or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search
              size={16}
              color="var(--text-muted)"
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
                style={{ padding: '8px 14px', fontSize: '0.84rem', fontWeight: 600 }}
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
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: selectedCategory === cat ? 'var(--primary)' : 'var(--bg-surface-subtle)',
                border: selectedCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 700,
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
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading transactions ledger...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Transaction Details</th>
                  <th style={{ padding: '12px 14px' }}>Category (Editable)</th>
                  <th style={{ padding: '12px 14px' }}>Channel</th>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const txId = tx._id || tx.id;
                  const Icon = getCategoryIcon(tx.category);
                  const isCredit = tx.type === 'credit';
                  const isUpdating = updatingId === txId;
                  const feedback = updateFeedback?.txId === txId;

                  return (
                    <tr
                      key={txId || Math.random()}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Title & Details */}
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
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {tx.description || (isCredit ? `Received from ${tx.merchant || 'UPI'}` : `Paid to ${tx.merchant || 'UPI'}`)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category with Inline Editor */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            value={tx.category}
                            onChange={(e) => handleCategoryChange(txId, e.target.value)}
                            disabled={isUpdating}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-surface-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {CANONICAL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          {feedback && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 700 }}>
                              ✓ Saved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Channel */}
                      <td style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {tx.paymentMethod || 'UPI'}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {formatDate(tx.date)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 700 }}>
                          ✓ {isCredit ? 'Received' : 'Completed'}
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
    </div>
  );
};
