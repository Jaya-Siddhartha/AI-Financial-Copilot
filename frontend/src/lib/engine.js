// FinCopilot money engine. Pure functions (no network, no storage), so every number on screen
// is worked out instantly on the device and can be unit tested with a fixed "now".

import { CATEGORIES, isFixed } from './categories.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const PAID_CYCLE_DAYS = 25;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const dueDateIn = (y, m, dueDay) => new Date(y, m, Math.min(Number(dueDay), daysInMonth(y, m)));
const round2 = (n) => Math.round(n * 100) / 100;

// 'YYYY-MM-DD' (a date column) → local midnight. Full ISO timestamps are parsed normally.
export const parseDay = (value) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
};
export const toDayString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Days from today until the next `dueDay` (1–31). A due day beyond the month's length falls on
// the month's last day.
export const getDaysUntil = (dueDay, now = new Date()) => {
  const today = startOfDay(now);
  let due = dueDateIn(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) due = dueDateIn(today.getFullYear(), today.getMonth() + 1, dueDay);
  return Math.round((due - today) / DAY_MS);
};

// A payment records the due date it covers (paidThroughDate). Older records without it count if
// paid within 25 days before the due date.
const paidFor = (emi, dueDate) => {
  if (emi.paidThroughDate) return parseDay(emi.paidThroughDate) >= dueDate;
  return Boolean(emi.lastPaidDate) && new Date(emi.lastPaidDate).getTime() > dueDate.getTime() - PAID_CYCLE_DAYS * DAY_MS;
};

// Adds status ('upcoming' | 'overdue' | 'paid' | 'closed'), countdown and the due date the next
// payment covers.
export const enrichEmi = (emi, now = new Date()) => {
  const today = startOfDay(now);
  const dueDay = Number(emi.dueDay) || 1;
  const daysUntilNext = getDaysUntil(dueDay, now);
  const nextDue = new Date(today.getTime() + daysUntilNext * DAY_MS);
  const prevDue = dueDateIn(nextDue.getFullYear(), nextDue.getMonth() - 1, dueDay);
  const created = emi.createdAt ? startOfDay(new Date(emi.createdAt)) : null;

  const closed = Number(emi.remainingMonths) <= 0;
  const overdue = !closed && (!created || prevDue >= created) && !paidFor(emi, prevDue);
  const paid = !closed && !overdue && paidFor(emi, nextDue);
  const daysOverdue = overdue ? Math.round((today - prevDue) / DAY_MS) : 0;
  const status = closed ? 'closed' : overdue ? 'overdue' : paid ? 'paid' : 'upcoming';
  const dueDate = overdue ? prevDue : nextDue;

  return {
    ...emi,
    status,
    daysRemaining: overdue ? 0 : daysUntilNext,
    daysOverdue,
    dueDate: dueDate.toISOString(),
    coversDueDate: toDayString(dueDate),
  };
};

// EMIs with autopay switched on whose due date has arrived and which are not yet paid.
export const autopayDue = (emis, now = new Date()) =>
  emis
    .filter((e) => e.autopay)
    .map((e) => enrichEmi(e, now))
    .filter((e) => e.status === 'overdue' || (e.status === 'upcoming' && e.daysRemaining === 0));

// A single payment above this is a one-off (a big purchase or transfer), not everyday spending.
export const oneOffThreshold = (monthlyIncome) => Math.max(5000, Math.round((Number(monthlyIncome) || 0) * 0.2));

// Balance = the amount last confirmed with the bank + money in − money out since then.
export const computeBalance = (profile, transactions) => {
  if (profile.balanceAmount === null || profile.balanceAmount === undefined) return null;
  const since = profile.balanceDate ? new Date(profile.balanceDate).getTime() : 0;
  let credits = 0;
  let debits = 0;
  for (const t of transactions) {
    if (new Date(t.date).getTime() <= since) continue;
    if (t.type === 'credit') credits += Number(t.amount);
    else debits += Number(t.amount);
  }
  return {
    balance: round2(Number(profile.balanceAmount) + credits - debits),
    anchor: Number(profile.balanceAmount),
    anchorDate: profile.balanceDate,
    creditsSince: round2(credits),
    debitsSince: round2(debits),
  };
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const normalizeName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[0-9]+/g, '')
    .replace(/(upi|paid to|sent to|payment to|ref|txn|id|no)[:\s-]*/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);

