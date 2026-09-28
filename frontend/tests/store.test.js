// On-device store: saving, rules, all-or-nothing writes, and backup / restore.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => {
    if (globalThis.__full) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    memory.set(k, String(v));
  },
  removeItem: (k) => memory.delete(k),
};
const store = await import('../src/data/store.js');

beforeEach(async () => {
  globalThis.__full = false;
  await store.deleteAllData();
});

const tx = (o = {}) => ({ date: '2026-09-20T10:00:00.000Z', description: 'Swiggy', amount: 450, type: 'debit', category: 'Food & Dining', ...o });

test('a new device starts empty and not set up', async () => {
  const d = await store.loadEverything();
  assert.equal(d.profile.onboarded, false);
  assert.equal(d.transactions.length, 0);
});

test('saved data survives a reload', async () => {
  await store.updateProfile({ fullName: 'Asha', onboarded: true, bufferAmount: 3000 });
  await store.addTransactions([tx(), tx({ amount: 1200, type: 'credit', description: 'Refund' })]);
  await store.addEmi({ name: 'Car loan', amount: 8500, dueDay: 7 });
  const d = await store.loadEverything();
  assert.equal(d.profile.fullName, 'Asha');
  assert.equal(d.profile.bufferAmount, 3000);
  assert.equal(d.transactions.length, 2);
  assert.equal(d.emis[0].name, 'Car loan');
});

test('bad input is refused and nothing is saved', async () => {
  await assert.rejects(store.addTransactions([tx({ amount: 0 })]), /above/);
  await assert.rejects(store.addTransactions([tx(), tx({ description: '' })]), /description/);
  await assert.rejects(store.addEmi({ name: 'X', amount: 100, dueDay: 40 }), /Due day/);
  assert.equal((await store.loadEverything()).transactions.length, 0);
});

test('if the device is full, the change is undone and a clear message is shown', async () => {
  await store.addTransactions([tx()]);
  globalThis.__full = true;
  await assert.rejects(store.addTransactions([tx({ amount: 99 })]), /out of space/);
  globalThis.__full = false;
  assert.equal((await store.loadEverything()).transactions.length, 1);
});

test('statements save their transactions; deleting can keep or remove them', async () => {
  const { statement } = await store.saveStatement({ file: { name: 'phonepe.pdf' }, sourceApp: 'PhonePe', period: { start: '2026-09-01', end: '2026-09-28' }, transactions: [tx(), tx({ amount: 99 })] });
  assert.equal((await store.loadEverything()).transactions.length, 2);
  await store.deleteStatement(statement, { withTransactions: false });
  let d = await store.loadEverything();
  assert.equal(d.statements.length, 0);
  assert.equal(d.transactions.length, 2);
  const s2 = await store.saveStatement({ file: { name: 'bank.csv' }, sourceApp: 'Bank', period: { start: null, end: null }, transactions: [tx({ amount: 5 })] });
  await store.deleteStatement(s2.statement, { withTransactions: true });
  d = await store.loadEverything();
  assert.equal(d.transactions.length, 2);
});

test('backup and restore bring back everything', async () => {
  await store.updateProfile({ fullName: 'Ravi', onboarded: true, theme: 'dark' });
  await store.addTransactions([tx(), tx({ amount: 77 })]);
  await store.addEmi({ name: 'Phone EMI', amount: 2200, dueDay: 15 });
  const backup = store.exportBackup();
  await store.deleteAllData();
  assert.equal((await store.loadEverything()).transactions.length, 0);
  const result = await store.importBackup(backup);
  assert.deepEqual(result, { transactions: 2, emis: 1 });
  const d = await store.loadEverything();
  assert.equal(d.profile.fullName, 'Ravi');
  assert.equal(d.profile.theme, 'dark');
  await assert.rejects(store.importBackup('{"hello":1}'), /not a FinCopilot backup/);
  await assert.rejects(store.importBackup('not json'), /not a FinCopilot backup/);
});
