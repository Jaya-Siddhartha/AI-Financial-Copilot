// Unit tests for the financial engine's date handling. Every test fixes "now" so results do
// not depend on the day the suite runs.
// Usage: npm test (from backend/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFinancialState, enrichEmi, getDaysUntil } from '../src/services/financialEngine.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const emi = (overrides) => ({
  name: 'Car loan',
  lender: 'Bank',
  amount: 10000,
  dueDay: 10,
  remainingInstallments: 12,
  createdAt: at(2026, 1, 1).toISOString(),
  ...overrides,
});

test('a due day past the end of the month falls on its last day', () => {
  assert.equal(getDaysUntil(31, at(2026, 9, 28)), 2); // 30 September
  assert.equal(getDaysUntil(31, at(2026, 2, 27)), 1); // 28 February 2026
  assert.equal(getDaysUntil(31, at(2026, 10, 1)), 30); // 31 October
});

test('an unpaid EMI whose due date has passed is overdue', () => {
  const e = enrichEmi(emi({ dueDay: 10 }), at(2026, 9, 14));
  assert.equal(e.status, 'overdue');
  assert.equal(e.daysOverdue, 4);
  assert.equal(e.daysRemaining, 0);
  assert.equal(e.urgencyLevel, 'critical');
});

test('an EMI paid before its due date is not overdue afterwards', () => {
  const paid = emi({ dueDay: 10, lastPaidDate: at(2026, 9, 8).toISOString() });
  assert.equal(enrichEmi(paid, at(2026, 9, 9)).status, 'paid_this_cycle');
  assert.equal(enrichEmi(paid, at(2026, 9, 14)).status, 'upcoming'); // next one: 10 October
});

test('an EMI added after its due day this month is not overdue', () => {
  const fresh = emi({ dueDay: 5, createdAt: at(2026, 9, 20).toISOString() });
  const e = enrichEmi(fresh, at(2026, 9, 21));
  assert.equal(e.status, 'upcoming');
  assert.equal(e.daysRemaining, 14);
});

test('an overdue EMI raises a safe account to Caution and is mentioned first', () => {
  const a = analyzeFinancialState({
    account: { currentBalance: 200000 },
    emis: [emi({ dueDay: 10 })],
    now: at(2026, 9, 14),
  });
  assert.equal(a.overdueCount, 1);
  assert.equal(a.riskStatus, 'CAUTION');
  assert.match(a.advice, /late/);
});

test('daily spending only counts the last 30 days', () => {
  const now = at(2026, 9, 28);
  const tx = (daysAgo, amount) => ({
    type: 'debit',
    category: 'Shopping & Lifestyle',
    amount,
    date: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
  });
  const a = analyzeFinancialState({
    account: { currentBalance: 100000 },
    transactions: [tx(3, 15000), tx(45, 90000), tx(120, 90000)],
    now,
  });
  assert.equal(a.discretionarySpend, 15000);
  assert.equal(a.dailyBurnRate, 500);
});

test('the 7-day projection deducts a 31st-day EMI on the last day of a 30-day month', () => {
  const a = analyzeFinancialState({
    account: { currentBalance: 100000 },
    emis: [emi({ dueDay: 31, amount: 7000, createdAt: at(2026, 9, 1).toISOString() })],
    now: at(2026, 9, 27),
  });
  const sept30 = a.projected7Days.find((d) => d.day === 3);
  assert.equal(sept30.emiDeduction, 7000);
});

test('the long-range outlook shows a shortfall instead of stopping at zero', () => {
  const a = analyzeFinancialState({
    user: { monthlyIncome: 10000, salaryDate: 1 },
    account: { currentBalance: 5000 },
    emis: [emi({ dueDay: 20, amount: 20000 })],
    now: at(2026, 9, 14),
  });
  const ninety = a.forecastHorizons.find((h) => h.horizonDays === 90);
  assert.ok(ninety.projectedNetEndingBalance < 0);
  assert.equal(ninety.shortfall, true);
});
