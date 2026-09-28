// Simulation test: thousands of random (but repeatable) money situations. After each one it
// checks that the numbers still follow the rules. Also writes random statements in four layouts
// and checks the reader gets back exactly what was written. Results: tests/simulation-report.json
//
//   npm test                       (default: 3,000 situations, 600 statements)
//   SIM_RUNS=20000 npm test        (more)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { analyze, computeBalance, enrichEmi, whatIf } from '../src/lib/engine.js';
import { estimateCreditHealth } from '../src/lib/creditScore.js';
import { parseRows, parseTextLines } from '../src/lib/statementParser.js';
import { CATEGORY_LIST } from '../src/lib/categories.js';
import { answer, intentOf, DECISION_INTENTS } from '../src/lib/advisor.js';

const RUNS = Number(process.env.SIM_RUNS) || 3000;
const STATEMENTS = Math.max(200, Math.round(RUNS / 5));
let seed = Number(process.env.SIM_SEED) || 20260928;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (l) => l[Math.floor(rand() * l.length)];
const DAY = 86400000;
const round2 = (n) => Math.round(n * 100) / 100;

const checks = {};
const failures = [];
const check = (name, ok, detail) => {
  checks[name] ||= { pass: 0, fail: 0 };
  if (ok) checks[name].pass++;
  else {
    checks[name].fail++;
    if (failures.length < 20) failures.push({ check: name, ...detail });
  }
};

const randomNow = () => {
  // Month ends, leap day and ordinary days, over two years.
  const special = [new Date(2028, 1, 29, 10), new Date(2026, 1, 28, 23), new Date(2026, 11, 31, 9), new Date(2027, 3, 30, 18), new Date(2026, 8, 30, 12)];
  return rand() < 0.2 ? pick(special) : new Date(2026, int(0, 23), int(1, 28), int(0, 23), int(0, 59));
};

const randomScenario = () => {
  const now = randomNow();
  const income = pick([0, 12000, 25000, 50000, 90000, 250000]);
  const profile = {
    monthlyIncome: income,
    salaryDay: int(1, 31),
    bufferEnabled: rand() < 0.7,
    bufferAmount: pick([0, 500, 1000, 2000, 3000, 5000, 15000]),
    balanceAmount: rand() < 0.08 ? null : round2(rand() * 150000),
    balanceDate: new Date(now.getTime() - int(0, 60) * DAY).toISOString(),
  };
  const transactions = Array.from({ length: int(0, 200) }, () => {
    const type = rand() < 0.25 ? 'credit' : 'debit';
    const size = pick([() => int(10, 500), () => int(500, 5000), () => int(5000, 60000), () => round2(rand() * 999)]);
    return {
      date: new Date(now.getTime() - rand() * 150 * DAY).toISOString(),
      amount: Math.max(1, size()),
      type,
      category: pick(CATEGORY_LIST),
      description: pick(['Swiggy', 'Rent', 'DMart', 'Salary', 'Netflix', 'Uber', 'Friend', 'ATM']),
    };
  });
  const emis = Array.from({ length: int(0, 4) }, (_, i) => {
    const dueDay = int(1, 31);
    const created = new Date(now.getTime() - int(0, 400) * DAY);
    const e = { id: `e${i}`, name: `Loan ${i}`, amount: int(500, 40000), dueDay, remainingMonths: int(0, 60), autopay: rand() < 0.5, createdAt: created.toISOString() };
    const state = rand();
    if (state < 0.4) e.paidThroughDate = enrichEmi(e, now).coversDueDate; // paid for the current cycle
    else if (state < 0.7) e.paidThroughDate = null;
    return e;
  });
  return { profile, transactions, emis, now };
};

