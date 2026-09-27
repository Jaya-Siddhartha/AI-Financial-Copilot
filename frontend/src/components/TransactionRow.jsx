import React from 'react';
import {
  Briefcase,
  Car,
  Clapperboard,
  HandCoins,
  HeartPulse,
  House,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Utensils,
  Zap,
} from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import { formatShortDate, inr } from '../lib/format';
import { Avatar } from './ui/Avatar';

const CATEGORY_ICONS = {
  [CATEGORIES.EMI]: HandCoins,
  [CATEGORIES.HOUSING]: House,
  [CATEGORIES.FOOD]: Utensils,
  [CATEGORIES.GROCERIES]: ShoppingBasket,
  [CATEGORIES.TRANSPORT]: Car,
  [CATEGORIES.UTILITIES]: Zap,
  [CATEGORIES.RECHARGE]: Smartphone,
  [CATEGORIES.SHOPPING]: ShoppingBag,
  [CATEGORIES.SALARY]: Briefcase,
  [CATEGORIES.HEALTH]: HeartPulse,
  [CATEGORIES.ENTERTAINMENT]: Clapperboard,
};

// Merchant payments show a category icon; person-to-person transfers show the person's initials.
export function TransactionIcon({ tx, size = 40 }) {
  const Icon = CATEGORY_ICONS[tx.category];
  if (!Icon) return <Avatar name={tx.merchant || tx.title} size={size} />;
  return (
    <span className="icon-circle" style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.48)} strokeWidth={1.8} />
    </span>
  );
}

export function TransactionRow({ tx, onClick }) {
  const isCredit = tx.type === 'credit';
  return (
    <button type="button" className="row" onClick={onClick}>
      <TransactionIcon tx={tx} />
      <div className="row-main">
        <div className="row-title">{tx.title}</div>
        <div className="row-sub">
          {formatShortDate(tx.date)} · {tx.category}
        </div>
      </div>
      <div className="row-end">
        <div className={`row-amount ${isCredit ? 'credit' : ''}`}>
          {isCredit ? '+' : '−'} {inr(tx.amount)}
        </div>
        <div className="row-sub">{isCredit ? 'Credited' : 'Debited'}</div>
      </div>
    </button>
  );
}
