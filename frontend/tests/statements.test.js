// Statement reading: UPI-app and bank layouts, tables, duplicates, and the real fixture files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import Papa from 'papaparse';
import { detectSource, findAmounts, findDate, markDuplicates, parseRows, parseTextLines } from '../src/lib/statementParser.js';
import { categorize } from '../src/lib/categories.js';

const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url);

test('dates in every common Indian statement format', () => {
  const day = (s) => findDate(s)?.date.toDateString();
  assert.equal(day('05/01/2026 x'), new Date(2026, 0, 5).toDateString());
  assert.equal(day('05-01-26 x'), new Date(2026, 0, 5).toDateString());
  assert.equal(day('2026-01-05'), new Date(2026, 0, 5).toDateString());
  assert.equal(day('05 Jan 2026'), new Date(2026, 0, 5).toDateString());
  assert.equal(day('01Jan,2026'), new Date(2026, 0, 1).toDateString());
  assert.equal(day('Jan 05, 2026'), new Date(2026, 0, 5).toDateString());
  assert.equal(day('01/25/2026'), new Date(2026, 0, 25).toDateString()); // month-first when day-first is impossible
  assert.equal(findDate('31/02/2026'), null);
});

test('money amounts, ignoring IDs and phone numbers', () => {
  assert.deepEqual(findAmounts('Paid ₹1,234.50 ref 424242424242').map((a) => a.value), [1234.5]);
  assert.deepEqual(findAmounts('Rs. 500 and INR 99').map((a) => a.value), [500, 99]);
  assert.deepEqual(findAmounts('- ₹200').map((a) => a.sign), ['-']);
  assert.deepEqual(findAmounts('9876543210 2026').length, 0);
});

test('PhonePe, Google Pay, Paytm and bank text layouts', () => {
  const phonepe = parseTextLines([
    'Date Transaction Details Type Amount',
    'Sep 26, 2026 Paid to Swiggy DEBIT ₹450',
    '08:12 pm Transaction ID T2609262012',
    'Page 1 of 2',
    'Sep 25, 2026 Received from Rahul Sharma CREDIT ₹3,000',
  ]);
  assert.deepEqual(phonepe.map((t) => [t.type, t.amount, t.description]), [
    ['debit', 450, 'Paid to Swiggy'],
    ['credit', 3000, 'Received from Rahul Sharma'],
  ]);
  assert.equal(new Date(phonepe[0].date).getHours(), 20);

  const bank = parseTextLines([
    '01/09/2026 Opening Balance 45,000.00',
    '02/09/2026 UPI/DR/424242/SWIGGY/YESB 424242 350.00 44,650.00',
    '03/09/2026 NEFT CR ACME PAYROLL SALARY 52,000.00 96,650.00',
  ]);
  assert.deepEqual(bank.map((t) => [t.type, t.amount, t.category]), [
    ['debit', 350, 'Food & Dining'],
    ['credit', 52000, 'Salary & Income'],
  ]);

  const paytm = parseTextLines(['05 Sep 2026 Paid to Uber India - ₹230', '06 Sep 2026 Cashback received + ₹25']);
  assert.deepEqual(paytm.map((t) => [t.type, t.amount]), [['debit', 230], ['credit', 25]]);
});

test('tables with debit/credit columns or amount + Dr/Cr', () => {
  const a = parseRows([
    ['Txn Date', 'Description', 'Debit', 'Credit', 'Balance'],
    ['10-09-2026', 'UPI-ZEPTO-GROCERY', '540.00', '', '10,000'],
    ['11-09-2026', 'IMPS FROM RAVI', '', '2500', '12,500'],
  ]);
  assert.deepEqual(a.map((t) => [t.type, t.amount, t.category]), [['debit', 540, 'Groceries'], ['credit', 2500, 'Received from people']]);
  const b = parseRows([['Date', 'Narration', 'Amount', 'Dr/Cr'], [46275, 'Amazon order', '1299.00', 'DR'], [46276, 'Refund amazon', '1299', 'CR']]);
  assert.deepEqual(b.map((t) => t.type), ['debit', 'credit']);
});

test('the bank CSV fixture: every row, right directions, right source', () => {
  const text = fs.readFileSync(fixture('bank_statement.csv'), 'utf8');
  const rows = Papa.parse(text, { skipEmptyLines: true }).data;
  const txs = parseRows(rows);
  assert.equal(txs.length, 25);
  assert.equal(txs.filter((t) => t.type === 'credit').length, 4);
  assert.equal(txs.filter((t) => t.category === 'EMI & Loans').length, 3);
  assert.equal(txs.filter((t) => t.category === 'Cash withdrawal').length, 3);
  assert.equal(detectSource(`bank_statement.csv ${text}`), 'Bank');
});

test('duplicates across statements are found and unticked', () => {
  const one = [{ date: new Date(2026, 8, 2, 11).toISOString(), description: 'Paid to Amit Kumar Rent', amount: 12000, type: 'debit' }];
  const two = [{ date: new Date(2026, 8, 2, 12).toISOString(), description: 'UPI DR AMIT KUMAR RENT', amount: 12000, type: 'debit' }];
  const marked = markDuplicates([...one, ...two]);
  assert.equal(marked[0].duplicate, null);
  assert.equal(marked[1].duplicate, 'likely');
  assert.equal(marked[1].include, false);
  assert.equal(markDuplicates(one, one)[0].duplicate, 'exact');
});

test('categories: whole-word short keywords, sensible fallbacks', () => {
  assert.equal(categorize('Paid to Academic Books Store'), 'Education');
  assert.equal(categorize('EMI HDFC LOAN 123'), 'EMI & Loans');
  assert.equal(categorize('Chemist shop'), 'Shopping');
  assert.equal(categorize('Paid to Rahul Sharma'), 'Sent to people');
  assert.equal(categorize('ATM WDL SBI'), 'Cash withdrawal');
  assert.equal(categorize('SALARY SEP', 'credit'), 'Salary & Income');
  assert.equal(categorize('Gossip magazine'), 'Other');
});
