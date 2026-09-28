// End-to-end test: uses the built app (dist/) like a person would, in a real headless browser
// (Chrome or Edge), and checks that every number on screen adds up.
//
//   npm run test:e2e                      builds, then runs every check
//   E2E_SHOTS=../docs/screenshots npm run test:e2e   also saves screenshots
//   CHROME_PATH=/path/to/chrome npm run test:e2e     use a specific browser
//
// Results are written to tests/e2e-report.json. Exit code 1 if any check fails.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepaymentSavings } from '../src/lib/emiCalc.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests', 'fixtures');
const APP_PORT = Number(process.env.E2E_PORT) || 4179;
const CDP_PORT = APP_PORT + 1;
const APP = `http://127.0.0.1:${APP_PORT}/`;
const SHOTS = process.env.E2E_SHOTS ? path.resolve(ROOT, process.env.E2E_SHOTS) : null;
const DAY = 86400000;
const KEY = 'fincopilot.data.v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- results ----------

const checks = [];
let section = 'setup';
const check = (name, ok, detail) => {
  checks.push({ section, name, ok: Boolean(ok), ...(ok ? {} : { detail }) });
  console.log(`${ok ? '  ok ' : '  FAIL'} ${name}${ok ? '' : `  ${JSON.stringify(detail ?? '').slice(0, 300)}`}`);
};
const close = (a, b, tol = 0.51) => Math.abs(Number(a) - Number(b)) <= tol;

// ---------- start the app and a browser ----------

const findBrowser = () => {
  const list = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = list.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
  return found;
};

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('Build the app first: npm run build');
const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(APP_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincopilot-e2e-'));
const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'fincopilot-dl-'));
const browser = spawn(findBrowser(), ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-extensions', '--lang=en-IN', 'about:blank'], { stdio: 'ignore' });
const shutdown = () => {
  try { browser.kill(); } catch { /* already closed */ }
  try { server.kill(); } catch { /* already closed */ }
};
process.on('exit', shutdown);

for (let i = 0; i < 80; i++) {
  if (await fetch(APP).then((r) => r.ok).catch(() => false)) break;
  await sleep(150);
}
let target;
let browserExit = null;
browser.on('exit', (code) => {
  browserExit = code;
});
for (let i = 0; i < 200 && !target && browserExit === null; i++) {
  await sleep(150);
  const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((r) => r.json()).catch(() => null);
  target = list?.find((t) => t.type === 'page');
}
if (!target) throw new Error(browserExit === null ? 'The browser did not start in 30 s.' : `The browser closed on start (exit code ${browserExit}).`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
let nextId = 0;
const pending = new Map();
const consoleErrors = [];
let offline = false;
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (offline) return;
  if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push({ section, text: msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text });
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push({ section, text: msg.params.args.map((a) => a.value ?? a.description).join(' ') });
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    const { url = '', text } = msg.params.entry;
    if (!url || url.startsWith(APP)) consoleErrors.push({ section, text, url });
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expression, label, timeout = 10000) => {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = await js(expression);
      if (last) return last;
    } catch {
      // page is loading
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for: ${label || expression}`);
};

// Helpers that run inside the page. They set values the way React expects and find buttons by
// the text a person would read.
const HELPERS = `
window.__t = {
  vis: (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  scope: (inSheet) => (inSheet ? [...document.querySelectorAll('.sheet')].pop() : document) || document,
  find: (text, inSheet) => {
    const want = text.toLowerCase();
    const els = [...__t.scope(inSheet).querySelectorAll('button, a[href], [role=tab], [role=radio], summary')].filter(__t.vis);
    const name = (e) => e.textContent.replace(/\\s+/g, ' ').trim().toLowerCase();
    return els.find((e) => name(e) === want) || els.find((e) => (e.getAttribute('aria-label') || '').toLowerCase() === want) || els.find((e) => name(e).startsWith(want)) || els.find((e) => name(e).includes(want));
  },
  click: (text, inSheet) => {
    const el = __t.find(text, inSheet);
    if (!el) throw new Error('No button: ' + text);
    if (el.disabled) throw new Error('Button is disabled: ' + text);
    el.click();
    return true;
  },
  clickSel: (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('Not found: ' + sel);
    el.click();
    return true;
  },
  fill: (sel, value) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) throw new Error('No field: ' + sel);
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    return true;
  },
  text: (sel) => document.querySelector(sel)?.textContent.replace(/\\s+/g, ' ').trim() ?? null,
  money: (s) => {
    const t = String(s ?? '');
    const n = Number(t.replace(/[^0-9.]/g, ''));
    return /[−-]\\s*₹?\\s*[0-9]/.test(t) ? -n : n;
  },
  db: () => JSON.parse(localStorage.getItem('${KEY}') || 'null'),
  sheetOpen: () => !!document.querySelector('.sheet'),
  badText: () => {
    const text = document.body.innerText;
    const m = text.match(/.{0,40}(\\bNaN\\b|\\bundefined\\b|\\bInfinity\\b|\\[object Object\\]|\\bnull\\b).{0,40}/);
    return m ? m[0] : null;
  },
  overflow: (root) => {
    const w = document.documentElement.clientWidth;
    const out = [];
    if (document.documentElement.scrollWidth > w + 1) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + w);
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
      }
      return false;
    };
    for (const el of (root || document.body).querySelectorAll('*')) {
      if (!__t.vis(el) || el.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > w + 1 || r.left < -1) && r.width > 0 && !clipped(el)) {
        out.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ').join('.') + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
        if (out.length > 4) break;
      }
    }
    return out;
  },
  a11y: () => {
    const bad = [];
    const small = [];
    const els = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=tab], [role=radio], [role=img], summary')].filter(__t.vis);
    for (const el of els) {
      let name = (el.getAttribute('aria-label') || '').trim();
      if (!name && el.getAttribute('aria-labelledby')) name = el.getAttribute('aria-labelledby').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (!name && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
        if (el.id) name = document.querySelector('label[for="' + CSS.escape(el.id) + '"]')?.textContent.trim() || '';
        if (!name) name = el.closest('label')?.textContent.trim() || '';
      } else if (!name) name = el.textContent.trim() || el.getAttribute('title') || '';
      if (!name) bad.push(el.outerHTML.slice(0, 140));
      if (['BUTTON', 'A', 'SELECT'].includes(el.tagName) || (el.tagName === 'INPUT' && el.type !== 'checkbox')) {
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) small.push((name || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    }
    return { bad, small };
  },
};
true;`;

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('DOM.enable');
await send('Network.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });
try {
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
} catch {
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
}

const size = (width, height = 860) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
const shot = async (name) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
};
const setFile = async (expression, file) => {
  const r = await send('Runtime.evaluate', { expression });
  if (!r.result.objectId) throw new Error(`No file input: ${expression}`);
  await send('DOM.setFileInputFiles', { files: [file], objectId: r.result.objectId });
};
const click = (text, inSheet = false) => js(`__t.click(${JSON.stringify(text)}, ${inSheet})`);
const fill = (sel, value) => js(`__t.fill(${JSON.stringify(sel)}, ${JSON.stringify(String(value))})`);
const text = (sel) => js(`__t.text(${JSON.stringify(sel)})`);
const money = async (sel) => js(`__t.money(__t.text(${JSON.stringify(sel)}))`);
const db = () => js('__t.db()');
const sheetClosed = (label = 'sheet to close') => waitFor('!__t.sheetOpen()', label);
const escape = () => js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`);

