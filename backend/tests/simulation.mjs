// Simulation test: plays many random (but repeatable) sessions against a running FinCopilot API
// and checks, after every step, that the money and the numbers still add up.
//
//   node tests/simulation.mjs [apiUrl] [runs] [stepsPerRun] [seed]
//   e.g. node tests/simulation.mjs http://localhost:5000/api 40 40 7
//
// Prints a summary and writes simulation-result.json next to this file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.argv[2] || 'http://localhost:5000/api';
const RUNS = Number(process.argv[3]) || 40;
const STEPS = Number(process.argv[4]) || 40;
const SEED = Number(process.argv[5]) || 7;

// Small seeded random generator, so every run can be repeated exactly.
let state = SEED >>> 0;
const rand = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const amountOf = (kind) =>
  ({
    tiny: () => Math.round(rand() * 99 + 1),
    small: () => Math.round(rand() * 900 + 100),
    medium: () => Math.round(rand() * 9000 + 1000),
    large: () => Math.round(rand() * 40000 + 10000),
    huge: () => Math.round(rand() * 60000 + 50000),
    paise: () => Math.round((rand() * 500 + 1) * 100) / 100,
  })[kind]();

const USERS = { S: 'user_siddhartha', R: 'user_rahul' };
const PHONES = { S: '9876543210', R: '9123456780' };
const OUTSIDE = ['9823456781', '9988776655', '9012345678'];

