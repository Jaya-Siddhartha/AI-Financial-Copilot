import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Car,
  Clapperboard,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  PiggyBank,
  ReceiptIndianRupee,
  RotateCcw,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Utensils,
  Zap,
} from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import { formatShortDate, inr } from '../lib/format';

const CATEGORY_ICONS = {
  [CATEGORIES.EMI]: HandCoins,
  [CATEGORIES.RENT]: House,
  [CATEGORIES.FOOD]: Utensils,
  [CATEGORIES.GROCERIES]: ShoppingBasket,
  [CATEGORIES.TRANSPORT]: Car,
  [CATEGORIES.BILLS]: Zap,
  [CATEGORIES.RECHARGE]: Smartphone,
  [CATEGORIES.SHOPPING]: ShoppingBag,
  [CATEGORIES.HEALTH]: HeartPulse,
  [CATEGORIES.ENTERTAINMENT]: Clapperboard,
  [CATEGORIES.EDUCATION]: GraduationCap,
  [CATEGORIES.INVESTMENT]: PiggyBank,
  [CATEGORIES.CASH]: Banknote,
  [CATEGORIES.TRANSFER]: ArrowUpRight,
  [CATEGORIES.INCOME]: Briefcase,
  [CATEGORIES.REFUND]: RotateCcw,
  [CATEGORIES.RECEIVED]: ArrowDownLeft,
};

export function TransactionIcon({ tx, size = 44 }) {
  const Icon = CATEGORY_ICONS[tx.category] || ReceiptIndianRupee;
  return (
    <span className={`icon-circle ${tx.type === 'credit' ? 'in' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.8} />
    </span>
  );
}

export function TransactionRow({ tx, onClick }) {
  const isCredit = tx.type === 'credit';
  return (
    <button type="button" className="row" onClick={onClick}>
      <TransactionIcon tx={tx} />
      <div className="row-main">
        <div className="row-title">{tx.description}</div>
        <div className="row-sub">
          {formatShortDate(tx.date)} · {tx.category}
          {tx.source === 'autopay' && ' · Autopay'}
        </div>
      </div>
      <div className="row-end">
        <div className={`row-amount ${isCredit ? 'credit' : ''}`}>
          {isCredit ? '+' : '−'} {inr(tx.amount)}
        </div>
      </div>
    </button>
  );
}
