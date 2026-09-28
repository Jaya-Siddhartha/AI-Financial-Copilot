// EMI calculator, credit health estimate, assistant answers and the AI number check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emiBurden, emiFor, loanSummary, yearlySchedule } from '../src/lib/emiCalc.js';
import { estimateCreditHealth } from '../src/lib/creditScore.js';
import { analyze } from '../src/lib/engine.js';
import { answer, factSheet, suggestions } from '../src/lib/advisor.js';
import { numbersGrounded } from '../src/lib/ai.js';

const NOW = new Date(2026, 8, 14, 12);

test('EMI maths matches the standard formula', () => {
  assert.equal(Math.round(emiFor(500000, 10.5, 36)), 16251);
  assert.equal(Math.round(emiFor(120000, 0, 12)), 10000);
  const s = loanSummary(500000, 10.5, 36);
  assert.equal(s.totalInterest, s.totalPayment - 500000);
  const years = yearlySchedule(500000, 10.5, 36);
  assert.equal(years.length, 3);
  assert.equal(years[2].owed, 0);
  assert.ok(Math.abs(years.reduce((t, y) => t + y.principal, 0) - 500000) <= 3);
});

test('EMI burden bands', () => {
  assert.equal(emiBurden(10000, 50000).level, 'good');
  assert.equal(emiBurden(18000, 50000).level, 'ok');
  assert.equal(emiBurden(24000, 50000).level, 'warn');
  assert.equal(emiBurden(30000, 50000).level, 'bad');
  assert.equal(emiBurden(1000, 0).level, 'unknown');
});

const input = (p = {}, emis = []) => ({
  profile: { monthlyIncome: 50000, salaryDay: 1, bufferEnabled: true, bufferAmount: 2000, balanceAmount: 30000, balanceDate: new Date(2026, 8, 1).toISOString(), ...p },
  transactions: [
    { date: new Date(2026, 8, 10).toISOString(), amount: 1200, type: 'debit', category: 'Food & Dining', description: 'Swiggy' },
    { date: new Date(2026, 8, 1).toISOString(), amount: 50000, type: 'credit', category: 'Salary & Income', description: 'Salary' },
  ],
  emis,
  now: NOW,
});

test('credit health: late EMIs and heavy EMI burden lower the estimate', () => {
  const good = input({}, [{ name: 'Car', amount: 8000, dueDay: 20, remainingMonths: 12, paidThroughDate: '2026-08-20', createdAt: '2026-01-01' }]);
  const bad = input({}, [
    { name: 'Car', amount: 20000, dueDay: 5, remainingMonths: 12, paidThroughDate: '2026-07-05', createdAt: '2026-01-01' },
    { name: 'Phone', amount: 9000, dueDay: 8, remainingMonths: 6, paidThroughDate: '2026-07-08', createdAt: '2026-01-01' },
  ]);
  const g = estimateCreditHealth({ analysis: analyze(good), transactions: good.transactions, profile: good.profile });
  const b = estimateCreditHealth({ analysis: analyze(bad), transactions: bad.transactions, profile: bad.profile });
  assert.ok(g.score > b.score);
  assert.ok(g.score >= 300 && g.score <= 900 && b.score >= 300);
  assert.equal(b.tone, 'red');
});

test('assistant answers use the real numbers', () => {
  const inp = input({}, [{ name: 'Car loan', amount: 8000, dueDay: 20, remainingMonths: 12, paidThroughDate: '2026-08-20', createdAt: '2026-01-01' }]);
  const analysis = analyze(inp);
  const ctx = { analysis, profile: inp.profile, credit: null, engineInput: inp };
  assert.match(answer('how much can i spend', ctx), new RegExp(`₹${analysis.safeToSpend.toLocaleString('en-IN')}`));
  assert.match(answer('can I afford 30k?', ctx), /Not right now|tight/);
  assert.match(answer('can i afford 500', ctx), /^Yes/);
  assert.match(answer('when is my emi due', ctx), /Car loan: ₹8,000, due in 6 days/);
  assert.ok(suggestions(ctx).length > 0);
  assert.match(factSheet(ctx), /Safe to spend now/);
});

test('AI answers with numbers that are not in the user data are rejected', () => {
  const facts = 'Balance ₹40,000. EMI ₹8,500. Safe to spend ₹25,085.';
  assert.equal(numbersGrounded('You can spend ₹25,085 and keep ₹8,500 for your EMI.', facts), true);
  assert.equal(numbersGrounded('That keeps ₹3,915 for EMIs.', facts), false);
  assert.equal(numbersGrounded('Cook at home more often.', facts), true);
});

test('money decisions are routed to the exact calculator, open questions to the AI', async () => {
  const { intentOf, DECISION_INTENTS } = await import('../src/lib/advisor.js');
  const decision = (q) => DECISION_INTENTS.includes(intentOf(q));
  assert.ok(decision('I want to buy a phone for 30000 next week. Is that a good idea?'));
  assert.ok(decision('Should I take a personal loan of 2 lakh for a trip?'));
  assert.ok(decision('How much can I spend today?'));
  assert.ok(decision('What is the one thing I should check every day?'));
  assert.ok(!decision('Give me 3 tips to spend less on food'));
  const inp = input({}, []);
  const ctx = { analysis: analyze(inp), profile: inp.profile, credit: null, engineInput: inp };
  const loan = answer('Should I take a loan of 2 lakh for a trip?', ctx);
  assert.match(loan, /₹2,00,000 over 24 months/);
  assert.match(loan, /saving up first/);
});
