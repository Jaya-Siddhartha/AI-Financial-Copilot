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

export const dueText = (days) => {
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

const AVATAR_COLORS = ['#5f259f', '#1f6feb', '#16865a', '#b35c00', '#b3261e', '#0f766e', '#6d4c41', '#3949ab'];

export const avatarColor = (name = '') => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const STATUS_META = {
  SAFE: { label: 'Safe', tone: 'green' },
  CAUTION: { label: 'Caution', tone: 'amber' },
  'HIGH RISK': { label: 'At risk', tone: 'red' },
};

export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check your connection.' : fallback);

// Seed data marks banks as "(Simulated UPI)"; the app already says it is a demo, so hide the suffix.
export const bankLabel = (account = {}) =>
  `${String(account.bankName || 'Bank').replace(/\s*\(simulated[^)]*\)/i, '')} ${account.accountNumberMasked || ''}`.trim();

export const bankName = (account = {}) => String(account.bankName || 'Bank').replace(/\s*\(simulated[^)]*\)/i, '');
