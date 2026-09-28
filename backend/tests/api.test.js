// End-to-end API tests. Runs the Express app against a throwaway JSON data directory.
// Usage: npm test (from backend/)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincopilot-test-'));
process.env.FINCOPILOT_DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';
delete process.env.MONGODB_URI;

const { default: app } = await import('../src/server.js');

let server;
let baseUrl;

// API_URL runs the same tests against another implementation of the API
// (e.g. the in-browser demo backend wrapped in a small HTTP server).
before(async () => {
  if (process.env.API_URL) {
    baseUrl = process.env.API_URL;
    return;
  }
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server?.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const call = async (method, route, body) => {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const dashboard = async (userId) => (await call('GET', `/account/dashboard?userId=${userId}`)).body.data;
const reset = () => call('POST', '/account/reset');
const pay = (overrides) =>
  call('POST', '/transactions/payment', {
    userId: 'user_siddhartha',
    recipientPhone: '9123456780',
    amount: 1000,
    upiPin: '1234',
    ...overrides,
  });

test('health endpoint responds', async () => {
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'online');
});

test('demo scenario: payments, balance checks, EMIs and risk status', async () => {
  await reset();

  // 1-2. Both demo accounts load with their starting balances
  const a = await dashboard('user_siddhartha');
  assert.equal(a.user.name, 'Siddhartha');
  assert.equal(a.metrics.currentBalance, 50000);
  // Last bank check showed ₹50,800; ₹800 was spent in the app after it.
  assert.equal(a.metrics.verifiedBalance, 50800);
  assert.equal(a.metrics.verifiedBalance - a.metrics.debitsSinceCheck + a.metrics.creditsSinceCheck, a.metrics.currentBalance);
  const b = await dashboard('user_rahul');
  assert.equal(b.user.name, 'Rahul Sharma');
  assert.equal(b.metrics.currentBalance, 30000);

  // 5. Invalid mobile number is rejected
  assert.equal((await pay({ recipientPhone: '12345' })).status, 400);

  // 6. Wrong PIN is rejected
  const wrongPin = await pay({ upiPin: '9999', amount: 5000 });
  assert.equal(wrongPin.status, 400);
  assert.match(wrongPin.body.message, /UPI PIN/);

  // 3, 4, 7. Correct PIN moves money between the two accounts
  const ok = await pay({ amount: 5000 });
  assert.equal(ok.status, 201);
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, 45000);
  assert.equal((await dashboard('user_rahul')).metrics.currentBalance, 35000);
  const rahulTxs = (await call('GET', '/transactions?userId=user_rahul')).body.data;
  assert.ok(rahulTxs.some((t) => t.type === 'credit' && t.amount === 5000 && t.title.includes('Siddhartha')));

  // 8. Balance check finds the ₹2,000 cash withdrawal made outside the app and corrects the balance
  const check = await call('POST', '/account/check-balance', { userId: 'user_siddhartha', upiPin: '1234' });
  assert.equal(check.status, 200);
  assert.equal(check.body.data.verifiedBalance, 43000);
  assert.equal(check.body.data.difference, -2000);
  let s = await dashboard('user_siddhartha');
  assert.equal(s.metrics.currentBalance, 43000);
  assert.ok(s.recentTransactions.some((t) => t.category === 'Bank balance update' && t.amount === 2000));

  // 9. Later payments change the app balance but not the last bank figure
  await pay({ recipientPhone: '9823456781', amount: 2000 });
  s = await dashboard('user_siddhartha');
  assert.equal(s.metrics.currentBalance, 41000);
  assert.equal(s.metrics.verifiedBalance, 43000);

  // 10. Re-checking with nothing changed outside the app keeps the balance and moves the baseline
  const again = await call('POST', '/account/check-balance', { userId: 'user_siddhartha', upiPin: '1234' });
  assert.equal(again.body.data.difference, 0);
  s = await dashboard('user_siddhartha');
  assert.equal(s.metrics.verifiedBalance, 41000);

  // 11. Adding an EMI raises upcoming obligations
  const emi = await call('POST', '/emi', {
    userId: 'user_siddhartha',
    name: 'Car Loan EMI',
    lender: 'HDFC Bank',
    amount: 15000,
    dueDay: 15,
  });
  assert.equal(emi.status, 201);
  assert.equal((await dashboard('user_siddhartha')).metrics.totalUpcomingEMI, 35000);

  // 12. A large payment leaves too little for the EMIs (₹31,000 left, ₹35,000 due)
  await pay({ recipientPhone: '9988776655', amount: 10000 });
  assert.equal((await dashboard('user_siddhartha')).metrics.riskStatus, 'HIGH RISK');

  // 13. Receiving money restores SAFE
  await call('POST', '/transactions/receive', { userId: 'user_siddhartha', amount: 25000, senderName: 'Bonus Credit' });
  s = await dashboard('user_siddhartha');
  assert.equal(s.metrics.currentBalance, 56000);
  assert.equal(s.metrics.riskStatus, 'SAFE');

  // 14. Paying an EMI marks it paid and records an "EMI & Loans" debit
  const emiId = s.emis[0]._id;
  const paid = await call('POST', `/emi/${emiId}/pay`, { userId: 'user_siddhartha', upiPin: '1234' });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.data.transaction.category, 'EMI & Loans');
  s = await dashboard('user_siddhartha');
  assert.equal(s.emis.find((e) => e._id === emiId).status, 'paid_this_cycle');

  // Paying the same EMI twice in one cycle is refused
  assert.equal((await call('POST', `/emi/${emiId}/pay`, { userId: 'user_siddhartha', upiPin: '1234' })).status, 400);

  // 15. Reset restores the demo
  await reset();
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, 50000);
  assert.equal((await dashboard('user_rahul')).metrics.currentBalance, 30000);
});

