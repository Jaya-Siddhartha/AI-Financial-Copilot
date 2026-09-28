// Formatting helpers shared across the UI.

export const inr = (value) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const formatShortDate = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const monthKey = (value) =>
  new Date(value).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

export const ordinal = (day) => {
  const n = Number(day);
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
};

export const dueText = (days, emi) => {
  if (emi?.status === 'overdue') return `overdue by ${emi.daysOverdue} day${emi.daysOverdue === 1 ? '' : 's'}`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};

export const initials = (name = '') =>
  name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

// Deep tones that keep white initials readable (at least 6:1) on both themes.
const AVATAR_COLORS = ['#2f5e12', '#155e63', '#6b4410', '#4c2a6b', '#7a2331', '#1f4a7a', '#4d5a14', '#5c3d2e'];

export const avatarColor = (name = '') => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const STATUS_META = {
  SAFE: { label: 'Safe', tone: 'green', sentence: 'Your EMIs are covered.' },
  CAUTION: { label: 'Be careful', tone: 'amber', sentence: 'Your EMIs are covered, but only just.' },
  'HIGH RISK': { label: 'At risk', tone: 'red', sentence: 'You may not have enough for your EMIs.' },
};

export const statusTone = (status) => (STATUS_META[status] || STATUS_META.SAFE).tone;

// Short Indian-style amount for chart labels: ₹43.5k, ₹1.2L.
export const inrShort = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(abs)}`;
};

export const shortDate = (daysFromNow) =>
  new Date(Date.now() + daysFromNow * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const errorText = (err, fallback = 'Something went wrong. Please try again.') => err?.message || fallback;

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