test(`simulation: ${RUNS} random money situations follow the rules`, () => {
  const started = performance.now();
  let biggest = 0;
  for (let run = 0; run < RUNS; run++) {
    const input = randomScenario();
    const a = analyze(input);
    const ctx = { run, now: input.now.toISOString() };
    biggest = Math.max(biggest, input.transactions.length);

    // Balance
    const bal = computeBalance(input.profile, input.transactions);
    if (input.profile.balanceAmount === null) check('no bank figure → no balance, no safe-to-spend', a.balance === null && a.safeToSpend === null, ctx);
    else {
      const since = new Date(input.profile.balanceDate).getTime();
      const manual = input.transactions.reduce((s, t) => (new Date(t.date).getTime() > since ? s + (t.type === 'credit' ? t.amount : -t.amount) : s), input.profile.balanceAmount);
      check('balance = bank figure + in − out since then', round2(manual) === bal.balance, { ...ctx, manual, got: bal.balance });
      check('balance shown is never negative', a.balance >= 0, ctx);

      // Safe to spend
      const expect = Math.max(0, round2(a.balance - a.totalDue - a.expectedSpend - a.buffer));
      check('safe to spend = balance − EMIs due − usual spending − buffer', expect === a.safeToSpend, { ...ctx, expect, got: a.safeToSpend });
      check('safe to spend is never more than the balance', a.safeToSpend <= a.balance, ctx);
      if (!a.nextEmi) check('no EMI waiting → nothing kept for everyday spending', a.expectedSpend === 0 && a.totalDue === 0, ctx);
      check('buffer is exactly the user choice', a.buffer === (input.profile.bufferEnabled ? input.profile.bufferAmount : 0), ctx);

      // Status
      const status = !a.nextEmi
        ? a.overdue.length ? 'CAUTION' : 'SAFE'
        : a.balance < a.totalDue + a.expectedSpend
          ? 'HIGH RISK'
          : a.balance < a.totalDue + a.expectedSpend + a.buffer || a.overdue.length
            ? 'CAUTION'
            : 'SAFE';
      check('status matches the numbers', status === a.status, { ...ctx, status, got: a.status });

      // Buffer choices only ever move safe-to-spend the right way
      const off = analyze({ ...input, profile: { ...input.profile, bufferEnabled: false } });
      check('turning the buffer off never lowers safe to spend', off.safeToSpend >= a.safeToSpend, ctx);

      // "Can I afford it?" = the dashboard after a real payment
      const amount = int(1, 60000);
      const predicted = whatIf(input, amount);
      const after = analyze({ ...input, transactions: [...input.transactions, { date: input.now.toISOString(), amount, type: 'debit', category: 'Other', description: 'x' }] });
      check('"Can I afford it?" = the dashboard after spending', predicted.safeToSpend === after.safeToSpend && predicted.status === after.status, { ...ctx, amount });
      check('spending money never raises safe to spend', after.safeToSpend <= a.safeToSpend, { ...ctx, amount });

      // Projection
      check('7-day projection has 8 days and never goes up', a.projection.length === 8 && a.projection.every((d, i) => i === 0 || d.balance <= a.projection[i - 1].balance), ctx);
    }

    // EMIs
    for (const e of a.emis) {
      check('EMI countdown is between 0 and 31 days', e.daysRemaining >= 0 && e.daysRemaining <= 31, { ...ctx, e: e.dueDay });
      check('EMI has a valid status', ['upcoming', 'overdue', 'paid', 'closed'].includes(e.status), ctx);
      if (e.status === 'upcoming' || e.status === 'overdue') {
        const paid = enrichEmi({ ...e, paidThroughDate: e.coversDueDate }, input.now);
        check('after paying, an EMI is never still late', paid.status !== 'overdue', { ...ctx, dueDay: e.dueDay, covers: e.coversDueDate });
        if (e.status === 'upcoming') check('after paying an upcoming EMI it cannot be paid again this cycle', paid.status === 'paid' || paid.status === 'closed', { ...ctx, dueDay: e.dueDay, covers: e.coversDueDate, got: paid.status });
      }
    }

    // Credit health
    const credit = estimateCreditHealth({ analysis: a, transactions: input.transactions, profile: input.profile });
    check('credit health is between 300 and 900', credit.score >= 300 && credit.score <= 900, { ...ctx, score: credit.score });

    // Assistant
    const q = pick(['how much can i spend', 'can i afford 5000', 'when is my emi due', 'where does my money go', 'take a loan of 1 lakh?', 'what should i check every day']);
    const reply = answer(q, { analysis: a, profile: input.profile, credit, engineInput: input });
    check('assistant always answers in words', typeof reply === 'string' && reply.length > 10 && !/undefined|NaN/.test(reply), { ...ctx, q, reply });
    check('money questions go to the exact calculator', DECISION_INTENTS.includes(intentOf(q)), { ...ctx, q });
  }
  const ms = performance.now() - started;

  // Speed with a large history
  const big = randomScenario();
  big.transactions = Array.from({ length: 5000 }, (_, i) => ({ ...big.transactions[i % Math.max(1, big.transactions.length)] || { amount: 100, type: 'debit', category: 'Other', description: 'x' }, date: new Date(big.now.getTime() - (i % 365) * DAY).toISOString() }));
  const t0 = performance.now();
  analyze(big);
  const bigMs = performance.now() - t0;
  check('5,000 transactions are analysed in under 150 ms', bigMs < 150, { bigMs });

  globalThis.simReport = { runs: RUNS, totalMs: Math.round(ms), perSituationMs: Math.round((ms / RUNS) * 100) / 100, fiveThousandTxMs: Math.round(bigMs), biggestHistory: biggest };
  const failed = Object.values(checks).reduce((n, c) => n + c.fail, 0);
  assert.equal(failed, 0, JSON.stringify(failures.slice(0, 3), null, 1));
});

