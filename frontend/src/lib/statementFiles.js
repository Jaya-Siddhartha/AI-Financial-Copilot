// Reads an uploaded statement file in the browser (nothing is sent anywhere to read it) and
// returns its transactions. PDF, CSV and Excel (.xlsx) are supported.

import { detectSource, parseRows, parseTextLines, summarizePeriod } from './statementParser.js';
import { parseCreditReport } from './creditReport.js';

export class StatementError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const extension = (name) => String(name).toLowerCase().split('.').pop();

// PDF text comes as positioned pieces; pieces on the same line (same height on the page) are
// joined left to right, with a double space where there is a visible gap (a column break).
export const pdfLines = async (file, password) => {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, password: password || undefined, isEvalSupported: false }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new StatementError(
        err.code === 2 ? 'WRONG_PASSWORD' : 'NEEDS_PASSWORD',
        err.code === 2 ? 'That password did not open the file. Try again.' : 'This PDF is locked. Enter its password (for PhonePe it is usually your mobile number).'
      );
    }
    throw new StatementError('UNREADABLE', 'This PDF could not be opened. It may be damaged.');
  }
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: item.transform[4], w: item.width || 0, s: item.str });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, pieces]) => {
        pieces.sort((a, b) => a.x - b.x);
        let line = '';
        let end = null;
        for (const piece of pieces) {
          if (end !== null) line += piece.x - end > 12 ? '  ' : ' ';
          line += piece.s;
          end = piece.x + piece.w;
        }
        lines.push(line.trim());
      });
  }
  if (lines.join('').trim().length < 20) {
    throw new StatementError('NO_TEXT', 'This PDF is a scanned image, so its text cannot be read. Download the statement again as a normal PDF, Excel or CSV.');
  }
  return lines;
};

const csvRows = async (file) => {
  const Papa = (await import('papaparse')).default;
  const text = await file.text();
  return Papa.parse(text, { skipEmptyLines: true }).data;
};

const xlsxRows = async (file) => {
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(file);
};

export const readStatement = async (file, password) => {
  const ext = extension(file.name);
  if (file.size > 10 * 1024 * 1024) throw new StatementError('TOO_BIG', 'This file is over 10 MB. Download a shorter period.');
  let transactions;
  let text;
  if (ext === 'pdf') {
    const lines = await pdfLines(file, password);
    text = lines.join('\n');
    transactions = parseTextLines(lines);
  } else if (ext === 'csv' || ext === 'txt') {
    const rows = await csvRows(file);
    text = rows.map((r) => r.join(' ')).join('\n');
    transactions = parseRows(rows);
  } else if (ext === 'xlsx') {
    const rows = await xlsxRows(file);
    text = rows.map((r) => r.join(' ')).join('\n');
    transactions = parseRows(rows);
  } else if (ext === 'xls') {
    throw new StatementError('OLD_EXCEL', 'Old .xls files are not supported. Open it and save as .xlsx or CSV, then upload again.');
  } else {
    throw new StatementError('TYPE', 'Upload a PDF, Excel (.xlsx) or CSV statement.');
  }
  if (!transactions.length) {
    throw new StatementError('EMPTY', 'No transactions were found in this file. Check it is a transaction statement, not a summary.');
  }
  return { transactions, source: detectSource(`${file.name} ${text.slice(0, 3000)}`), period: summarizePeriod(transactions) };
};

// Reads the score and key facts from a credit report PDF (CIBIL, Experian, Equifax, CRIF).
export const readCreditReport = async (file, password) => {
  if (!/\.pdf$/i.test(file.name)) throw new StatementError('TYPE', 'Upload the credit report as a PDF.');
  if (file.size > 10 * 1024 * 1024) throw new StatementError('TOO_BIG', 'This file is over 10 MB.');
  const lines = await pdfLines(file, password);
  const facts = parseCreditReport(lines.join(' '));
  if (!facts.score) {
    throw new StatementError(
      facts.noHistory ? 'NO_HISTORY' : 'NO_SCORE',
      facts.noHistory
        ? 'This report says there is no credit history yet (shown as NH or -1). That is normal before your first loan or card.'
        : 'No score between 300 and 900 was found in this file. Check it is your credit report, or type the score in instead.'
    );
  }
  return facts;
};