test('payments require a UPI PIN', async () => {
  await reset();
  const res = await pay({ upiPin: undefined });
  assert.equal(res.status, 400);
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, 50000);
});

test('payment amount is validated and capped at the UPI limit', async () => {
  await reset();
  assert.equal((await pay({ amount: -5 })).status, 400);
  assert.equal((await pay({ amount: 'abc' })).status, 400);
  assert.equal((await pay({ amount: 100001 })).status, 400);
  assert.equal((await pay({ amount: 60000 })).status, 400); // more than the balance
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, 50000);
});

test('UPI PIN locks after three wrong attempts', async () => {
  await reset();
  const check = (upiPin) => call('POST', '/account/check-balance', { userId: 'user_rahul', upiPin });
  assert.match((await check('0000')).body.message, /2 attempts left/);
  assert.match((await check('0000')).body.message, /1 attempt left/);
  assert.equal((await check('0000')).status, 423);
  // Even the right PIN is refused while locked
  assert.equal((await check('1234')).status, 423);
  // Reset clears the lock
  await reset();
  assert.equal((await check('1234')).status, 200);
});

test('a correct PIN clears earlier wrong attempts', async () => {
  await reset();
  const check = (upiPin) => call('POST', '/account/check-balance', { userId: 'user_rahul', upiPin });
  await check('0000');
  await check('0000');
  assert.equal((await check('1234')).status, 200);
  assert.match((await check('0000')).body.message, /2 attempts left/);
});

test('UPI PIN can be changed', async () => {
  await reset();
  const change = await call('POST', '/account/update-pin', { userId: 'user_rahul', oldPin: '1234', newPin: '4321' });
  assert.equal(change.status, 200);
  assert.equal((await call('POST', '/account/check-balance', { userId: 'user_rahul', upiPin: '4321' })).status, 200);
  await reset();
});

test('EMIs cannot be deleted through another user', async () => {
  await reset();
  const res = await call('DELETE', '/emi/emi_rahul_1?userId=user_siddhartha');
  assert.equal(res.status, 404);
  const rahulEmis = (await call('GET', '/emi?userId=user_rahul')).body.data;
  assert.equal(rahulEmis.length, 1);
  assert.equal((await call('DELETE', '/emi/emi_rahul_1?userId=user_rahul')).status, 200);
  await reset();
});

test('EMI creation validates its input', async () => {
  await reset();
  assert.equal((await call('POST', '/emi', { userId: 'user_rahul', amount: 100, dueDay: 5 })).status, 400);
  assert.equal((await call('POST', '/emi', { userId: 'user_rahul', name: 'X', amount: 100, dueDay: 40 })).status, 400);
  assert.equal((await call('POST', '/emi', { userId: 'user_rahul', name: 'X', amount: 0, dueDay: 5 })).status, 400);
});

