// Savings goals: how much to put aside each month, and whether that fits what is usually left
// over at the end of a month.

const DAY = 86400000;

export const monthsUntil = (targetDate, now = new Date()) => {
  const t = new Date(targetDate);
  if (Number.isNaN(t.getTime())) return null;
  const months = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()) + (t.getDate() >= now.getDate() ? 0 : -1);
  return Math.max(0, months) || (t.getTime() > now.getTime() ? 1 : 0);
};

// Average money left at the end of recent months (money in − money out), from the engine's trend.
export const monthlySurplus = (analysis, profile) => {
  const months = analysis.trend.slice(0, -1).filter((m) => m.income > 0 || m.spent > 0).slice(-3);
  if (months.length) return Math.round(months.reduce((s, m) => s + (m.income || Number(profile.monthlyIncome) || 0) - m.spent, 0) / months.length);
  return null;
};

export const goalPlan = (goal, surplus, now = new Date()) => {
  const target = Number(goal.target) || 0;
  const saved = Math.min(target, Number(goal.saved) || 0);
  const left = Math.max(0, target - saved);
  const months = goal.targetDate ? monthsUntil(goal.targetDate, now) : null;
  const perMonth = left === 0 ? 0 : months ? Math.ceil(left / months) : left;
  const progress = target > 0 ? Math.round((saved / target) * 100) : 0;
  let status;
  if (left === 0) status = 'done';
  else if (months === 0) status = 'late';
  else if (surplus === null) status = 'unknown';
  else if (perMonth <= surplus * 0.5) status = 'easy';
  else if (perMonth <= surplus) status = 'tight';
  else status = 'hard';
  const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - now.getTime()) / DAY) : null;
  return { target, saved, left, months, perMonth, progress, status, daysLeft };
};

export const GOAL_STATUS = {
  done: { label: 'Reached', tone: 'green' },
  easy: { label: 'On track', tone: 'green' },
  tight: { label: 'Possible, but tight', tone: 'amber' },
  hard: { label: 'More than you usually save', tone: 'red' },
  late: { label: 'Date has passed', tone: 'red' },
  unknown: { label: 'Add more history to check', tone: 'brand' },
};
