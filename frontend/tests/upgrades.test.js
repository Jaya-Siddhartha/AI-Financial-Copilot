// Credit report reading, daily allowance, goals, prepayment and sample data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCreditReport, scoreBand } from '../src/lib/creditReport.js';
import { analyze } from '../src/lib/engine.js';
import { goalPlan, monthlySurplus, monthsUntil } from '../src/lib/goals.js';
import { prepaymentSavings, loanSummary } from '../src/lib/emiCalc.js';
import { buildSampleData } from '../src/lib/sampleData.js';
import { estimateCreditHealth } from '../src/lib/creditScore.js';

test('credit report: score, bureau and date from each bureau layout', () => {
  const cibil = parseCreditReport('TransUnion CIBIL Limited  CIBIL Report  Date: 12/09/2026  CIBIL Score (CIBIL TransUnion Score Version 3.0) 764  Active Accounts: 3  Overdue Accounts: 0  Enquiries in last 30 days 1');
  assert.deepEqual([cibil.score, cibil.bureau, cibil.reportDate, cibil.activeAccounts, cibil.overdueAccounts, cibil.enquiries], [764, 'CIBIL', '2026-09-12', 3, 0, 1]);
  assert.equal(parseCreditReport('CIBIL Score 700 Total Enquiries: 5').enquiries, 5);
  const experian = parseCreditReport('Experian Credit Information Company of India  Report Date 05-Aug-2026  Your Experian Credit Score is 812 out of 900');
  assert.deepEqual([experian.score, experian.bureau, experian.reportDate], [812, 'Experian', '2026-08-05']);
  const equifax = parseCreditReport('Equifax Credit Report  Equifax Risk Score 3.1 : 689  Date of Report: 2026-07-01');
  assert.deepEqual([equifax.score, equifax.bureau], [689, 'Equifax']);
  const crif = parseCreditReport('CRIF High Mark Credit Information Services  PERFORM CONSUMER 2.2 SCORE 701  Generated on 02/06/2026');
  assert.deepEqual([crif.score, crif.bureau, crif.reportDate], [701, 'CRIF High Mark', '2026-06-02']);
  assert.equal(parseCreditReport('CIBIL Score: NH (no credit history)').score, null);
  assert.equal(parseCreditReport('CIBIL Score: NH (no credit history)').noHistory, true);
  assert.equal(parseCreditReport('Score 12345 and 99').score, null);
});

test('credit score bands follow common Indian lender cut-offs', () => {
  assert.equal(scoreBand(780).label, 'Excellent');
  assert.equal(scoreBand(720).label, 'Good');
  assert.equal(scoreBand(660).label, 'Fair');
  assert.equal(scoreBand(600).label, 'Needs work');
  assert.equal(scoreBand(420).label, 'Poor');
});

test('daily allowance = safe to spend ÷ days until salary, never more than safe to spend', () => {
  const now = new Date(2026, 8, 20, 12);
  const a = analyze({ profile: { monthlyIncome: 50000, salaryDay: 1, bufferEnabled: false, balanceAmount: 11000, balanceDate: new Date(2026, 8, 19).toISOString() }, transactions: [], emis: [], now });
  assert.equal(a.allowance.days, 11);
  assert.equal(a.allowance.perDay, 1000);
  assert.equal(a.allowance.until, 'salary');
  const today = analyze({ profile: { monthlyIncome: 50000, salaryDay: 20, bufferEnabled: false, balanceAmount: 30000, balanceDate: new Date(2026, 8, 19).toISOString() }, transactions: [], emis: [], now });
  assert.equal(today.allowance.days, 30);
  const noIncome = analyze({ profile: { monthlyIncome: 0, bufferEnabled: false, balanceAmount: 1100, balanceDate: new Date(2026, 8, 19).toISOString() }, transactions: [], emis: [], now });
  assert.equal(noIncome.allowance.until, 'month end');
  assert.equal(noIncome.allowance.days, 11);
});

test('goals: monthly amount needed and whether it fits', () => {
  const now = new Date(2026, 8, 29);
  assert.equal(monthsUntil('2027-03-29', now), 6);
  assert.equal(monthsUntil('2026-10-15', now), 1);
  const plan = goalPlan({ target: 60000, saved: 12000, targetDate: '2027-03-29' }, 20000, now);
  assert.deepEqual([plan.left, plan.months, plan.perMonth, plan.progress, plan.status], [48000, 6, 8000, 20, 'easy']);
  assert.equal(goalPlan({ target: 60000, saved: 12000, targetDate: '2027-03-29' }, 10000, now).status, 'tight');
  assert.equal(goalPlan({ target: 60000, saved: 12000, targetDate: '2027-03-29' }, 5000, now).status, 'hard');
  assert.equal(goalPlan({ target: 5000, saved: 5000 }, 1000, now).status, 'done');
  assert.equal(goalPlan({ target: 5000, saved: 100, targetDate: '2026-01-01' }, 1000, now).status, 'late');
});

test('prepayment: paying extra shortens the loan and saves interest', () => {
  const r = prepaymentSavings(500000, 10.5, 36, 100000, 12);
  assert.equal(r.monthsBefore, 36);
  assert.ok(r.monthsAfter < 36);
  assert.ok(r.interestSaved > 0);
  assert.ok(r.interestSaved < loanSummary(500000, 10.5, 36).totalInterest);
  assert.equal(prepaymentSavings(500000, 10.5, 36, 0, 12).interestSaved, 0);
  assert.equal(prepaymentSavings(500000, 10.5, 36, 10000000, 1).monthsAfter, 1);
});