const timings = {};
const time = async (label, fn) => {
  const t0 = performance.now();
  const out = await fn();
  (timings[label] ||= []).push(performance.now() - t0);
  return out;
};
const call = (method, route, body) =>
  time(`${method} ${route.split('?')[0].replace(/\/(emi_|[a-z0-9]{16,})[^/]*/gi, '/:id')}`, async () => {
    const res = await fetch(`${API}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON responses are reported as failures below.
    }
    return { status: res.status, body: json };
  });
const dash = async (who) => (await call('GET', `/account/dashboard?userId=${USERS[who]}`)).body.data;

const { simulateSpend } = await import('../../frontend/src/lib/affordability.js');

const checks = {};
const failures = [];
const check = (name, ok, detail) => {
  checks[name] ||= { pass: 0, fail: 0 };
  if (ok) checks[name].pass += 1;
  else {
    checks[name].fail += 1;
    if (failures.length < 40) failures.push({ check: name, ...detail });
  }
};
const money = (n) => Math.round(Number(n) * 100) / 100;

// Rules every dashboard must follow.
const checkDashboard = (d, ctx) => {
  const m = d.metrics;
  check('balance is never negative', m.currentBalance >= 0, { ctx, balance: m.currentBalance });
  check(
    'balance = last bank check − paid since + received since',
    money(m.verifiedBalance - m.debitsSinceCheck + m.creditsSinceCheck) === money(m.currentBalance),
    { ctx, verified: m.verifiedBalance, paid: m.debitsSinceCheck, received: m.creditsSinceCheck, balance: m.currentBalance }
  );
  const expectSafe = m.nextEMI
    ? Math.max(0, m.currentBalance - m.totalUpcomingEMI - m.expectedNormalExpenses - m.safetyReserve)
    : m.currentBalance;
  check('safe to spend follows the formula', money(expectSafe) === money(m.safeToSpend), { ctx, expectSafe, got: m.safeToSpend });
  if (!m.nextEMI) check('with no EMI due, safe to spend = balance', money(m.safeToSpend) === money(m.currentBalance), { ctx });
  const expectStatus = !m.nextEMI
    ? 'SAFE'
    : m.currentBalance < m.totalUpcomingEMI + m.expectedNormalExpenses
      ? 'HIGH RISK'
      : m.currentBalance < m.totalUpcomingEMI + m.expectedNormalExpenses + m.safetyReserve || m.overdueCount > 0
        ? 'CAUTION'
        : 'SAFE';
  check('status matches the numbers', expectStatus === m.riskStatus, { ctx, expectStatus, got: m.riskStatus });
};

const counts = {};
const count = (k) => (counts[k] = (counts[k] || 0) + 1);

for (let run = 0; run < RUNS; run++) {
  await call('POST', '/account/reset');
  const s0 = await dash('S');
  const r0 = await dash('R');
  checkDashboard(s0, { run, step: 'start S' });
  checkDashboard(r0, { run, step: 'start R' });
  let bankGap = { S: -2000, R: 500 }; // money moved outside the app in the demo data

  for (let step = 0; step < STEPS; step++) {
    const who = pick(['S', 'S', 'R']);
    const other = who === 'S' ? 'R' : 'S';
    const action = pick(['payOther', 'payOther', 'payOutside', 'payOutside', 'receive', 'payEmi', 'checkBank', 'wrongPin', 'badInput', 'addEmi']);
    const ctx = { run, step, who, action };
    const before = await dash(who);
    const beforeOther = await dash(other);

    if (action === 'payOther' || action === 'payOutside') {
      const kind = pick(['tiny', 'small', 'small', 'medium', 'medium', 'large', 'huge', 'paise']);
      const amount = amountOf(kind);
      const predicted = simulateSpend(before.metrics, amount);
      const phone = action === 'payOther' ? PHONES[other] : pick(OUTSIDE);
      const res = await call('POST', '/transactions/payment', { userId: USERS[who], recipientPhone: phone, amount, upiPin: '1234' });
      const after = await dash(who);
      const bankHas = before.metrics.currentBalance + bankGap[who];
      if (amount <= 100000 && amount <= before.metrics.currentBalance && amount <= bankHas) {
        count('payments made');
        check('a payment within balance succeeds', res.status === 201, { ctx, amount, status: res.status, msg: res.body?.message });
        check('sender balance drops by exactly the amount', money(after.metrics.currentBalance) === money(before.metrics.currentBalance - amount), { ctx, amount });
        check('"Can I afford it?" predicted the new safe-to-spend', money(predicted.safeToSpend) === money(after.metrics.safeToSpend), { ctx, amount, predicted: predicted.safeToSpend, got: after.metrics.safeToSpend });
        check('"Can I afford it?" predicted the new status', predicted.status === after.metrics.riskStatus, { ctx, amount, predicted: predicted.status, got: after.metrics.riskStatus });
        if (action === 'payOther') {
          const otherAfter = await dash(other);
          check('the other account is credited immediately', money(otherAfter.metrics.currentBalance) === money(beforeOther.metrics.currentBalance + amount), { ctx, amount });
          check('no money is created or lost between the two accounts', money(after.metrics.currentBalance + otherAfter.metrics.currentBalance) === money(before.metrics.currentBalance + beforeOther.metrics.currentBalance), { ctx });
          check('the receiver sees the payment in their history', otherAfter.recentTransactions.some((t) => t.type === 'credit' && money(t.amount) === money(amount)), { ctx, amount });
        }
      } else {
        count(amount > 100000 ? 'payments refused (over the ₹1 lakh UPI limit)' : 'payments refused (not enough money)');
        check('a payment above the balance is refused cleanly', res.status === 400, { ctx, amount, status: res.status });
        check('a refused payment moves no money', money(after.metrics.currentBalance) === money(before.metrics.currentBalance), { ctx });
      }
      checkDashboard(after, ctx);
    } else if (action === 'receive') {
      const amount = amountOf(pick(['small', 'medium', 'large']));
      const res = await call('POST', '/transactions/receive', { userId: USERS[who], amount, senderName: 'Simulated sender' });
      const after = await dash(who);
      count('credits received');
      check('a credit succeeds', res.status === 201, { ctx, status: res.status });
      check('a credit raises the balance by exactly the amount', money(after.metrics.currentBalance) === money(before.metrics.currentBalance + amount), { ctx });
      checkDashboard(after, ctx);
    } else if (action === 'payEmi') {
      const emi = before.emis.find((e) => e.status === 'upcoming' || e.status === 'overdue');
      if (!emi) continue;
      const res = await call('POST', `/emi/${emi._id}/pay`, { userId: USERS[who], upiPin: '1234' });
      const after = await dash(who);
      const affordable = emi.amount <= before.metrics.currentBalance && emi.amount <= before.metrics.currentBalance + bankGap[who];
      if (affordable) {
        count('EMIs paid');
        check('an affordable EMI payment succeeds', res.status === 200, { ctx, status: res.status, msg: res.body?.message });
        check('EMI payment takes exactly the EMI amount', money(after.metrics.currentBalance) === money(before.metrics.currentBalance - emi.amount), { ctx });
        check('a paid EMI is marked paid', after.emis.find((e) => e._id === emi._id)?.status === 'paid_this_cycle', { ctx });
        const again = await call('POST', `/emi/${emi._id}/pay`, { userId: USERS[who], upiPin: '1234' });
        check('the same EMI cannot be paid twice', again.status === 400, { ctx, status: again.status });
      } else {
        count('EMI payments refused (not enough money)');
        check('an unaffordable EMI payment is refused', res.status === 400, { ctx, status: res.status });
      }
      checkDashboard(after, ctx);
    } else if (action === 'checkBank') {
      const res = await call('POST', '/account/check-balance', { userId: USERS[who], upiPin: '1234' });
      const after = await dash(who);
      count('bank balance checks');
      check('a balance check succeeds', res.status === 200, { ctx, status: res.status });
      check('the check finds exactly the money moved outside the app', money(res.body?.data?.difference) === money(bankGap[who]), { ctx, expected: bankGap[who], got: res.body?.data?.difference });
      check('after a check, the app balance equals the bank balance', money(after.metrics.currentBalance) === money(res.body?.data?.verifiedBalance), { ctx });
      bankGap[who] = 0;
      checkDashboard(after, ctx);
    } else if (action === 'wrongPin') {
      const res = await call('POST', '/transactions/payment', { userId: USERS[who], recipientPhone: pick(OUTSIDE), amount: 10, upiPin: '0000' });
      const ok = await call('POST', '/account/check-balance', { userId: USERS[who], upiPin: '1234' });
      count('wrong PIN attempts');
      check('a wrong PIN is refused', res.status === 400, { ctx, status: res.status });
      check('a correct PIN after one mistake still works', ok.status === 200, { ctx, status: ok.status });
      bankGap[who] = 0;
    } else if (action === 'badInput') {
      const bad = pick([
        { amount: 0 },
        { amount: -50 },
        { amount: 'abc' },
        { amount: 100001 },
        { amount: 10, recipientPhone: '12345' },
        { amount: 10, recipientPhone: '', recipientUpi: '', recipientName: '' },
        { amount: 10, upiPin: '12' },
        { amount: 10, upiPin: undefined },
      ]);
      const res = await call('POST', '/transactions/payment', { userId: USERS[who], recipientPhone: pick(OUTSIDE), upiPin: '1234', ...bad });
      const after = await dash(who);
      count('bad inputs tried');
      check('bad input is refused with a clear 4xx error, never a crash', res.status >= 400 && res.status < 500 && typeof res.body?.message === 'string', { ctx, bad, status: res.status });
      check('bad input moves no money', money(after.metrics.currentBalance) === money(before.metrics.currentBalance), { ctx, bad });
    } else if (action === 'addEmi') {
      if (before.emis.length >= 3) continue;
      const res = await call('POST', '/emi', { userId: USERS[who], name: 'Simulated loan', amount: amountOf('medium'), dueDay: 1 + Math.floor(rand() * 31) });
      const after = await dash(who);
      count('EMIs added');
      check('adding a valid EMI works', res.status === 201, { ctx, status: res.status });
      check('a new EMI is never overdue on the day it is added', after.emis.every((e) => e._id !== res.body?.data?._id || e.status !== 'overdue'), { ctx });
      checkDashboard(after, ctx);
    }
  }
}

// Wrong-PIN lockout, once at the end.
await call('POST', '/account/reset');
const tries = [];
for (let i = 0; i < 4; i++) tries.push((await call('POST', '/account/check-balance', { userId: USERS.R, upiPin: '9999' })).status);
check('3 wrong PINs lock the PIN (423)', tries[2] === 423 && tries[3] === 423, { tries });
await call('POST', '/account/reset');

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};
const speed = Object.fromEntries(
  Object.entries(timings).map(([k, v]) => [k, { calls: v.length, typicalMs: pct(v, 50), slowestMostMs: pct(v, 95), maxMs: Math.round(Math.max(...v)) }])
);
const totalChecks = Object.values(checks).reduce((n, c) => n + c.pass + c.fail, 0);
const failed = Object.values(checks).reduce((n, c) => n + c.fail, 0);
const result = { api: API, runs: RUNS, stepsPerRun: STEPS, seed: SEED, totalChecks, failed, counts, checks, speed, failures };

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'simulation-result.json');
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(`API ${API}: ${RUNS} runs × ${STEPS} steps, seed ${SEED}`);
console.log(`checks: ${totalChecks}, failed: ${failed}`);
console.log('actions:', JSON.stringify(counts));
for (const [k, c] of Object.entries(checks)) if (c.fail) console.log(`FAIL ${k}: ${c.fail}/${c.pass + c.fail}`);
console.log('speed (ms):', JSON.stringify(speed));
if (failures.length) console.log('first failures:', JSON.stringify(failures.slice(0, 5), null, 1));
process.exit(failed ? 1 : 0);
