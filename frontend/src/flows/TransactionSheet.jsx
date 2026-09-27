import React, { useState } from 'react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { TransactionIcon } from '../components/TransactionRow';
import { updateTransactionCategoryApi } from '../services/api';
import { CATEGORY_LIST } from '../constants/categories';
import { apiError, formatDateTime, inr } from '../lib/format';

export function TransactionSheet({ tx, onClose, onUpdated }) {
  const [category, setCategory] = useState(tx.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isCredit = tx.type === 'credit';

  const changeCategory = async (next) => {
    const previous = category;
    setCategory(next);
    setBusy(true);
    setError('');
    try {
      const res = await updateTransactionCategoryApi(tx._id || tx.id, next);
      onUpdated(res.data);
    } catch (err) {
      setCategory(previous);
      setError(apiError(err, 'Could not update the category.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Transaction details" onClose={onClose}>
      <div className="payee">
        <TransactionIcon tx={{ ...tx, category }} size={56} />
        <div className="payee-name">{tx.title}</div>
        <div className="success-amount" style={{ color: isCredit ? 'var(--green)' : 'var(--text)' }}>
          {isCredit ? '+' : '−'} {inr(tx.amount)}
        </div>
        <span className="chip green">
          <span className="chip-dot" />
          {tx.status === 'completed' ? 'Completed' : tx.status}
        </span>
      </div>

      <dl className="details">
        <div className="detail"><dt>{isCredit ? 'From' : 'To'}</dt><dd>{tx.merchant || '—'}</dd></div>
        <div className="detail"><dt>Date</dt><dd>{formatDateTime(tx.date)}</dd></div>
        <div className="detail"><dt>Method</dt><dd>{tx.paymentMethod || 'UPI'}</dd></div>
        {tx.description && <div className="detail"><dt>Note</dt><dd>{tx.description}</dd></div>}
        <div className="detail"><dt>Transaction ID</dt><dd>{tx._id || tx.id}</dd></div>
      </dl>

      <div className="field" style={{ marginTop: 16 }}>
        <label className="field-label" htmlFor="tx-category">Category</label>
        <select id="tx-category" className="input" value={category} disabled={busy} onChange={(e) => changeCategory(e.target.value)}>
          {!CATEGORY_LIST.includes(category) && <option value={category}>{category}</option>}
          {CATEGORY_LIST.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="field-hint">Changing the category updates your spending insights.</span>
      </div>
      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
    </Sheet>
  );
}
