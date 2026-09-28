// Turns the text or table of a UPI-app or bank statement into transactions.
// Pure functions: the browser code in statementFiles.js extracts text lines (PDF) or rows
// (Excel/CSV) and hands them here.

import { categorize } from './categories.js';

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*';

const DATE_PATTERNS = [
  // 05/01/2025, 05-01-25, 05.01.2025 (day first, as Indian statements use)
  { re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/, parse: (m) => dmy(m[1], m[2], m[3]) },
  // 2025-01-05
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, parse: (m) => make(Number(m[1]), Number(m[2]) - 1, Number(m[3])) },
  // 05 Jan 2025, 05-Jan-25, 01Jan,2025, 5 January 2025
  { re: new RegExp(`\\b(\\d{1,2})[\\s-]?${MON}[\\s,.-]*(\\d{4}|\\d{2})\\b`, 'i'), parse: (m) => make(year(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1])) },
  // Jan 05, 2025 (PhonePe)
  { re: new RegExp(`\\b${MON}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'i'), parse: (m) => make(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2])) },
];

const year = (y) => {
  const n = Number(y);
  return n < 100 ? 2000 + n : n;
};
const make = (y, m, d) => {
  if (!(y > 1990 && y < 2100) || !(m >= 0 && m <= 11) || !(d >= 1 && d <= 31)) return null;
  const date = new Date(y, m, d, 12, 0, 0);
  return date.getMonth() === m ? date : null;
};
// Day-first unless that is impossible (e.g. 01/25/2025 is month-first).
const dmy = (a, b, y) => {
  const d = Number(a);
  const m = Number(b);
  if (m > 12 && d <= 12) return make(year(y), d - 1, m);
  return make(year(y), m - 1, d);
};

export const findDate = (text) => {
  let best = null;
  for (const p of DATE_PATTERNS) {
    const m = p.re.exec(text);
    if (!m) continue;
    const date = p.parse(m);
    if (date && (!best || m.index < best.index)) best = { date, index: m.index, match: m[0] };
  }
  return best;
};

// Parses a date cell from Excel/CSV: a Date, an Excel serial number, or text.
export const parseDateCell = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const d = new Date(Math.round((value - 25569) * 86400000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
  }
  return findDate(String(value ?? ''))?.date || null;
};

const TIME_RE = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i;
// Money: "₹1,234.50", "Rs. 500", "INR 99", "1,234.00", "- ₹200", "+₹50". Bare integers without a
// currency sign are ignored (they are usually IDs, years or reference numbers).
const MONEY_RE = /([+-])?\s*(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([+-])?\b([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2})\b(\s*(?:cr|dr)\b)?/gi;

export const findAmounts = (text) => {
  const out = [];
  let m;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(text))) {
    const raw = m[2] || m[4];
    const value = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 1e9) continue;
    const sign = m[1] || m[3] || '';
    const suffix = (m[5] || '').trim().toLowerCase();
    out.push({ value, sign, suffix, index: m.index });
  }
  return out;
};

const DEBIT_WORDS = /\b(debit|debited|dr\.?|paid to|sent to|payment to|paid|withdrawal|withdrawn|atm|purchase|pos|bill paid|nach|ecs|auto ?debit|emi)\b/i;
const CREDIT_WORDS = /\b(credit|credited|cr\.?|received from|received|refund|cashback|deposit|salary|reversal|interest|money added)\b/i;
const SKIP_RE = /(opening balance|closing balance|balance brought forward|b\/f|c\/f|total debit|total credit|statement (period|summary|of account)|page \d+ of|generated on|account summary|this is a (system|computer) generated)/i;

const typeOf = (text, amount) => {
  if (amount?.sign === '-' || amount?.suffix === 'dr') return 'debit';
  if (amount?.sign === '+' || amount?.suffix === 'cr') return 'credit';
  const t = text.toLowerCase();
  // Explicit column words (DEBIT / CREDIT) win over phrases.
  if (/\bdebit\b/.test(t) && !/\bcredit\b/.test(t)) return 'debit';
  if (/\bcredit\b/.test(t) && !/\bdebit\b/.test(t)) return 'credit';
  const d = DEBIT_WORDS.test(t);
  const c = CREDIT_WORDS.test(t);
  if (d && !c) return 'debit';
  if (c && !d) return 'credit';
  if (/paid to|sent to/.test(t)) return 'debit';
  if (/received from/.test(t)) return 'credit';
  return null;
};

export const cleanDescription = (text) => {
  let s = String(text);
  const party = s.match(/(paid to|sent to|received from|payment to|transfer to|transfer from)\s+([^|\n]+?)(?=\s{2,}|\s+(transaction|txn|utr|upi|ref|debit|credit|₹|rs\.?|inr)\b|$)/i);
  if (party) {
    const who = party[2].replace(/[\s|,:;-]+$/, '').trim();
    return `${party[1][0].toUpperCase()}${party[1].slice(1).toLowerCase()} ${who}`.slice(0, 120);
  }
  s = s
    .replace(TIME_RE, ' ')
    .replace(/(transaction|txn|utr|ref(erence)?|order)\s*(id|no\.?|number)?\s*[:#]?\s*[A-Z0-9-]{6,}/gi, ' ')
    .replace(/(paid|debited|credited)\s+(by|from|to)\s+[X*]+\d{2,6}/gi, ' ')
    .replace(MONEY_RE, ' ')
    .replace(/\b(debit|credit|dr|cr)\b\.?/gi, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/[|/_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, '')
    .trim();
  return (s || 'Transaction').slice(0, 120);
};

const timeOn = (date, text) => {
  const m = TIME_RE.exec(text);
  if (!m) return date;
  let h = Number(m[1]);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  const d = new Date(date);
  if (h <= 23 && Number(m[2]) <= 59) d.setHours(h, Number(m[2]), 0, 0);
  return d;
};

// Uses the file name and the top of the statement: a bank statement can mention "Paytm" in one row
// without being a Paytm statement.
export const detectSource = (text) => {
  const t = String(text).toLowerCase().slice(0, 600);
  if (/(closing balance|withdrawal|narration|chq|cheque|value date|opening balance)/.test(t)) return 'Bank';
  if (t.includes('phonepe')) return 'PhonePe';
  if (t.includes('google pay') || t.includes('gpay')) return 'Google Pay';
  if (t.includes('paytm')) return 'Paytm';
  if (t.includes('bhim')) return 'BHIM';
  if (t.includes('amazon pay')) return 'Amazon Pay';
  if (/(state bank|sbi|hdfc|icici|axis|kotak|canara|union bank|bank of baroda|pnb|punjab national|idfc|yes bank|indusind|federal bank)/.test(t)) return 'Bank';
  return 'Other';
};

// Statement given as text lines (PDFs). A record starts at a line holding a date and runs until
// the next such line.
export const parseTextLines = (lines) => {
  const records = [];
  let cur = null;
  for (const raw of lines) {
    const line = String(raw).replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const found = findDate(line);
    // Page headers and footers between rows are dropped, so they cannot swallow a row.
    if (SKIP_RE.test(line) && !(found && /opening balance|brought forward|b\/f/i.test(line))) continue;
    if (found && found.index <= 12) {
      if (cur) records.push(cur);
      cur = { date: found.date, text: line };
    } else if (cur) {
      cur.text += ` | ${line}`;
    }
  }
  if (cur) records.push(cur);

  const txs = [];
  let prevBalance = null;
  // A running balance can be below zero on overdraft accounts ("-1,234.00" or "1,234.00 Dr").
  const signed = (a) => (a.sign === '-' || a.suffix === 'dr' ? -a.value : a.value);
  for (const r of records) {
    if (SKIP_RE.test(r.text)) {
      // Keep the opening balance as the starting point for balance-based direction.
      const amts = findAmounts(r.text);
      if (/opening balance|brought forward|b\/f/i.test(r.text) && amts.length) prevBalance = signed(amts[amts.length - 1]);
      continue;
    }
    const body = r.text.replace(findDate(r.text)?.match || '', ' ');
    const amts = findAmounts(body);
    if (!amts.length) continue;

    let amount = amts[0];
    let type = typeOf(body, amount);
    // Bank statement row: [withdrawal or deposit, balance]. The balance change tells the direction.
    if (amts.length >= 2) {
      const balance = signed(amts[amts.length - 1]);
      if (prevBalance !== null) {
        const diff = Math.round((balance - prevBalance) * 100) / 100;
        const match = amts.slice(0, -1).find((a) => Math.abs(a.value - Math.abs(diff)) < 0.01);
        if (match) {
          amount = match;
          type = diff < 0 ? 'debit' : 'credit';
        }
      }
      if (!amount.sign && !amount.suffix && amts.length >= 2) prevBalance = balance;
    }
    if (!type) continue;
    const description = cleanDescription(body);
    txs.push({
      date: timeOn(r.date, r.text).toISOString(),
      description,
      amount: amount.value,
      type,
      category: categorize(`${description} ${body}`, type),
    });
  }
  return txs;
};

const HEAD = {
  date: /^(txn |transaction |tran |value |posting )?date|^date/i,
  desc: /(description|narration|particulars|details|remarks|transaction details|merchant|name|payee)/i,
  debit: /(debit|withdrawal|withdrawl|dr\b|paid out|money out|amount paid)/i,
  credit: /(credit|deposit|cr\b|paid in|money in|amount received)/i,
  amount: /^(amount|amt|transaction amount|txn amount)/i,
  type: /^(type|dr\s*\/\s*cr|cr\s*\/\s*dr|transaction type|debit\s*\/\s*credit)$/i,
  balance: /balance/i,
};

const cellText = (v) => (v instanceof Date ? v.toISOString() : String(v ?? '')).trim();
const numberCell = (v) => {
  if (typeof v === 'number') return v;
  const s = cellText(v).replace(/[₹,\s]|rs\.?|inr/gi, '');
  if (!s || !/^[+-]?\d+(\.\d+)?(cr|dr)?$/i.test(s)) return null;
  return Number(s.replace(/(cr|dr)$/i, ''));
};

// Statement given as a table (Excel/CSV). Finds the header row and maps its columns.
export const parseRows = (rows) => {
  const table = rows.filter((r) => Array.isArray(r) && r.some((c) => cellText(c)));
  let headerAt = -1;
  let cols = null;
  for (let i = 0; i < Math.min(25, table.length); i++) {
    const names = table[i].map(cellText);
    const find = (re, exclude = []) => names.findIndex((n, idx) => n && re.test(n) && !exclude.includes(idx));
    const date = find(HEAD.date);
    if (date < 0) continue;
    const balance = find(HEAD.balance);
    const debit = find(HEAD.debit, [balance]);
    const credit = find(HEAD.credit, [balance, debit]);
    const amount = find(HEAD.amount);
    if (debit < 0 && credit < 0 && amount < 0) continue;
    headerAt = i;
    cols = { date, desc: find(HEAD.desc, [date]), debit, credit, amount, type: find(HEAD.type), balance };
    break;
  }
  // No recognisable header: read each row as a line of text.
  if (!cols) return parseTextLines(table.map((r) => r.map(cellText).join('  ')));

  const txs = [];
  for (const row of table.slice(headerAt + 1)) {
    const date = parseDateCell(row[cols.date]);
    if (!date) continue;
    const rowText = row.map(cellText).join(' ');
    if (SKIP_RE.test(rowText)) continue;
    let amount = null;
    let type = null;
    const debit = cols.debit >= 0 ? numberCell(row[cols.debit]) : null;
    const credit = cols.credit >= 0 ? numberCell(row[cols.credit]) : null;
    if (debit && debit > 0) {
      amount = debit;
      type = 'debit';
    } else if (credit && credit > 0) {
      amount = credit;
      type = 'credit';
    } else if (cols.amount >= 0) {
      const raw = cellText(row[cols.amount]);
      const n = numberCell(row[cols.amount]);
      if (n) {
        amount = Math.abs(n);
        const t = cols.type >= 0 ? cellText(row[cols.type]).toLowerCase() : '';
        if (/^(dr|debit|d|paid|sent|withdrawal)/.test(t) || /dr$/i.test(raw) || n < 0) type = 'debit';
        else if (/^(cr|credit|c|received|deposit)/.test(t) || /cr$/i.test(raw)) type = 'credit';
        else type = typeOf(rowText) || 'debit';
      }
    }
    if (!amount || !type) continue;
    const description = cleanDescription(cols.desc >= 0 ? cellText(row[cols.desc]) || rowText : rowText);
    txs.push({ date: date.toISOString(), description, amount: Math.round(amount * 100) / 100, type, category: categorize(`${description} ${rowText}`, type) });
  }
  return txs;
};

// Local calendar day (statements are in Indian time, so UTC days would shift late-night rows).
const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').slice(0, 14);

// Marks likely duplicates: the same transaction in two statements (e.g. PhonePe and the bank),
// or one already saved. Duplicates are unticked by default in the preview.
export const markDuplicates = (incoming, existing = []) => {
  const seen = new Map();
  const add = (t, label) => {
    const k = `${dayKey(t.date)}|${t.type}|${Number(t.amount).toFixed(2)}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push({ label, name: norm(t.description) });
  };
  for (const t of existing) add(t, 'saved');
  return incoming.map((t) => {
    const k = `${dayKey(t.date)}|${t.type}|${Number(t.amount).toFixed(2)}`;
    const prior = seen.get(k) || [];
    const sameText = prior.find((p) => p.name === norm(t.description));
    const dup = sameText ? 'exact' : prior.length ? 'likely' : null;
    add(t, 'new');
    return { ...t, duplicate: dup, include: !dup };
  });
};

export const summarizePeriod = (txs) => {
  if (!txs.length) return { start: null, end: null };
  const days = txs.map((t) => dayKey(t.date)).sort();
  return { start: days[0], end: days[days.length - 1] };
};