test('transaction categories are limited to the known list', async () => {
  await reset();
  const [tx] = (await call('GET', '/transactions?userId=user_rahul&limit=1')).body.data;
  assert.equal(tx._id, tx.id);
  assert.equal((await call('PATCH', `/transactions/${tx._id}/category`, { userId: 'user_rahul', category: '<b>x</b>' })).status, 400);
  const ok = await call('PATCH', `/transactions/${tx._id}/category`, { userId: 'user_rahul', category: 'Shopping & Lifestyle' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.category, 'Shopping & Lifestyle');
});

test('paying by a partial name does not credit a demo account', async () => {
  await reset();
  const res = await pay({ recipientPhone: '', recipientName: 'a', amount: 100 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.recipientUser, null);
  assert.equal((await dashboard('user_rahul')).metrics.currentBalance, 30000);
});

test('forecast uses rent from the ledger instead of a fixed amount', async () => {
  await reset();
  const rahul = await dashboard('user_rahul');
  const [d30] = rahul.forecastHorizons;
  // Rahul has no rent payments, so obligations are EMI + 30 days of discretionary spend
  assert.equal(d30.projectedObligations, 4000 + rahul.metrics.dailyBurnRate * 30);
});

test('the affordability simulator predicts the dashboard after a real payment', async () => {
  const { simulateSpend } = await import('../../frontend/src/lib/affordability.js');
  for (const amount of [2000, 10000, 20000, 30000]) {
    await reset();
    const before = (await dashboard('user_siddhartha')).metrics;
    const predicted = simulateSpend(before, amount);
    await pay({ recipientPhone: '9823456781', amount });
    const after = (await dashboard('user_siddhartha')).metrics;
    assert.equal(predicted.status, after.riskStatus, `status after paying ${amount}`);
    assert.equal(predicted.safeToSpend, after.safeToSpend, `safe-to-spend after paying ${amount}`);
    assert.equal(predicted.dailyBurnRate, after.dailyBurnRate, `burn rate after paying ${amount}`);
  }
});

test('EMI payments require the UPI PIN', async () => {
  await reset();
  const [emi] = (await call('GET', '/emi?userId=user_siddhartha')).body.data;
  const before = (await dashboard('user_siddhartha')).metrics.currentBalance;
  assert.equal((await call('POST', `/emi/${emi._id}/pay`, { userId: 'user_siddhartha' })).status, 400);
  assert.equal((await call('POST', `/emi/${emi._id}/pay`, { userId: 'user_siddhartha', upiPin: '0000' })).status, 400);
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, before, 'no money moved without the PIN');
  assert.equal((await call('POST', `/emi/${emi._id}/pay`, { userId: 'user_siddhartha', upiPin: '1234' })).status, 200);
});

test('only the owner can change a transaction category', async () => {
  await reset();
  const [tx] = (await call('GET', '/transactions?userId=user_rahul&limit=1')).body.data;
  const body = { category: 'Shopping & Lifestyle' };
  assert.equal((await call('PATCH', `/transactions/${tx._id}/category`, body)).status, 404);
  assert.equal((await call('PATCH', `/transactions/${tx._id}/category`, { ...body, userId: 'user_siddhartha' })).status, 404);
  assert.equal((await call('PATCH', `/transactions/${tx._id}/category`, { ...body, userId: 'user_rahul' })).status, 200);
});

test('the current PIN can be verified and a new PIN must differ from it', async () => {
  await reset();
  assert.equal((await call('POST', '/account/verify-pin', { userId: 'user_rahul', upiPin: '1234' })).status, 200);
  assert.equal((await call('POST', '/account/verify-pin', { userId: 'user_rahul', upiPin: '9999' })).status, 400);
  const same = await call('POST', '/account/update-pin', { userId: 'user_rahul', oldPin: '1234', newPin: '1234' });
  assert.equal(same.status, 400);
});

test('text inputs are capped and enums are checked', async () => {
  await reset();
  const long = await call('POST', '/emi', { userId: 'user_rahul', name: 'A'.repeat(500), amount: 500, dueDay: 3 });
  assert.equal(long.status, 201);
  assert.equal(long.body.data.name.length, 60);
  assert.equal((await call('POST', '/emi', { userId: 'user_rahul', name: 'X', amount: 500, dueDay: 3, frequency: 'Hourly' })).status, 400);
  const credit = await call('POST', '/transactions/receive', { userId: 'user_rahul', amount: 10, senderName: 'x', paymentMethod: '<b>hax</b>' });
  assert.equal(credit.body.data.transaction.paymentMethod, 'UPI');
});

test('responses carry basic security headers', async () => {
  if (process.env.API_URL) return; // headers are a property of the Express server only
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});

test('checking the balance picks up money added outside the app', async () => {
  await reset();
  const res = await call('POST', '/account/check-balance', { userId: 'user_rahul', upiPin: '1234' });
  assert.equal(res.body.data.difference, 500);
  const d = await dashboard('user_rahul');
  assert.equal(d.metrics.currentBalance, 30500);
  assert.equal(d.metrics.verifiedBalance, 30500);
});

test('the bank refuses a payment its real balance cannot cover', async () => {
  await reset();
  // The app thinks ₹50,000 is available, but the bank holds ₹48,000 (a cash withdrawal outside the app).
  await call('POST', '/transactions/receive', { userId: 'user_siddhartha', amount: 60000, senderName: 'x' });
  await call('POST', '/transactions/payment', { userId: 'user_siddhartha', recipientPhone: '9123456780', amount: 100000, upiPin: '1234' });
  const res = await pay({ amount: 9000 });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /bank/i);
  assert.equal((await dashboard('user_siddhartha')).metrics.currentBalance, 10000, 'nothing was debited');
});

test('money sent from one demo account shows up on the other straight away', async () => {
  await reset();
  const before = (await dashboard('user_rahul')).metrics.currentBalance;
  const res = await pay({ amount: 1234 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.recipientBalance, before + 1234);
  assert.equal((await dashboard('user_rahul')).metrics.currentBalance, before + 1234);
});
