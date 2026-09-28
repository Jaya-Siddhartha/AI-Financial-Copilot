// Reads the key facts from the text of a credit report (the free yearly report from CIBIL,
// Experian, Equifax or CRIF High Mark that anyone in India can download). Pure function: the
// browser code extracts the PDF text and hands it here. Nothing is sent anywhere.

import { findDate } from './statementParser.js';

export const BUREAUS = ['CIBIL', 'Experian', 'Equifax', 'CRIF High Mark'];

// Where to get the free report (RBI: one free full report a year from each bureau).
export const FREE_REPORT_LINKS = [
  { bureau: 'CIBIL', url: 'https://www.cibil.com/freecibilscore', note: 'TransUnion CIBIL: free yearly report' },
  { bureau: 'Experian', url: 'https://www.experian.in', note: 'Experian India: free credit report' },
  { bureau: 'Equifax', url: 'https://www.equifax.co.in', note: 'Equifax India: free yearly report' },
  { bureau: 'CRIF High Mark', url: 'https://www.crifhighmark.com', note: 'CRIF High Mark: free yearly report' },
];

export const scoreBand = (score) => {
  const n = Number(score);
  if (n >= 750) return { label: 'Excellent', tone: 'green', note: 'Most lenders offer their best rates.' };
  if (n >= 700) return { label: 'Good', tone: 'green', note: 'Loans are usually approved easily.' };
  if (n >= 650) return { label: 'Fair', tone: 'amber', note: 'Loans are possible, often at higher interest.' };
  if (n >= 550) return { label: 'Needs work', tone: 'red', note: 'Many lenders may say no. Pay every EMI on time.' };
  return { label: 'Poor', tone: 'red', note: 'Focus on clearing overdue payments first.' };
};

const detectBureau = (text) => {
  const head = text.slice(0, 4000).toLowerCase();
  const hits = [
    ['CIBIL', head.search(/transunion|cibil/)],
    ['Experian', head.search(/experian/)],
    ['Equifax', head.search(/equifax/)],
    ['CRIF High Mark', head.search(/crif|high ?mark/)],
  ].filter(([, i]) => i >= 0);
  hits.sort((a, b) => a[1] - b[1]);
  return hits[0]?.[0] || null;
};

// The score is a 3-digit number between 300 and 900 shortly after the word "score".
const detectScore = (text) => {
  const re = /score/gi;
  let m;
  while ((m = re.exec(text))) {
    const after = text.slice(m.index + 5, m.index + 90);
    // Skip model version numbers like "3.0" or "2.2" and dates, take the first plausible score.
    const nums = [...after.matchAll(/(?<![\d./-])(\d{3})(?![\d./-])/g)].map((x) => Number(x[1]));
    const score = nums.find((n) => n >= 300 && n <= 900);
    if (score) return score;
  }
  return null;
};

const detectDate = (text) => {
  const key = /(date of report|report date|date of issue|generated on|report generated|date)\s*[:\-]?\s*/gi;
  let m;
  while ((m = key.exec(text))) {
    const found = findDate(text.slice(m.index + m[0].length, m.index + m[0].length + 40));
    if (found && found.index <= 4) return found.date;
  }
  return findDate(text.slice(0, 3000))?.date || null;
};

const countAfter = (text, re) => {
  const m = text.match(re);
  return m ? Number(m[m.length - 1]) : null;
};

export const parseCreditReport = (rawText) => {
  const text = String(rawText || '').replace(/\s+/g, ' ');
  const noHistory = /\b(NH|no credit history|-1)\b/.test(text) && !detectScore(text);
  const score = detectScore(text);
  const date = detectDate(text);
  return {
    score,
    noHistory: Boolean(noHistory),
    bureau: detectBureau(text),
    reportDate: date ? date.toISOString().slice(0, 10) : null,
    activeAccounts: countAfter(text, /(?:active|open)\s+accounts?\s*[:\-]?\s*(\d{1,3})\b/i),
    overdueAccounts: countAfter(text, /(?:overdue|delinquent)\s+accounts?\s*[:\-]?\s*(\d{1,3})\b/i),
    // "Enquiries in last 30 days 1" means 1 enquiry, so the time period is skipped.
    enquiries: countAfter(text, /(?:enquiries|inquiries)(?:\s+(?:in|during)\s+(?:the\s+)?(?:last|past)\s+\d{1,3}\s+(?:days?|months?))?\s*[:-]?\s*(\d{1,3})\b/i),
  };
};
