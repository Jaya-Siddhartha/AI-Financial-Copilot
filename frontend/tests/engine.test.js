// Money engine tests. Every test fixes "now" so results never depend on the day they run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, autopayDue, computeBalance, enrichEmi, getDaysUntil, whatIf } from '../src/lib/engine.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const NOW = at(2026, 9, 14);
const profile = (p = {}) => ({ monthlyIncome: 50000, salaryDay: 1, bufferEnabled: true, bufferAmount: 2000, balanceAmount: 40000, balanceDate: at(2026, 9, 1).toISOString(), ...p });
const tx = (daysAgo, amount, type = 'debit', category = 'Food & Dining', description = 'Shop') => ({
  date: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(),
  amount,
  type,
  category,
  description,
});
const emi = (e = {}) => ({ id: 'e1', name: 'Car loan', amount: 8000, dueDay: 20, remainingMonths: 12, createdAt: at(2026, 1, 1).toISOString(), paidThroughDate: '2026-08-20', ...e });

test('balance = last bank figure + money in − money out since then', () => {
  const b = computeBalance(profile(), [tx(20, 999), tx(5, 1000), tx(3, 500, 'credit', 'Salary & Income')]);
  assert.equal(b.balance, 39500); // the ₹999 was before the bank figure and does not count
  assert.equal(b.debitsSince, 1000);
  assert.equal(b.creditsSince, 500);
  assert.equal(computeBalance(profile({ balanceAmount: null }), []), null);
});

test('safe to spend keeps money for EMIs, usual spending and the user-chosen buffer', () => {
  const a = analyze({ profile: profile(), transactions: [tx(2, 3000), tx(9, 4000)], emis: [emi()], now: NOW });
  assert.equal(a.nextEmi.daysRemaining, 6);
  assert.equal(a.dailySpend, 778); // ₹7,000 over the 9 days the data covers
  assert.equal(a.expectedSpend, 778 * 6);
  assert.equal(a.safeToSpend, 33000 - 8000 - 778 * 6 - 2000);
  assert.equal(a.status, 'SAFE');
});

test('turning the buffer off, or changing it, changes safe to spend by exactly that amount', () => {
  const base = { transactions: [tx(2, 3000)], emis: [emi()], now: NOW };
  const on = analyze({ ...base, profile: profile({ bufferAmount: 2000 }) });
  const off = analyze({ ...base, profile: profile({ bufferEnabled: false }) });
  const big = analyze({ ...base, profile: profile({ bufferAmount: 5000 }) });
  assert.equal(off.safeToSpend - on.safeToSpend, 2000);
  assert.equal(on.safeToSpend - big.safeToSpend, 3000);
});

test('with no EMI waiting, only the buffer is kept aside', () => {
  const paid = emi({ paidThroughDate: '2026-09-20' });
  const a = analyze({ profile: profile(), transactions: [tx(2, 3000)], emis: [paid], now: NOW });
  assert.equal(a.nextEmi, null);
  assert.equal(a.expectedSpend, 0);
  assert.equal(a.safeToSpend, 37000 - 2000);
  const noBuffer = analyze({ profile: profile({ bufferEnabled: false }), transactions: [tx(2, 3000)], emis: [paid], now: NOW });
  assert.equal(noBuffer.safeToSpend, noBuffer.balance);
});

test('"Can I afford it?" gives exactly what the dashboard shows after the payment', () => {
  const input = { profile: profile(), transactions: [tx(2, 3000), tx(9, 4000)], emis: [emi()], now: NOW };
  for (const amount of [500, 5000, 12000, 25000]) {
    const predicted = whatIf(input, amount);
    const actual = analyze({ ...input, transactions: [...input.transactions, { date: NOW.toISOString(), amount, type: 'debit', category: 'Other', description: 'x' }] });
    assert.equal(predicted.safeToSpend, actual.safeToSpend, `amount ${amount}`);
    assert.equal(predicted.status, actual.status, `amount ${amount}`);
  }
});

test('status turns HIGH RISK when the balance cannot cover the EMI plus usual spending', () => {
  const a = analyze({ profile: profile({ balanceAmount: 9000 }), transactions: [tx(2, 3000)], emis: [emi()], now: NOW });
  assert.equal(a.status, 'HIGH RISK');
  assert.ok(a.shortBy > 0);
});

