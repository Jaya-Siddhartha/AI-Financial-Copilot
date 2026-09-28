import React, { useEffect, useMemo, useState } from 'react';
import { Download, LoaderCircle, Search } from 'lucide-react';
import { TransactionRow } from '../components/TransactionRow';
import { Alert } from '../components/ui/Alert';
import { fetchTransactions } from '../services/api';
import { CATEGORY_LIST } from '../constants/categories';
import { apiError, monthKey } from '../lib/format';

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'debit', label: 'Paid' },
  { id: 'credit', label: 'Received' },
];

const toCsv = (rows) => {
  // Quote every cell, and stop spreadsheet apps from running cells that look like formulas.
  const escape = (v) => {
    let text = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = ['Date', 'Description', 'Party', 'Category', 'Type', 'Amount', 'Method', 'Transaction ID'];
  const lines = rows.map((t) =>
    [new Date(t.date).toISOString(), t.title, t.merchant, t.category, t.type, t.amount, t.paymentMethod, t._id || t.id]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
};

export function HistoryPage({ userId, refreshKey, actions }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce typing before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchTransactions({
      userId,
      type: type === 'all' ? undefined : type,
      category: category === 'all' ? undefined : category,
      search: query || undefined,
      limit: 200,
    })
      .then((res) => !cancelled && setTransactions(res.data))
      .catch((err) => !cancelled && setError(apiError(err, 'Could not load transactions.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, type, category, query, refreshKey]);

  const groups = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const key = monthKey(tx.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    });
    return [...map.entries()];
  }, [transactions]);

  const download = () => {
    const blob = new Blob([toCsv(transactions)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fincopilot-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">History</span>
          <h1 className="page-title">All payments</h1>
          <p className="page-sub">Money sent and received on this account.</p>
        </div>
        {!__BROWSER_DEMO__ && (
          <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={transactions.length === 0}>
            <Download size={18} /> Download statement
          </button>
        )}
      </div>

      <section className="card">
        <div className="input-wrap">
          <Search size={18} />
          <input
            className="input"
            placeholder="Search by name, merchant or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search transactions"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="segmented" role="tablist" aria-label="Transaction type">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={type === t.id}
                className={`seg ${type === t.id ? 'active' : ''}`}
                onClick={() => setType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="input"
            style={{ width: 'auto' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {CATEGORY_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}

        {loading ? (
          <div className="empty">
            <LoaderCircle size={22} className="spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty">No transactions match your filters.</div>
        ) : (
          groups.map(([month, txs]) => (
            <div key={month}>
              <div className="month-label">{month}</div>
              <div className="list">
                {txs.map((tx) => (
                  <TransactionRow key={tx._id || tx.id} tx={tx} onClick={() => actions.openTx(tx)} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