const PAGES = {
  home: '!!document.querySelector(".hero-value")',
  activity: '__t.text("h1") === "All transactions"',
  insights: '__t.text("h1") === "Your money at a glance"',
  emis: '__t.text("h1") === "Loans and EMIs" && !!document.querySelector("[aria-label=\'EMI view\']")',
  calculator: '!!document.querySelector("#calc-p")',
  credit: '__t.text("h1") === "Your credit score"',
  assistant: '!!document.querySelector(".chips")',
  settings: '!!document.querySelector("#buffer-title")',
};
const go = async (tab) => {
  for (let i = 0; i < 3 && (await js('__t.sheetOpen()')); i++) {
    await escape();
    await sleep(80);
  }
  await js(`location.hash = '#${tab}'; true`);
  await waitFor(PAGES[tab], `${tab} page`);
  await sleep(60);
};
// Always a full page load (navigating to the same URL with only a new #hash would not reload).
const load = async (url = APP) => {
  await send('Page.navigate', { url: 'about:blank' });
  await send('Page.navigate', { url });
  await waitFor('document.readyState === "complete" && !!window.__t && !!document.querySelector("#root > *")', 'page load', 20000);
};
const safeNow = async () => {
  await go('home');
  return money('.hero-value');
};

const run = async (name, fn) => {
  section = name;
  console.log(`\n${name}`);
  const t0 = Date.now();
  try {
    await fn();
  } catch (err) {
    check(`section finished without errors`, false, err.message);
    if (SHOTS) await shot(`failed-${name.replace(/\W+/g, '-')}`).catch(() => {});
  }
  console.log(`  (${Date.now() - t0} ms)`);
};

// ---------- the checks ----------

await size(390);
await load();
await js(`localStorage.clear(); true`);
await load();

const today = new Date();
let balance = 40000;
const BUFFER = 2000;

await run('Onboarding', async () => {
  await waitFor('!!document.querySelector("#ob-name")', 'onboarding');
  check('a new device starts at onboarding', true);
  await click('Continue');
  check('an empty name is refused', await waitFor('document.body.innerText.includes("Enter your name.")', 'name error'));
  await fill('#ob-name', 'Asha Test');
  await fill('#ob-income', '60000');
  await fill('#ob-day', '0');
  await click('Continue');
  check('salary day 0 is refused', await waitFor('document.body.innerText.includes("Salary day must be between 1 and 31")', 'day error'));
  await fill('#ob-day', '1');
  await click('Continue');
  await waitFor('!!document.querySelector("#ob-balance")', 'balance step');
  await fill('#ob-balance', String(balance));
  await click('Continue');
  await waitFor('!!document.querySelector("#ob-buffer")', 'buffer step');
  await fill('#ob-buffer', String(BUFFER));
  await click('Continue');
  await waitFor('!!document.querySelector(".theme-grid")', 'theme step');
  await click('Start using FinCopilot');
  await waitFor(PAGES.home, 'home after onboarding');
  check('greets the user by first name', (await text('.greeting h1')) === 'Hi, Asha');
  const d = await db();
  check('profile saved on the device', d.profile.onboarded && d.profile.monthlyIncome === 60000 && d.profile.bufferAmount === BUFFER && d.profile.balanceAmount === balance, d.profile);
});

