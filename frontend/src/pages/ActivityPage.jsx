import React, { useMemo, useState } from 'react';
import { Download, FileUp, Plus, Search } from 'lucide-react';
import { TransactionRow } from '../components/TransactionRow';
import { CATEGORY_LIST } from '../lib/categories';
import { inr, monthKey } from '../lib/format';

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'debit', label: 'Spent' },
  { id: 'credit', label: 'Received' },
];

// CSV with every cell quoted, and cells that look like spreadsheet formulas made safe.
const toCsv = (rows) => {
  const escape = (v) => {
    let text = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const header = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Note', 'Source'];
  const lines = rows.map((t) => [new Date(t.date).toLocaleString('en-IN'), t.description, t.category, t.type, t.amount, t.note, t.source].map(escape).join(','));
  return [header.join(','), ...lines].join('\n');
};

export function ActivityPage({ data, actions }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [limit, setLimit] = useState(200);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.transactions.filter(
      (t) =>
        (type === 'all' || t.type === type) &&
        (category === 'all' || t.category === category) &&
        (!q || `${t.description} ${t.category} ${t.note} ${t.amount}`.toLowerCase().includes(q))
    );
  }, [data.transactions, search, type, category]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of filtered.slice(0, limit)) {
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, { txs: [], out: 0, in: 0 });
      const g = map.get(k);
      g.txs.push(t);
      if (t.type === 'debit') g.out += t.amount;
      else g.in += t.amount;
    }
    return [...map.entries()];
  }, [filtered, limit]);

  const download = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fincopilot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">History</span>
          <h1 className="page-title">All transactions</h1>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.newTx('debit')}>
          <Plus size={18} /> Add
        </button>
      </div>

      <section className="card">
        <div className="input-wrap">
          <Search size={18} />
          <input className="input" placeholder="Search name, category or amount" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search transactions" />
        </div>
        <div className="filters">
          <div className="segmented" role="radiogroup" aria-label="Type">
            {TYPES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={type === t.id} className={`seg ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <select className="input" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORY_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="filters">
          <button type="button" className="btn btn-outline btn-sm" onClick={actions.upload}>
            <FileUp size={18} /> Upload statements
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={!filtered.length}>
            <Download size={18} /> Download CSV
          </button>
        </div>

        {data.transactions.length === 0 ? (
          <div className="empty">No transactions yet. Add one, or upload a PhonePe, Google Pay, Paytm or bank statement.</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Nothing matches these filters.</div>
        ) : (
          groups.map(([month, g]) => (
            <div key={month}>
              <div className="month-head">
                <span className="month-label">{month}</span>
                <span className="month-totals">
                  <span className="text-danger">−{inr(g.out)}</span> · <span className="text-green">+{inr(g.in)}</span>
                </span>
              </div>
              <div className="list">
                {g.txs.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onClick={() => actions.openTx(tx)} />
                ))}
              </div>
            </div>
          ))
        )}
        {filtered.length > limit && (
          <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 12 }} onClick={() => setLimit((l) => l + 200)}>
            Show more ({filtered.length - limit} left)
          </button>
        )}
      </section>
    </div>
  );
}