// Writes random statements in four layouts, then reads them back.
const LAYOUTS = {
  phonepe: (t) => {
    const d = new Date(t.date);
    return [`${d.toLocaleDateString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${t.type === 'debit' ? `Paid to ${t.name}` : `Received from ${t.name}`} ${t.type === 'debit' ? 'DEBIT' : 'CREDIT'} ₹${t.amount.toLocaleString('en-IN')}`, `Transaction ID T${int(1e9, 9e9)}`, 'Paid by XXXXXXXX4092'];
  },
  gpay: (t) => {
    const d = new Date(t.date);
    return [`${String(d.getDate()).padStart(2, '0')}${d.toLocaleDateString('en-US', { month: 'short' })},${d.getFullYear()} ${t.type === 'debit' ? `Paid to ${t.name}` : `Received from ${t.name}`} ₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, `UPI Transaction ID: ${int(1e11, 9e11)}`];
  },
  paytm: (t) => {
    const d = new Date(t.date);
    return [`${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()} ${t.type === 'debit' ? `Paid to ${t.name}` : `Received from ${t.name}`} ${t.type === 'debit' ? '-' : '+'} ₹${t.amount.toLocaleString('en-IN')}`];
  },
};

test(`simulation: ${STATEMENTS} random statements are read back exactly`, () => {
  const names = ['Swiggy', 'Rahul Sharma', 'DMart Store', 'Uber India', 'Priya Patel', 'Airtel Prepaid', 'Apollo Pharmacy', 'Zomato'];
  for (let s = 0; s < STATEMENTS; s++) {
    const layout = pick(['phonepe', 'gpay', 'paytm', 'bankCsv', 'bankText']);
    const base = new Date(2026, int(0, 11), int(1, 28), 12);
    const txs = Array.from({ length: int(1, 40) }, (_, i) => ({
      date: new Date(base.getTime() - i * int(0, 2) * DAY).toISOString(),
      amount: pick([int(1, 99), int(100, 9999), int(10000, 99999), round2(int(100, 5000) + rand())]),
      type: rand() < 0.3 ? 'credit' : 'debit',
      name: pick(names),
    }));
    let parsed;
    if (layout === 'bankCsv' || layout === 'bankText') {
      let balance = 100000;
      const rows = [['Date', 'Narration', 'Ref No', 'Withdrawal Amt', 'Deposit Amt', 'Closing Balance']];
      const lines = [`01/01/2026 Opening Balance ${balance.toFixed(2)}`];
      [...txs].reverse().forEach((t) => {
        balance = round2(balance + (t.type === 'credit' ? t.amount : -t.amount));
        const d = new Date(t.date);
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const narr = `UPI/${t.type === 'debit' ? 'DR' : 'CR'}/${int(100000, 999999)}/${t.name.toUpperCase()}`;
        rows.push([date, narr, String(int(1e9, 9e9)), t.type === 'debit' ? t.amount.toFixed(2) : '', t.type === 'credit' ? t.amount.toFixed(2) : '', balance.toFixed(2)]);
        lines.push(`${date} ${narr} ${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      });
      parsed = layout === 'bankCsv' ? parseRows(rows) : parseTextLines(lines);
      txs.reverse();
    } else {
      parsed = parseTextLines(['Statement', ...txs.flatMap(LAYOUTS[layout]), 'Page 1 of 1']);
    }
    const ctx = { statement: s, layout, count: txs.length };
    check('statement: every transaction is found', parsed.length === txs.length, { ...ctx, got: parsed.length });
    if (parsed.length === txs.length) {
      const ok = txs.every((t, i) => parsed[i].type === t.type && Math.abs(parsed[i].amount - t.amount) < 0.01 && new Date(parsed[i].date).toDateString() === new Date(t.date).toDateString());
      check('statement: amounts, directions and dates are exact', ok, { ...ctx, sample: parsed.slice(0, 2) });
    }
  }
  const failed = Object.entries(checks).filter(([k]) => k.startsWith('statement')).reduce((n, [, c]) => n + c.fail, 0);
  assert.equal(failed, 0, JSON.stringify(failures.filter((f) => f.check.startsWith('statement')).slice(0, 3), null, 1));
});

test('simulation report', () => {
  const total = Object.values(checks).reduce((n, c) => n + c.pass + c.fail, 0);
  const failed = Object.values(checks).reduce((n, c) => n + c.fail, 0);
  const report = { date: new Date().toISOString(), seed: Number(process.env.SIM_SEED) || 20260928, ...globalThis.simReport, statements: STATEMENTS, totalChecks: total, failed, checks, failures };
  fs.writeFileSync(new URL('./simulation-report.json', import.meta.url), JSON.stringify(report, null, 2));
  assert.ok(total > 0);
});
