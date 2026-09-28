// Realistic sample data for trying FinCopilot or demoing it: three months of a salaried person's
// money, two EMIs, a credit score history and two goals. Dates are relative to "now" and the
// numbers come from a fixed seed, so the same day always gives the same data.

import { CATEGORIES } from './categories.js';

const DAY = 86400000;
const dateAt = (y, m, d, h = 12, min = 0) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()), h, min);
const iso = (d) => d.toISOString();
const dayString = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The most recent due date on or before today, and the one before that.
const lastDue = (dueDay, now) => {
  const thisMonth = dateAt(now.getFullYear(), now.getMonth(), dueDay, 0);
  return thisMonth <= now ? thisMonth : dateAt(now.getFullYear(), now.getMonth() - 1, dueDay, 0);
};

export const buildSampleData = (now = new Date()) => {
  let seed = 20260929;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const between = (a, b) => Math.round(a + rand() * (b - a));

  const tx = [];
  const add = (date, description, amount, type, category, source = 'manual') => {
    if (date > now) return;
    tx.push({ id: `s${tx.length + 1}`, date: iso(date), description, amount, type, category, note: '', source, statementId: null, emiId: null });
  };

  const car = { id: 'sample-emi-car', name: 'Car loan', lender: 'HDFC Bank', amount: 8500, dueDay: 7, totalMonths: 36, principal: 260000, interestRate: 9.5, autopay: true };
  const phone = { id: 'sample-emi-phone', name: 'Phone EMI', lender: 'Bajaj Finance', amount: 2499, dueDay: 15, totalMonths: 12, principal: 28000, interestRate: 14, autopay: false };

  for (let back = 3; back >= 0; back--) {
    const y = now.getFullYear();
    const m = now.getMonth() - back;
    add(dateAt(y, m, 1, 9, 5), 'Salary from Acme Tech Pvt Ltd', 52000, 'credit', CATEGORIES.INCOME);
    add(dateAt(y, m, 3, 10, 30), 'Paid to Ramesh Kumar (house rent)', 12000, 'debit', CATEGORIES.RENT);
    add(dateAt(y, m, 5, 7, 0), 'Netflix subscription', 649, 'debit', CATEGORIES.ENTERTAINMENT);
    add(dateAt(y, m, 7, 6, 0), 'Autopay: Car loan EMI (HDFC Bank)', car.amount, 'debit', CATEGORIES.EMI, 'autopay');
    add(dateAt(y, m, 10, 11, 0), 'BESCOM electricity bill', between(1100, 1700), 'debit', CATEGORIES.BILLS);
    add(dateAt(y, m, 10, 11, 5), 'Zerodha SIP', 3000, 'debit', CATEGORIES.INVESTMENT);
    add(dateAt(y, m, 15, 18, 0), 'Phone EMI (Bajaj Finance)', phone.amount, 'debit', CATEGORIES.EMI);
    add(dateAt(y, m, 20, 20, 0), 'Jio recharge', 299, 'debit', CATEGORIES.RECHARGE);
    add(dateAt(y, m, between(12, 26), 16, 0), 'Amazon order', between(1200, 3400), 'debit', CATEGORIES.SHOPPING);
    add(dateAt(y, m, between(8, 25), 19, 0), 'Received from Anil (dinner share)', between(400, 900), 'credit', CATEGORIES.RECEIVED);
    for (let d = 2; d <= 30; d += 7) add(dateAt(y, m, d + between(0, 2), 18, 30), pick(rand, ['DMart groceries', 'Blinkit', 'Reliance Fresh', 'Zepto']), between(650, 1650), 'debit', CATEGORIES.GROCERIES);
    for (let d = 1; d <= 30; d += between(3, 5)) add(dateAt(y, m, d, 21, 0), pick(rand, ['Swiggy', 'Zomato', 'Chai Point', 'Udupi Cafe']), between(150, 620), 'debit', CATEGORIES.FOOD);
    for (let d = 2; d <= 30; d += between(4, 6)) add(dateAt(y, m, d, 9, 0), pick(rand, ['Uber India', 'Namma Metro', 'Indian Oil petrol', 'Rapido']), between(90, 900), 'debit', CATEGORIES.TRANSPORT);
  }

  const carLast = lastDue(car.dueDay, now);
  const phoneLast = lastDue(phone.dueDay, now);
  const threeMonthsAgo = new Date(now.getTime() - 100 * DAY);
  const emis = [
    { ...car, remainingMonths: 20, paidThroughDate: dayString(carLast), lastPaidDate: iso(carLast), createdAt: iso(threeMonthsAgo) },
    { ...phone, remainingMonths: 6, paidThroughDate: dayString(phoneLast), lastPaidDate: iso(phoneLast), createdAt: iso(threeMonthsAgo) },
  ];

  // Bank balance matched two days ago; everything after that is counted from the transactions.
  const matched = new Date(now.getTime() - 2 * DAY);
  const profile = {
    id: 'me',
    fullName: 'Priya Sharma',
    monthlyIncome: 52000,
    salaryDay: 1,
    bufferEnabled: true,
    bufferAmount: 3000,
    balanceAmount: 41250,
    balanceDate: iso(matched),
    onboarded: true,
  };

  const creditScores = [
    { id: 'sample-score-1', score: 731, bureau: 'CIBIL', date: dayString(new Date(now.getTime() - 200 * DAY)), source: 'manual' },
    { id: 'sample-score-2', score: 748, bureau: 'Experian', date: dayString(new Date(now.getTime() - 95 * DAY)), source: 'manual' },
    { id: 'sample-score-3', score: 762, bureau: 'CIBIL', date: dayString(new Date(now.getTime() - 20 * DAY)), source: 'manual' },
  ];

  const goals = [
    { id: 'sample-goal-1', name: 'Emergency fund', target: 100000, saved: 35000, targetDate: dayString(dateAt(now.getFullYear(), now.getMonth() + 10, 1)), createdAt: iso(threeMonthsAgo) },
    { id: 'sample-goal-2', name: 'Diwali gifts', target: 15000, saved: 6000, targetDate: dayString(dateAt(now.getFullYear(), now.getMonth() + 2, 20)), createdAt: iso(threeMonthsAgo) },
  ];

  return { profile, transactions: tx, emis, statements: [], creditScores, goals, sample: true };
};

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}