test('a big one-off payment is not treated as usual daily spending', () => {
  const a = analyze({ profile: profile(), transactions: [tx(1, 40000, 'debit', 'Sent to people'), tx(2, 2800)], emis: [], now: NOW });
  assert.equal(a.oneOffThreshold, 10000);
  assert.equal(a.dailySpend, 400); // ₹2,800 over 7 days; the ₹40,000 transfer is left out
});

test('rent, EMIs and investments are not everyday spending', () => {
  const a = analyze({
    profile: profile(),
    transactions: [tx(3, 1400), tx(4, 9000, 'debit', 'Rent & Housing'), tx(5, 8000, 'debit', 'EMI & Loans'), tx(6, 3000, 'debit', 'Savings & Investments')],
    emis: [],
    now: NOW,
  });
  assert.equal(a.dailySpend, 200);
});

test('due days past the month end, overdue EMIs and early payments', () => {
  assert.equal(getDaysUntil(31, at(2026, 9, 28)), 2);
  assert.equal(getDaysUntil(31, at(2026, 2, 27)), 1);
  const late = enrichEmi(emi({ dueDay: 10, paidThroughDate: '2026-08-10' }), NOW);
  assert.equal(late.status, 'overdue');
  assert.equal(late.daysOverdue, 4);
  assert.equal(late.coversDueDate, '2026-09-10');
  const paidLate = enrichEmi({ ...late, paidThroughDate: late.coversDueDate }, NOW);
  assert.equal(paidLate.status, 'upcoming');
  const fresh = enrichEmi(emi({ dueDay: 5, createdAt: at(2026, 9, 10).toISOString(), paidThroughDate: null }), NOW);
  assert.equal(fresh.status, 'upcoming');
  const early = enrichEmi(emi({ dueDay: 13, createdAt: NOW.toISOString(), paidThroughDate: '2026-10-13' }), NOW);
  assert.equal(early.status, 'paid');
});

test('autopay picks up EMIs that are due today or late, but not others', () => {
  const due = autopayDue(
    [
      emi({ id: 'a', autopay: true, dueDay: 14, paidThroughDate: '2026-08-14' }),
      emi({ id: 'b', autopay: true, dueDay: 10, paidThroughDate: '2026-08-10' }),
      emi({ id: 'c', autopay: true, dueDay: 25, paidThroughDate: '2026-08-25' }),
      emi({ id: 'd', autopay: false, dueDay: 10, paidThroughDate: '2026-08-10' }),
    ],
    NOW
  );
  assert.deepEqual(due.map((e) => e.id).sort(), ['a', 'b']);
});

test('pace, category spikes and repeating payments are found', () => {
  const months = [];
  for (const [m, extra] of [[6, 0], [7, 0], [8, 0]]) {
    months.push({ date: at(2026, m, 5).toISOString(), amount: 649, type: 'debit', category: 'Entertainment', description: 'Netflix' });
    months.push({ date: at(2026, m, 12).toISOString(), amount: 3000 + extra, type: 'debit', category: 'Groceries', description: 'DMart' });
  }
  months.push({ date: at(2026, 9, 5).toISOString(), amount: 649, type: 'debit', category: 'Entertainment', description: 'Netflix' });
  months.push({ date: at(2026, 9, 10).toISOString(), amount: 6500, type: 'debit', category: 'Groceries', description: 'DMart' });
  const a = analyze({ profile: profile(), transactions: months, emis: [], now: NOW });
  assert.ok(a.pace.ahead);
  assert.equal(a.spikes[0].category, 'Groceries');
  assert.ok(a.recurring.some((r) => /netflix/i.test(r.label)));
});

test('the 7-day projection marks days that fall below what the EMIs need', () => {
  const a = analyze({ profile: profile({ balanceAmount: 10000, balanceDate: NOW.toISOString() }), transactions: [tx(2, 7000)], emis: [emi({ dueDay: 18 })], now: NOW });
  assert.equal(a.projection.length, 8);
  assert.ok(a.projection.some((d) => d.risk));
  assert.equal(a.projection.find((d) => d.day === 4).stillDue, 0); // paid on the 18th
});
