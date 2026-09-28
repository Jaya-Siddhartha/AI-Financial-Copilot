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
  assert.equal(d.emis[0].createdAt, JSON.parse(backup).emis[0].createdAt);
  assert.equal(d.profile.fullName, 'Ravi');
  assert.equal(d.profile.theme, 'dark');
  await assert.rejects(store.importBackup('{"hello":1}'), /not a FinCopilot backup/);
  await assert.rejects(store.importBackup('not json'), /not a FinCopilot backup/);
});

test('credit scores: saved newest first, bad ones refused, and deleted', async () => {
  const a = await store.addCreditScore({ score: 731, bureau: 'CIBIL', date: '2026-02-10', source: 'manual' });
  await store.addCreditScore({ score: 762, bureau: 'Experian', date: '2026-08-01', source: 'report', details: { activeAccounts: 3, overdueAccounts: 0, enquiries: 'x' } });
  let d = await store.loadEverything();
  assert.deepEqual(d.creditScores.map((c) => c.score), [762, 731]);
  assert.deepEqual(d.creditScores[0].details, { activeAccounts: 3, overdueAccounts: 0, enquiries: null });
  await assert.rejects(store.addCreditScore({ score: 950, bureau: 'CIBIL', date: '2026-08-01' }), /between 300 and 900/);
  await assert.rejects(store.addCreditScore({ score: 700, bureau: 'Some app', date: '2026-08-01' }), /bureau/);
  await assert.rejects(store.addCreditScore({ score: 700, bureau: 'CIBIL', date: '2999-01-01' }), /future/);
  await store.deleteCreditScore(a.id);
  d = await store.loadEverything();
  assert.deepEqual(d.creditScores.map((c) => c.score), [762]);
});

test('savings goals: add, edit, refuse bad input, delete', async () => {
  const g = await store.saveGoal({ name: ' Emergency fund ', target: 100000, saved: 25000, targetDate: '2027-06-01' });
  assert.equal(g.name, 'Emergency fund');
  await store.saveGoal({ ...g, saved: 40000 });
  let d = await store.loadEverything();
  assert.equal(d.goals.length, 1);
  assert.equal(d.goals[0].saved, 40000);
  await assert.rejects(store.saveGoal({ name: '', target: 5000 }), /name/);
  await assert.rejects(store.saveGoal({ name: 'Phone', target: 0 }), /how much/);
  await store.deleteGoal(g.id);
  d = await store.loadEverything();
  assert.equal(d.goals.length, 0);
});

test('sample data loads, is marked as sample, keeps the look, and clears', async () => {
  await store.updateProfile({ theme: 'ocean', textSize: 'large' });
  await store.loadSampleData();
  const d = await store.loadEverything();
  assert.equal(d.sample, true);
  assert.equal(d.profile.onboarded, true);
  assert.equal(d.profile.theme, 'ocean');
  assert.equal(d.profile.textSize, 'large');
  assert.ok(d.transactions.length > 50 && d.emis.length === 2 && d.creditScores.length === 3 && d.goals.length === 2);
  await store.deleteAllData();
  const empty = await store.loadEverything();
  assert.equal(empty.sample, false);
  assert.equal(empty.transactions.length, 0);
});

test('restore keeps credit scores and goals, and skips broken entries instead of failing', async () => {
  await store.updateProfile({ fullName: 'Meera', onboarded: true });
  await store.addCreditScore({ score: 745, bureau: 'CIBIL', date: '2026-07-01' });
  await store.saveGoal({ name: 'Trip', target: 30000 });
  const backup = JSON.parse(store.exportBackup());
  backup.creditScores.push({ score: 'abc', bureau: 'CIBIL', date: '2026-01-01' });
  backup.goals.push({ name: 'Broken', target: -5 });
  backup.emis = [{ name: 'Bike', amount: 3100, dueDay: 5 }, { name: '', amount: 0, dueDay: 99 }];
  await store.deleteAllData();
  await store.importBackup(JSON.stringify(backup));
  const d = await store.loadEverything();
  assert.deepEqual(d.creditScores.map((c) => c.score), [745]);
  assert.deepEqual(d.goals.map((g) => g.name), ['Trip']);
  assert.deepEqual(d.emis.map((e) => e.name), ['Bike']);
  assert.ok(d.emis[0].createdAt, 'EMI keeps a start date so its first due date is right');
});