await run('Home: safe to spend and daily allowance', async () => {
  const safe = await money('.hero-value');
  check('safe to spend = balance − buffer when there are no EMIs', safe === balance - BUFFER, { safe });
  check('balance shown matches what was typed', (await money('.balance-value')) === balance);
  const allowance = await text('.hero-allowance');
  const m = allowance && allowance.replace(/,/g, '').match(/₹(\d+) a day for the next (\d+) day/);
  check('daily allowance is shown', Boolean(m), allowance);
  if (m) {
    const [perDay, days] = [Number(m[1]), Number(m[2])];
    check('allowance × days ≤ safe to spend, and uses it all', perDay * days <= safe && (perDay + 1) * days > safe, { perDay, days, safe });
    const next = today.getDate() === 1 ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const expectDays = Math.round((new Date(next.getFullYear(), next.getMonth(), next.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / DAY);
    check('allowance runs until salary day', days === expectDays, { days, expectDays });
  }
  check('credit score card invites adding the CIBIL score', (await js('document.body.innerText.includes("Add your CIBIL score")')));
  await shot('e2e-home-new-user');
});

await run('Transactions: add, edit, delete', async () => {
  await click('Add expense');
  await waitFor('!!document.querySelector("input[aria-label=Amount]")', 'amount field');
  await click('Save', true);
  check('an empty amount is refused', await waitFor('!!document.querySelector(".sheet .alert")', 'amount error'));
  await fill('input[aria-label=Amount]', '500');
  await fill('#tx-desc', 'Swiggy dinner');
  await js('__t.clickSel("button[form=tx-form]")');
  await sheetClosed();
  balance -= 500;
  check('an expense lowers the balance', (await money('.balance-value')) === balance);
  check('safe to spend follows', (await money('.hero-value')) === balance - BUFFER);

  await click('Add income');
  await waitFor('!!document.querySelector("input[aria-label=Amount]")', 'amount field');
  await fill('input[aria-label=Amount]', '1000');
  await fill('#tx-desc', 'Cash from Ravi');
  await js('__t.clickSel("button[form=tx-form]")');
  await sheetClosed();
  balance += 1000;
  check('income raises the balance', (await money('.balance-value')) === balance);

  await go('activity');
  await click('Swiggy dinner');
  await waitFor('!!document.querySelector("#tx-desc")', 'edit sheet');
  await fill('input[aria-label=Amount]', '700');
  await click('Save changes', true);
  await sheetClosed();
  balance -= 200;
  check('editing an amount updates the balance by the difference', (await safeNow()) === balance - BUFFER && (await money('.balance-value')) === balance);

  await go('activity');
  await click('Swiggy dinner');
  await waitFor('!!document.querySelector("#tx-desc")', 'edit sheet');
  await click('Delete transaction', true);
  await waitFor('__t.find("Delete", true) && document.querySelector(".sheet h2")?.textContent.includes("Delete")', 'confirm');
  await click('Delete', true);
  await sheetClosed();
  balance += 700;
  check('deleting gives the money back', (await safeNow()) === balance - BUFFER && (await money('.balance-value')) === balance);
  check('only the income is left', (await db()).transactions.length === 1);
});

await run('EMIs: add and mark as paid', async () => {
  const due = new Date(today.getTime() + 5 * DAY);
  await go('emis');
  await click('Add EMI');
  await waitFor('!!document.querySelector("#emi-name")', 'EMI form');
  await fill('#emi-name', 'Bike loan');
  await fill('#emi-lender', 'Test Bank');
  await fill('#emi-amount', '3000');
  await fill('#emi-day', String(due.getDate()));
  await fill('#emi-left', '12');
  await js('__t.clickSel("button[form=emi-form]")');
  await sheetClosed();
  const safe = await safeNow();
  check('an EMI due in 5 days is kept aside', safe === balance - 3000 - BUFFER, { safe, balance });
  check('Home shows the next EMI', (await js('document.body.innerText.includes("Bike loan")')) && (await js('document.body.innerText.includes("in 5 days")')));
  await click('Paid it');
  await waitFor('!!__t.find("Yes, I paid", true)', 'pay sheet');
  await click('Yes, I paid', true);
  await sheetClosed();
  balance -= 3000;
  check('paying the EMI lowers the balance', (await money('.balance-value')) === balance);
  check('a paid EMI is not kept aside again', (await money('.hero-value')) === balance - BUFFER);
  check('Home says all EMIs are paid', await js('document.body.innerText.includes("All EMIs are paid for now")'));
  const d = await db();
  check('the payment is in history, linked to the EMI', d.transactions.some((t) => t.emiId === d.emis[0].id && t.amount === 3000));
  await go('emis');
  check('the EMI list shows it as paid', await js('document.body.innerText.toLowerCase().includes("paid")'));
});

await run('Upload statements (PDF with password, CSV, Excel)', async () => {
  const before = (await db()).transactions.length;
  await go('home');
  await click('Upload statements');
  await waitFor('document.querySelectorAll(".slots input[type=file]").length >= 3', 'upload slots');
  await setFile('document.querySelectorAll(".slots input[type=file]")[0]', path.join(FIX, 'phonepe_statement.pdf'));
  await waitFor('!!document.querySelector("input[aria-label=\'Password for statement 1\']")', 'password field');
  await fill("input[aria-label='Password for statement 1']", '9876543210');
  await setFile('document.querySelectorAll(".slots input[type=file]")[1]', path.join(FIX, 'bank_statement.csv'));
  await setFile('document.querySelectorAll(".slots input[type=file]")[2]', path.join(FIX, 'gpay_statement.xlsx'));
  await waitFor('!!__t.find("Read 3 files", true)', 'read button');
  await click('Read 3 files', true);
  await waitFor('document.querySelector(".sheet h2")?.textContent === "Check before adding"', 'review step', 30000);
  const counts = await js(`(() => { const rows = [...document.querySelectorAll('.review-row .row-sub')].map((e) => e.textContent); return [1, 2, 3].map((n) => rows.filter((r) => r.includes('Statement ' + n)).length); })()`);
  check('PhonePe PDF: 14, bank CSV: 25, Google Pay Excel: 6 transactions', JSON.stringify(counts) === '[14,25,6]', counts);
  check('5 duplicates found and unticked', await js('!!__t.find("Duplicates (5)", true)'));
  check('40 transactions ready to add', await js('!!__t.find("Add 40 transactions", true)'));
  const totals = await js(`(() => { const rows = [...document.querySelectorAll('.review-row:not(.off)')]; let out = 0, inn = 0; for (const r of rows) { const a = __t.money(r.querySelector('.row-amount').textContent); if (r.querySelector('.row-amount').classList.contains('credit')) inn += Math.abs(a); else out += Math.abs(a); } return { out, inn, shownOut: __t.money(document.querySelectorAll('.sheet .compare-value')[0].textContent), shownIn: __t.money(document.querySelectorAll('.sheet .compare-value')[1].textContent) }; })()`);
  check('review totals add up to the ticked rows', close(totals.out, totals.shownOut, 0.01) && close(totals.inn, totals.shownIn, 0.01), totals);
  await click('Add 40 transactions', true);
  await sheetClosed('import to finish');
  const d = await db();
  check('40 transactions saved, 3 statements listed', d.transactions.length === before + 40 && d.statements.length === 3, { tx: d.transactions.length - before, statements: d.statements.length });
  check('older statement rows do not change today\'s balance', (await money('.balance-value')) === balance);
});

// Compares each month header on the History page with totals worked out from the saved data.
const historyTally = () =>
  js(`(() => {
    const d = __t.db();
    const groups = {};
    for (const t of d.transactions) {
      const k = new Date(t.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      groups[k] ||= { out: 0, in: 0 };
      groups[k][t.type === 'debit' ? 'out' : 'in'] += t.amount;
    }
    const heads = [...document.querySelectorAll('.month-head')].map((h) => ({ label: h.querySelector('.month-label').textContent.split(' · ')[0].trim(), out: Math.abs(__t.money(h.querySelector('.text-danger').textContent)), in: __t.money(h.querySelector('.text-green').textContent) }));
    const ok = heads.every((h) => groups[h.label] && Math.abs(groups[h.label].out - h.out) <= 0.01 && Math.abs(groups[h.label].in - h.in) <= 0.01);
    return { ok, heads, groups, rows: document.querySelectorAll('.list .row').length, total: d.transactions.length };
  })()`);

await run('History: month totals tally with the data', async () => {
  await go('activity');
  const r = await historyTally();
  check('every month in the data has a header', r.heads.length === Object.keys(r.groups).length, r.heads.map((h) => h.label));
  check('month money-out and money-in totals match the transactions', r.ok, r);
  check('every transaction is listed', r.rows === Math.min(200, r.total), { rows: r.rows, total: r.total });
  await fill("input[aria-label='Search transactions']", 'netflix');
  await sleep(150);
  const found = await js(`[...document.querySelectorAll('.list .row .row-title')].map((e) => e.textContent.toLowerCase())`);
  check('search finds only matching rows', found.length > 0 && found.every((t) => t.includes('netflix')), found);
  await fill("input[aria-label='Search transactions']", '');
});

await run('Insights: every figure adds up', async () => {
  await go('insights');
  const calc = await js(`[...document.querySelectorAll('.calc .calc-row')].map((r) => __t.money(r.lastElementChild.textContent))`);
  const [bal, emis, everyday, buf, total] = calc.map(Math.abs);
  check('safe to spend = balance − EMIs − everyday spending − buffer', close(Math.max(0, bal - emis - everyday - buf), total, 1), calc);
  check('buffer line shows the chosen buffer', buf === BUFFER, calc);
  check('Insights and Home show the same safe-to-spend', total === (await safeNow()));
  await go('insights');
  const donut = await js(`(() => ({ total: __t.money(__t.text('.donut-total')), amounts: [...document.querySelectorAll('.donut-amt')].map((e) => __t.money(e.textContent)), pct: [...document.querySelectorAll('.donut-pct')].map((e) => Number(e.textContent.replace('%', ''))) }))()`);
  check('category percentages add up to 100%', donut.pct.reduce((s, v) => s + v, 0) === 100, donut.pct);
  check('category amounts add up to the donut total', close(donut.amounts.reduce((s, v) => s + v, 0), donut.total, 0.05), donut);
  const window30 = await js(`(() => { const now = Date.now(); return __t.db().transactions.filter((t) => t.type === 'debit' && new Date(t.date).getTime() >= now - 30 * 86400000 && new Date(t.date).getTime() <= now).reduce((s, t) => s + t.amount, 0); })()`);
  check('donut total = everything spent in the last 30 days', close(donut.total, window30, 0.05), { donut: donut.total, window30 });
  const monthSpent = await js(`__t.money(document.querySelectorAll('.compare-value')[0].textContent)`);
  const expectMonth = await js(`(() => { const n = new Date(); return __t.db().transactions.filter((t) => { const d = new Date(t.date); return t.type === 'debit' && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && d <= n; }).reduce((s, t) => s + t.amount, 0); })()`);
  check('"This month: spent" matches the transactions', close(monthSpent, expectMonth, 0.05), { monthSpent, expectMonth });
});

await run('Buffer: changing it moves safe-to-spend by exactly that much', async () => {
  const before = await safeNow();
  await go('settings');
  await fill("input[aria-label='Buffer amount']", '5000');
  await click('Set');
  await sleep(150);
  const after = await safeNow();
  check('raising the buffer by ₹3,000 lowers safe to spend by ₹3,000', before - after === Math.min(3000, before), { before, after });
  await go('settings');
  await click('₹2,000');
  await sleep(150);
  check('back to ₹2,000 restores it', (await safeNow()) === before);
  await go('settings');
  await js(`document.querySelector("input[aria-label='Keep a safety buffer']").click(); true`);
  await sleep(150);
  check('turning the buffer off adds it to safe to spend', (await safeNow()) === before + BUFFER);
  await go('settings');
  await js(`document.querySelector("input[aria-label='Keep a safety buffer']").click(); true`);
  await sleep(150);
  check('turning it back on takes it out again', (await safeNow()) === before);
});

await run('EMI calculator and prepayment', async () => {
  await go('home');
  await click('EMI calculator');
  await waitFor(PAGES.calculator, 'calculator from Home tile');
  check('the Home "EMI calculator" tile opens the calculator', true);
  check('₹5,00,000 at 10.5% for 3 years = ₹16,251 a month', await js('document.body.innerText.includes("₹16,251")'));
  const expected = prepaymentSavings(500000, 10.5, 36, 50000, 12);
  const shown = await js(`(() => { const card = [...document.querySelectorAll('.card')].find((c) => c.textContent.includes('Pay extra once')); return card ? [...card.querySelectorAll('.compare-value')].map((e) => e.textContent) : null; })()`);
  check('prepayment card shows the interest saved', shown && (await js(`__t.money(${JSON.stringify(shown[0])})`)) === expected.interestSaved, { shown, expected });
  check('prepayment card shows months saved', shown && shown[1].startsWith(`${expected.monthsSaved} month`), { shown, expected });
  await fill('#pre-amt', '0');
  await sleep(100);
  check('no extra payment → nothing saved', await js(`[...document.querySelectorAll('.card')].find((c) => c.textContent.includes('Pay extra once')).querySelector('.compare-value').textContent === '₹0'`));
  await shot('e2e-calculator');
});

await run('Credit score: type it in, or read the report PDF', async () => {
  await go('credit');
  await click('Add score');
  await waitFor('!!document.querySelector("#score-value")', 'score form');
  await fill('#score-value', '950');
  await click('Save score', true);
  check('a score above 900 is refused', await waitFor('document.querySelector(".sheet .alert")?.textContent.includes("between 300 and 900")', 'range error'));
  await fill('#score-value', '745');
  check('the band is shown while typing', await js('document.querySelector(".sheet").innerText.includes("Good")'));
  await click('Save score', true);
  await sheetClosed();
  check('the gauge shows 745 · Good', (await text('.credit-number')) === '745' && (await js('document.querySelector(".credit-score").textContent.includes("Good")')));

  await click('Add score');
  await waitFor('!!document.querySelector("#score-value")', 'score form');
  await click('Upload report', true);
  await setFile('document.querySelector(".sheet input[type=file]")', path.join(FIX, 'credit_report.pdf'));
  await fill("input[aria-label='Report password']", 'wrong-password');
  await click('Read my report', true);
  check('a wrong PDF password gives a clear message', await waitFor('!!document.querySelector(".sheet .alert") && !document.querySelector("#score-value")', 'password error', 20000));
  await fill("input[aria-label='Report password']", 'ASHA1990');
  await click('Read my report', true);
  await waitFor('document.querySelector("#score-value")?.value === "752"', 'score read from PDF', 20000);
  const summary = await text('.sheet .alert');
  check('the report is read: 752, CIBIL, 3 active, 0 overdue', /score 752/.test(summary) && /CIBIL/.test(summary) && /3 active accounts/.test(summary) && /0 overdue/.test(summary), summary);
  check('the report date is filled in', (await js('document.querySelector("#score-date").value')) === '2026-09-14');
  await click('Save score', true);
  await sheetClosed();
  check('newest score (typed today) stays on top', (await text('.credit-number')) === '745');
  check('change since the last report is shown', await js('document.body.innerText.includes("Down 7 points")'));
  check('score history has 2 bars', (await js('document.querySelectorAll(".score-bar").length')) === 2);
  const d = await db();
  check('the report score is saved with its details', d.creditScores.some((c) => c.score === 752 && c.source === 'report' && c.details?.activeAccounts === 3 && c.details?.enquiries === 1), d.creditScores);
  check('free report links for all 4 bureaus', (await js('document.querySelectorAll("a.link-row").length')) === 4);
  await go('home');
  check('Home shows the real score', (await text('.score-pill')) === '745');
  await go('assistant');
  await click('What is my CIBIL score?');
  await waitFor('[...document.querySelectorAll(".bubble.assistant")].some((b) => b.textContent.includes("745"))', 'assistant score answer');
  check('the assistant quotes the real CIBIL score', true);
  await go('credit');
  await shot('e2e-credit');
});

await run('Savings goals', async () => {
  await go('insights');
  await click('Add goal');
  await waitFor('!!document.querySelector("#goal-name")', 'goal form');
  await click('Save goal', true);
  check('a goal needs a name', await waitFor('!!document.querySelector(".sheet .alert")', 'goal error'));
  const target = new Date(today.getFullYear(), today.getMonth() + 6, Math.min(28, today.getDate()));
  await fill('#goal-name', 'New phone');
  await fill('#goal-target', '30000');
  await fill('#goal-saved', '6000');
  await fill('#goal-date', ymd(target));
  await click('Save goal', true);
  await sheetClosed();
  const row = await js(`[...document.querySelectorAll('.goal-row')].map((r) => r.innerText.replace(/\\s+/g, ' '))`);
  check('the goal shows progress and a monthly amount', row.length === 1 && row[0].includes('₹6,000 of ₹30,000') && /save ₹[\d,]+ a month for \d+ month/.test(row[0]), row);
  const per = row[0] && Number(row[0].replace(/,/g, '').match(/save ₹(\d+) a month for (\d+)/)?.[1]);
  const months = row[0] && Number(row[0].replace(/,/g, '').match(/for (\d+) month/)?.[1]);
  check('monthly amount × months covers what is left', per * months >= 24000 && (per - 1) * months < 24000, { per, months });
  check('progress bar is 20%', await js(`document.querySelector('.goal-row .progress span').style.width === '20%'`));
  await click('New phone');
  await waitFor('!!document.querySelector("#goal-saved")', 'edit goal');
  await fill('#goal-saved', '30000');
  await click('Save goal', true);
  await sheetClosed();
  check('a finished goal says Reached', await js(`document.querySelector('.goal-row .chip').textContent === 'Reached'`));
  await click('New phone');
  await waitFor('!!document.querySelector("#goal-saved")', 'edit goal');
  await click('Delete goal', true);
  await waitFor('document.querySelector(".sheet h2")?.textContent.startsWith("Delete")', 'confirm');
  await click('Delete', true);
  await sheetClosed();
  check('the goal is deleted', (await js('document.querySelectorAll(".goal-row").length')) === 0 && (await db()).goals.length === 0);
});

await run('Assistant: every suggested question gets a clean answer', async () => {
  await go('assistant');
  const chips = await js(`[...document.querySelectorAll('.chips .seg')].map((b) => b.textContent)`);
  for (const chip of chips) {
    const count = await js('document.querySelectorAll(".bubble.assistant").length');
    await js(`[...document.querySelectorAll('.chips .seg')].find((b) => b.textContent === ${JSON.stringify(chip)}).click(); true`);
    await waitFor(`document.querySelectorAll(".bubble.assistant").length > ${count} && !document.querySelector(".bubble.assistant:last-of-type .spin")`, `answer to ${chip}`);
  }
  const answers = await js(`[...document.querySelectorAll('.bubble.assistant .bubble-body')].map((b) => b.innerText)`);
  check(`all ${chips.length} questions answered`, answers.length >= chips.length, answers.length);
  check('no answer contains NaN, undefined or [object Object]', answers.every((a) => a.length > 20 && !/NaN|undefined|Infinity|\[object/.test(a)), answers.filter((a) => /NaN|undefined|Infinity|\[object/.test(a)));
  const safe = await safeNow();
  await go('assistant');
  check('"How much can I spend?" quotes the Home figure', answers.some((a) => a.includes(`₹${safe.toLocaleString('en-IN')}`)), { safe });
  await shot('e2e-assistant');
});

await run('Themes and text size', async () => {
  await go('settings');
  const seen = new Set();
  for (const theme of ['Light', 'Dark', 'Doomsday', 'Saffron', 'Ocean', 'Purple']) {
    await js(`[...document.querySelectorAll('.theme-grid [role=radio]')].find((b) => b.textContent.startsWith(${JSON.stringify(theme)})).click(); true`);
    await sleep(120);
    const r = await js(`({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor, bad: __t.badText() })`);
    check(`${theme} theme applies`, r.theme === theme.toLowerCase(), r);
    seen.add(r.bg);
  }
  check('each theme has its own background', seen.size === 6, [...seen]);
  const base = await js('parseFloat(getComputedStyle(document.documentElement).fontSize)');
  await click('Large');
  await sleep(100);
  const large = await js('parseFloat(getComputedStyle(document.documentElement).fontSize)');
  await click('Extra large');
  await sleep(100);
  const xl = await js('parseFloat(getComputedStyle(document.documentElement).fontSize)');
  check('text size grows: Normal < Large < Extra large', base < large && large < xl, { base, large, xl });
  await click('Normal');
  const saved = (await db()).profile;
  check('look is saved on the device', saved.theme === 'purple' && saved.textSize === 'normal');
});

await run('Layout, accessibility and clean text on every page and width', async () => {
  const problems = { overflow: [], names: [], small: [], text: [] };
  for (const width of [360, 390, 768, 1280]) {
    await size(width);
    for (const tab of Object.keys(PAGES)) {
      await go(tab);
      await sleep(120);
      const o = await js('__t.overflow()');
      if (o.length) problems.overflow.push({ width, tab, o });
      const t = await js('__t.badText()');
      if (t) problems.text.push({ width, tab, t });
      if (width === 390) {
        const a = await js('__t.a11y()');
        if (a.bad.length) problems.names.push({ tab, bad: a.bad });
        if (a.small.length) problems.small.push({ tab, small: a.small });
      }
    }
  }
  await size(360);
  const sheets = [
    ['home', 'Add expense'],
    ['home', 'Upload statements'],
    ['emis', 'Add EMI'],
    ['credit', 'Add score'],
    ['insights', 'Add goal'],
    ['home', 'Match with bank'],
  ];
  for (const [tab, button] of sheets) {
    await go(tab);
    await click(button);
    await waitFor('__t.sheetOpen()', `${button} sheet`);
    await sleep(150);
    const o = await js('__t.overflow(document.querySelector(".sheet"))');
    if (o.length) problems.overflow.push({ width: 360, sheet: button, o });
    const a = await js('__t.a11y()');
    if (a.bad.length) problems.names.push({ sheet: button, bad: a.bad });
    await escape();
    await sheetClosed();
  }
  check('nothing sticks out sideways at 360, 390, 768 and 1280 px', problems.overflow.length === 0, problems.overflow);
  check('no NaN, undefined, Infinity or [object Object] on any page', problems.text.length === 0, problems.text);
  check('every button, link and field has a name for screen readers', problems.names.length === 0, problems.names);
  check('every button and field is at least 24 × 24 px (WCAG 2.2)', problems.small.length === 0, problems.small);
  await size(390);
});

await run('Backup download and restore', async () => {
  await go('settings');
  const before = await db();
  fs.readdirSync(downloads).forEach((f) => fs.rmSync(path.join(downloads, f)));
  await click('Download backup');
  let file;
  for (let i = 0; i < 60 && !file; i++) {
    await sleep(100);
    file = fs.readdirSync(downloads).find((f) => /^fincopilot-backup-.*\.json$/.test(f));
  }
  check('the backup file downloads', Boolean(file));
  if (!file) return;
  const backup = JSON.parse(fs.readFileSync(path.join(downloads, file), 'utf8'));
  check('the backup has everything', backup.app === 'FinCopilot' && backup.transactions.length === before.transactions.length && backup.emis.length === before.emis.length && backup.creditScores.length === 2 && backup.statements.length === 3);
  await go('home');
  await click('Add expense');
  await waitFor('!!document.querySelector("input[aria-label=Amount]")', 'amount field');
  await fill('input[aria-label=Amount]', '999');
  await fill('#tx-desc', 'Added after backup');
  await js('__t.clickSel("button[form=tx-form]")');
  await sheetClosed();
  await go('settings');
  await setFile('document.querySelector("input[type=file][accept^=\'.json\']")', path.join(downloads, file));
  await waitFor('document.querySelector(".sheet h2")?.textContent.includes("Restore")', 'restore confirm');
  await click('Restore', true);
  await sheetClosed();
  const after = await db();
  check('restore brings back exactly the backed-up data', after.transactions.length === before.transactions.length && !after.transactions.some((t) => t.description === 'Added after backup') && after.creditScores.length === 2 && after.emis[0].createdAt === before.emis[0].createdAt);
  check('balance is the same as before the backup', (await safeNow()) === balance - BUFFER);
});

await run('Sample data', async () => {
  await go('settings');
  await click('Load sample data to try things out');
  await waitFor('document.querySelector(".sheet h2")?.textContent.includes("sample")', 'sample confirm');
  await click('Load sample data', true);
  await sheetClosed();
  await go('home');
  check('sample person is loaded', (await text('.greeting h1')) === 'Hi, Priya');
  check('a banner says it is sample data', await js('document.body.innerText.includes("This is sample data")'));
  check('no EMI is late in the sample', !(await js('!!document.querySelector(".banner.red")')));
  check('safe to spend and allowance are shown', (await text('.hero-value')) !== '—' && (await js('!!document.querySelector(".hero-allowance")')));
  const d = await db();
  check('sample has history, EMIs, 3 scores and 2 goals', d.transactions.length > 50 && d.emis.length === 2 && d.creditScores.length === 3 && d.goals.length === 2);
  await shot('e2e-sample-home');
  await go('insights');
  check('sample goals are listed', (await js('document.querySelectorAll(".goal-row").length')) === 2);
  check('no broken text with sample data', !(await js('__t.badText()')));
  await shot('e2e-sample-insights');
  await go('credit');
  check('sample credit history shows 3 scores', (await js('document.querySelectorAll(".score-bar").length')) === 3);
  await go('home');
  await click('Use my own data');
  await waitFor('document.querySelector(".sheet h2")?.textContent.includes("own money")', 'remove confirm');
  await click('Remove sample data', true);
  await waitFor('!!document.querySelector("#ob-name")', 'onboarding after removing sample');
  check('removing sample data goes back to onboarding', true);
  await click('Try it with sample data');
  await waitFor(PAGES.home, 'home with sample');
  check('onboarding "Try it with sample data" works', (await text('.greeting h1')) === 'Hi, Priya');
});

await run('Autopay catches up after a long break', async () => {
  // An autopay loan added 100 days ago, app not opened since: every missed month is recorded.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 100);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let expected = 0;
  for (let m = 0; m <= 5; m++) {
    const due = new Date(start.getFullYear(), start.getMonth() + m, 10);
    if (due >= start && due <= todayStart) expected += 1;
  }
  await js(`(() => {
    const d = __t.db();
    d.emis.push({ id: 'catchup', name: 'Gold loan', lender: '', amount: 1500, dueDay: 10, remainingMonths: 10, totalMonths: 12, autopay: true, paidThroughDate: null, lastPaidDate: null, createdAt: new Date(${start.getTime()} + 3600000).toISOString() });
    localStorage.setItem('${KEY}', JSON.stringify(d));
    return true;
  })()`);
  await load(`${APP}#home`);
  await waitFor(`__t.db().transactions.filter((t) => t.emiId === 'catchup').length === ${expected}`, `${expected} autopay payments`);
  const d = await db();
  const emi = d.emis.find((e) => e.id === 'catchup');
  check(`all ${expected} missed months are recorded as paid`, d.transactions.filter((t) => t.emiId === 'catchup' && t.source === 'autopay').length === expected);
  check('months left goes down by the same number', emi.remainingMonths === 10 - expected, emi.remainingMonths);
  check('the loan is not shown as late afterwards', !(await js('document.body.innerText.includes("Gold loan EMI is")')));
  await go('emis');
  check('the EMI list does not say "days late" for it', !(await js(`[...document.querySelectorAll('.emi')].some((e) => e.innerText.includes('Gold loan') && /late/i.test(e.querySelector('.chip').textContent))`)));
});

await run('Speed with 5,000 transactions', async () => {
  await js(`(() => {
    const d = __t.db();
    const names = ['Swiggy', 'Zomato', 'DMart', 'Uber', 'Airtel', 'Amazon', 'BigBasket', 'Petrol'];
    const cats = ['Food & Dining', 'Food & Dining', 'Groceries', 'Transport & Fuel', 'Mobile & Internet', 'Shopping', 'Groceries', 'Transport & Fuel'];
    const now = Date.now();
    d.transactions = Array.from({ length: 5000 }, (_, i) => ({ id: 'p' + i, date: new Date(now - (i % 365) * 86400000 - 3600000).toISOString(), description: names[i % 8] + ' ' + i, amount: 50 + (i * 37) % 2000, type: i % 25 === 0 ? 'credit' : 'debit', category: i % 25 === 0 ? 'Salary & Income' : cats[i % 8], note: '', source: 'manual', statementId: null, emiId: null }));
    localStorage.setItem('${KEY}', JSON.stringify(d));
    return true;
  })()`);
  let t0 = Date.now();
  await load(`${APP}#home`);
  await waitFor(PAGES.home, 'home with 5,000');
  const homeMs = Date.now() - t0;
  check(`Home opens in under 3 s with 5,000 transactions (${homeMs} ms)`, homeMs < 3000, homeMs);
  t0 = Date.now();
  await go('activity');
  await waitFor('document.querySelectorAll(".list .row").length >= 200', 'history rows');
  const histMs = Date.now() - t0;
  check(`History opens in under 1.5 s (${histMs} ms)`, histMs < 1500, histMs);
  const tally = await historyTally();
  check('with 5,000 transactions, month totals still cover every transaction (not just the 200 shown)', tally.ok && tally.rows === 200, { rows: tally.rows, heads: tally.heads.slice(-2) });
  check('"Show more" offers the rest', await js('!!__t.find("Show more (4800 left)")'));
  t0 = Date.now();
  await fill("input[aria-label='Search transactions']", 'uber 1');
  await waitFor(`[...document.querySelectorAll('.list .row .row-title')].every((e) => e.textContent.toLowerCase().includes('uber 1'))`, 'search results');
  const searchMs = Date.now() - t0;
  check(`search answers in under 1 s (${searchMs} ms)`, searchMs < 1000, searchMs);
  t0 = Date.now();
  await go('insights');
  const insightsMs = Date.now() - t0;
  check(`Insights opens in under 1.5 s (${insightsMs} ms)`, insightsMs < 1500, insightsMs);
  check('no broken text with 5,000 transactions', !(await js('__t.badText()')));
});

await run('Works offline once opened (service worker)', async () => {
  await load(`${APP}#home`);
  const active = await waitFor(`navigator.serviceWorker.getRegistration().then((r) => !!(r && r.active))`, 'service worker', 15000).catch(() => false);
  check('the offline service worker is installed', active);
  if (!active) return;
  await load(`${APP}#home`); // second visit: files now come through the service worker and are cached
  await sleep(500);
  offline = true;
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await load(`${APP}#home`).catch(() => {});
  const works = await waitFor(PAGES.home, 'home offline', 10000).catch(() => false);
  const how = await js('({ online: navigator.onLine, controlled: !!navigator.serviceWorker.controller })').catch(() => ({}));
  check('the app opens with no internet (served by the service worker)', works && how.online === false && how.controlled, how);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  offline = false;
});

section = 'console';
console.log('\nConsole');
check('no errors in the browser console', consoleErrors.length === 0, consoleErrors.slice(0, 5));

// ---------- report ----------

const failed = checks.filter((c) => !c.ok);
const report = {
  date: new Date().toISOString(),
  browser: findBrowser().split(/[\\/]/).pop(),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
fs.writeFileSync(path.join(ROOT, 'tests', 'e2e-report.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.passed} of ${report.total} checks passed${failed.length ? `; ${failed.length} failed` : ''}. Report: tests/e2e-report.json`);
ws.close();
shutdown();
await sleep(500);
for (const dir of [profileDir, downloads]) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // the browser may still hold a file for a moment; the temp folder is cleaned up by the OS
  }
}
process.exit(failed.length ? 1 : 0);