test('sample data is complete and consistent on any day of the year', () => {
  for (const now of [new Date(2026, 0, 1, 9), new Date(2026, 1, 28, 23), new Date(2026, 8, 29, 12), new Date(2028, 1, 29, 8), new Date(2026, 11, 31, 20)]) {
    const d = buildSampleData(now);
    assert.ok(d.transactions.length > 60, 'about three months of transactions');
    assert.ok(d.transactions.every((t) => new Date(t.date) <= now && t.amount > 0));
    const a = analyze({ profile: d.profile, transactions: d.transactions, emis: d.emis, now });
    assert.ok(a.hasBalance && a.balance > 0);
    assert.equal(a.overdue.length, 0, `no late EMIs in sample data (${now.toDateString()})`);
    const credit = estimateCreditHealth({ analysis: a, transactions: d.transactions, profile: d.profile });
    assert.ok(credit.score >= 300 && credit.score <= 900);
    const surplus = monthlySurplus(a, d.profile);
    assert.ok(Number.isFinite(surplus));
    for (const g of d.goals) assert.ok(Number.isFinite(goalPlan(g, surplus, now).perMonth));
  }
});

test('credit report PDF (password protected) is read like the app reads it', async () => {
  const fs = await import('node:fs');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = () => new Uint8Array(fs.readFileSync(new URL('./fixtures/credit_report.pdf', import.meta.url)));
  await assert.rejects(pdfjs.getDocument({ data: bytes(), password: 'wrong', verbosity: 0 }).promise, (err) => err.name === 'PasswordException');
  const doc = await pdfjs.getDocument({ data: bytes(), password: 'ASHA1990', verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const text = (await page.getTextContent()).items.map((i) => i.str).join(' ');
  const r = parseCreditReport(text);
  assert.deepEqual([r.score, r.bureau, r.reportDate, r.activeAccounts, r.overdueAccounts, r.enquiries], [752, 'CIBIL', '2026-09-14', 3, 0, 1]);
});

test('autopay after a long break: every missed month, oldest first, within the months left', async () => {
  const { missedDueDates } = await import('../src/lib/engine.js');
  const now = new Date(2026, 8, 29, 11);
  const base = { id: 'x', name: 'Gold loan', amount: 1500, dueDay: 10, autopay: true, remainingMonths: 10, createdAt: new Date(2026, 5, 21, 9).toISOString() };
  assert.deepEqual(missedDueDates(base, now), ['2026-07-10', '2026-08-10', '2026-09-10']);
  assert.deepEqual(missedDueDates({ ...base, paidThroughDate: '2026-08-10' }, now), ['2026-09-10']);
  assert.deepEqual(missedDueDates({ ...base, paidThroughDate: '2026-09-10' }, now), []);
  assert.deepEqual(missedDueDates({ ...base, remainingMonths: 2 }, now), ['2026-07-10', '2026-08-10']);
  assert.deepEqual(missedDueDates({ ...base, remainingMonths: null }, now), ['2026-07-10', '2026-08-10', '2026-09-10']);
  assert.deepEqual(missedDueDates({ ...base, createdAt: undefined }, now), ['2026-09-10']);
  assert.deepEqual(missedDueDates({ ...base, dueDay: 31, createdAt: new Date(2026, 0, 5).toISOString() }, new Date(2026, 2, 31, 10)), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(missedDueDates({ ...base, remainingMonths: 60, createdAt: new Date(2024, 0, 1).toISOString() }, now).length, 12);
  assert.equal(missedDueDates({ ...base, createdAt: new Date(2024, 0, 1).toISOString() }, now).length, 10);
  assert.deepEqual(missedDueDates({ ...base, remainingMonths: 0 }, now), []);
  assert.deepEqual(missedDueDates({ ...base, dueDay: 29, createdAt: new Date(2026, 8, 1).toISOString() }, now), ['2026-09-29']);
});

test('credit report: real-world layouts ("764/900", "00787", score tables, "-1") and no false scores', () => {
  assert.equal(parseCreditReport('CIBIL Score 764/900 Report Date: 12/09/2026').score, 764);
  const table = parseCreditReport('TransUnion CIBIL CONSUMER CIR CIBIL TRANSUNION SCORE(S): SCORE NAME SCORE SCORING FACTORS CIBILTUSC3 00787 Date: 03-09-2026');
  assert.deepEqual([table.score, table.bureau, table.reportDate], [787, 'CIBIL', '2026-09-03']);
  assert.equal(parseCreditReport('Experian Credit Report Score range 300-900 Your Experian Credit Score 812').score, 812);
  assert.equal(parseCreditReport('CRIF High Mark CREDIT SCORE(S): NAME SCORE RANGE PERFORM CONSUMER 2.2 300-900 751').score, 751);
  const nh = parseCreditReport('CIBIL TRANSUNION SCORE(S): CIBILTUSC3 -1');
  assert.deepEqual([nh.score, nh.noHistory], [null, true]);
  assert.equal(parseCreditReport('CIBIL Score Report generated on 12/09/2026 at 10:45').score, null);
  assert.equal(parseCreditReport('Score details Mobile 9876543210 PIN 560001').score, null);
});