export const analyze = ({ profile, transactions = [], emis = [], now = new Date(), extraSpend = 0 }) => {
  const txs = extraSpend > 0
    ? [...transactions, { date: now.toISOString(), amount: extraSpend, type: 'debit', category: CATEGORIES.OTHER, description: 'What-if', hypothetical: true }]
    : transactions;
  const income = Number(profile.monthlyIncome) || 0;
  const bigPayment = oneOffThreshold(income);
  const bal = computeBalance(profile, txs);
  const balance = bal ? Math.max(0, bal.balance) : null;

  // 1. Usual daily spending: everyday (not fixed, not one-off) debits over the days of data we
  // have in the last 30 days.
  const windowStart = now.getTime() - WINDOW_DAYS * DAY_MS;
  let everyday = 0;
  let earliest = now.getTime();
  const categoryMap = {};
  let windowDebits = 0;
  for (const t of txs) {
    const time = new Date(t.date).getTime();
    if (time < windowStart || time > now.getTime() || t.type !== 'debit') continue;
    earliest = Math.min(earliest, time);
    const amt = Number(t.amount);
    windowDebits += amt;
    if (!t.hypothetical) categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
    if (!isFixed(t.category) && amt <= bigPayment) everyday += amt;
  }
  const daysOfData = Math.min(WINDOW_DAYS, Math.max(7, Math.ceil((now.getTime() - earliest) / DAY_MS)));
  const dailySpend = Math.round(everyday / daysOfData);
  const lowData = txs.filter((t) => !t.hypothetical).length < 5;

  // 2. EMIs
  const enriched = emis.map((e) => enrichEmi(e, now)).sort((a, b) => a.daysRemaining - b.daysRemaining || b.daysOverdue - a.daysOverdue);
  const unpaid = enriched.filter((e) => e.status === 'upcoming' || e.status === 'overdue');
  // Only EMIs due within the next month are protected now; later ones are next month's job.
  const dueSoon = unpaid.filter((e) => e.daysRemaining <= 31);
  const nextEmi = dueSoon[0] || null;
  const totalDue = dueSoon.reduce((s, e) => s + Number(e.amount), 0);
  const overdue = enriched.filter((e) => e.status === 'overdue');
  const daysToEmi = nextEmi ? Math.max(1, nextEmi.daysRemaining) : 0;

  // 3. Safe to spend
  const buffer = profile.bufferEnabled ? Number(profile.bufferAmount) || 0 : 0;
  const expectedSpend = nextEmi ? dailySpend * daysToEmi : 0;
  const safeToSpend = balance === null ? null : Math.max(0, round2(balance - totalDue - expectedSpend - buffer));

  let status = 'SAFE';
  let shortBy = 0;
  if (balance !== null && nextEmi) {
    if (balance < totalDue + expectedSpend) {
      status = 'HIGH RISK';
      shortBy = round2(totalDue + expectedSpend - balance);
    } else if (balance < totalDue + expectedSpend + buffer) status = 'CAUTION';
  }
  if (status === 'SAFE' && overdue.length) status = 'CAUTION';

  // 4. This month vs your usual month
  const thisMonth = monthKey(now);
  const monthly = {};
  for (const t of txs) {
    if (t.hypothetical) continue;
    const d = new Date(t.date);
    if (d > now) continue;
    const k = monthKey(d);
    monthly[k] ||= { key: k, spent: 0, everyday: 0, income: 0, categories: {} };
    const amt = Number(t.amount);
    if (t.type === 'credit') monthly[k].income += amt;
    else {
      monthly[k].spent += amt;
      if (!isFixed(t.category)) monthly[k].everyday += amt;
      monthly[k].categories[t.category] = (monthly[k].categories[t.category] || 0) + amt;
    }
  }
  const pastMonths = Object.values(monthly)
    .filter((m) => m.key < thisMonth)
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, 3);
  const avgEveryday = pastMonths.length ? pastMonths.reduce((s, m) => s + m.everyday, 0) / pastMonths.length : null;
  const cur = monthly[thisMonth] || { spent: 0, everyday: 0, income: 0, categories: {} };
  const dayFraction = now.getDate() / daysInMonth(now.getFullYear(), now.getMonth());
  const pace = avgEveryday
    ? {
        spentSoFar: round2(cur.everyday),
        usualByNow: Math.round(avgEveryday * dayFraction),
        usualMonth: Math.round(avgEveryday),
        ahead: cur.everyday > avgEveryday * dayFraction * 1.15 && cur.everyday - avgEveryday * dayFraction > 500,
      }
    : null;

  const spikes = [];
  if (pastMonths.length) {
    for (const [cat, amt] of Object.entries(cur.categories)) {
      if (isFixed(cat)) continue;
      const avg = pastMonths.reduce((s, m) => s + (m.categories[cat] || 0), 0) / pastMonths.length;
      if (avg > 0 && amt > avg * 1.3 && amt - avg > 500) spikes.push({ category: cat, thisMonth: round2(amt), usual: Math.round(avg) });
    }
    spikes.sort((a, b) => b.thisMonth - b.usual - (a.thisMonth - a.usual));
  }

  // 5. Repeating payments (subscriptions, rent, SIPs): same payee in 2+ months, similar amount.
  const byPayee = {};
  for (const t of txs) {
    if (t.type !== 'debit' || t.hypothetical || t.source === 'autopay') continue;
    const name = normalizeName(t.description);
    if (name.length < 3) continue;
    (byPayee[name] ||= []).push(t);
  }
  const recurring = Object.entries(byPayee)
    .map(([name, list]) => {
      const months = new Set(list.map((t) => monthKey(new Date(t.date))));
      const amounts = list.map((t) => Number(t.amount));
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const steady = amounts.every((a) => Math.abs(a - avg) <= avg * 0.15);
      return { name, label: list[0].description, months: months.size, amount: Math.round(avg), category: list[0].category, steady };
    })
    .filter((r) => r.months >= 2 && r.steady)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // 6. Charts
  const windowTotal = Object.values(categoryMap).reduce((s, a) => s + a, 0);
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount: round2(amount), percentage: windowTotal ? Math.round((amount / windowTotal) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    trend.push({
      key: k,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      spent: round2(monthly[k]?.spent || 0),
      income: round2(monthly[k]?.income || 0),
    });
  }

  const projection = [];
  if (balance !== null) {
    let running = balance;
    let stillDue = totalDue;
    for (let i = 0; i <= 7; i++) {
      const day = new Date(now.getTime() + i * DAY_MS);
      let emiOut = 0;
      for (const e of dueSoon) {
        const dueToday = e.status === 'overdue' ? i === 1 : Math.min(Number(e.dueDay), daysInMonth(day.getFullYear(), day.getMonth())) === day.getDate() && i > 0;
        if (dueToday) emiOut += Number(e.amount);
      }
      if (i > 0) {
        running = Math.max(0, running - dailySpend - emiOut);
        stillDue -= emiOut;
      }
      projection.push({
        day: i,
        date: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        balance: Math.round(running),
        stillDue: Math.round(stillDue),
        // Below what the EMIs still to come need.
        risk: stillDue > 0 && running < stillDue,
      });
    }
  }

  const events = dueSoon.map((e) => ({ type: 'emi', title: e.name, amount: Number(e.amount), daysRemaining: e.daysRemaining, overdue: e.status === 'overdue' }));
  if (income > 0) events.push({ type: 'salary', title: 'Salary', amount: income, daysRemaining: getDaysUntil(profile.salaryDay || 1, now) });
  events.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    balance,
    balanceInfo: bal,
    hasBalance: balance !== null,
    lowData,
    dailySpend,
    daysOfData,
    oneOffThreshold: bigPayment,
    emis: enriched,
    nextEmi,
    totalDue: round2(totalDue),
    overdue,
    expectedSpend: Math.round(expectedSpend),
    buffer,
    safeToSpend,
    status,
    shortBy,
    month: { spent: round2(cur.spent), income: round2(cur.income), everyday: round2(cur.everyday) },
    pace,
    spikes,
    recurring,
    categoryBreakdown,
    windowDebits: round2(windowDebits),
    trend,
    projection,
    events,
  };
};

// What the dashboard would show after spending `amount` now. Runs the same engine, so the
// prediction always matches what happens after a real payment.
export const whatIf = (input, amount) => analyze({ ...input, extraSpend: Number(amount) || 0 });
