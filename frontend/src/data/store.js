// All reads and writes go through here. Data is saved on this device (the browser's
// localStorage): no account, no login, no server, and it works offline. Settings → Your data
// can download a backup file and restore it on another device.

const KEY = 'fincopilot.data.v2';
const VERSION = 2;

const uid = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const freshProfile = () => ({
  id: 'me',
  fullName: '',
  monthlyIncome: 0,
  salaryDay: 1,
  bufferEnabled: true,
  bufferAmount: 2000,
  balanceAmount: null,
  balanceDate: null,
  theme: 'purple',
  textSize: 'normal',
  onboarded: false,
});

const empty = () => ({ version: VERSION, profile: freshProfile(), transactions: [], emis: [], statements: [] });

const read = () => {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed, profile: { ...freshProfile(), ...parsed.profile } };
  } catch {
    return empty();
  }
};

let db = read();

const write = () => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(db));
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('This device is out of space for FinCopilot data. Download a backup, then delete old statements in Settings.');
    }
    throw new Error('Could not save on this device. Check that the browser is not in private mode.');
  }
};

// Every write is all-or-nothing: if saving fails, the in-memory data goes back to how it was.
const transaction = (change) => {
  const before = JSON.stringify(db);
  try {
    const result = change();
    write();
    return result;
  } catch (err) {
    db = JSON.parse(before);
    throw err;
  }
};

const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
const clone = (x) => JSON.parse(JSON.stringify(x));

const cleanTx = (t) => {
  const amount = Math.round(Number(t.amount) * 100) / 100;
  check(amount > 0 && amount <= 1e9, 'Enter an amount above ₹0.');
  check(t.type === 'debit' || t.type === 'credit', 'Choose money in or money out.');
  const description = String(t.description || '').trim().slice(0, 200);
  check(description.length > 0, 'Add a description.');
  check(!Number.isNaN(new Date(t.date).getTime()), 'Enter a valid date.');
  return {
    date: new Date(t.date).toISOString(),
    description,
    amount,
    type: t.type,
    category: String(t.category || 'Other').slice(0, 40),
    note: t.note ? String(t.note).slice(0, 200) : '',
    source: ['manual', 'statement', 'autopay'].includes(t.source) ? t.source : 'manual',
    statementId: t.statementId || null,
    emiId: t.emiId || null,
  };
};

const EMI_FIELDS = ['name', 'lender', 'amount', 'dueDay', 'totalMonths', 'remainingMonths', 'principal', 'interestRate', 'autopay', 'paidThroughDate', 'lastPaidDate'];
const pickEmi = (e) => Object.fromEntries(Object.entries(e).filter(([k]) => EMI_FIELDS.includes(k)));
const checkEmi = (e) => {
  check(String(e.name || '').trim().length > 0, 'Give the loan a name.');
  check(Number(e.amount) > 0, 'Enter the monthly EMI amount.');
  check(Number(e.dueDay) >= 1 && Number(e.dueDay) <= 31, 'Due day must be between 1 and 31.');
};

// ---------- reads ----------

export const loadEverything = async () => {
  db = read();
  return clone({
    profile: db.profile,
    transactions: [...db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
    emis: db.emis,
    statements: db.statements,
  });
};

// ---------- writes ----------

const PROFILE_FIELDS = Object.keys(freshProfile()).filter((k) => k !== 'id');

export const updateProfile = async (patch) =>
  transaction(() => {
    for (const [k, v] of Object.entries(patch)) if (PROFILE_FIELDS.includes(k)) db.profile[k] = v;
    return clone(db.profile);
  });

export const addTransactions = async (list) =>
  transaction(() => {
    const saved = list.map((t) => ({ ...cleanTx(t), id: uid() }));
    db.transactions.push(...saved);
    return clone(saved);
  });

export const updateTransaction = async (id, patch) =>
  transaction(() => {
    const t = db.transactions.find((x) => x.id === id);
    check(t, 'That transaction no longer exists.');
    Object.assign(t, cleanTx({ ...t, ...patch }));
    return clone(t);
  });

export const deleteTransaction = async (id) =>
  transaction(() => {
    db.transactions = db.transactions.filter((t) => t.id !== id);
  });

export const addEmi = async (emi) =>
  transaction(() => {
    checkEmi(emi);
    const saved = {
      lender: '',
      autopay: false,
      paidThroughDate: null,
      lastPaidDate: null,
      totalMonths: null,
      principal: null,
      interestRate: null,
      remainingMonths: 12,
      ...pickEmi(emi),
      name: String(emi.name).trim().slice(0, 60),
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    db.emis.push(saved);
    return clone(saved);
  });

export const updateEmi = async (id, patch) =>
  transaction(() => {
    const e = db.emis.find((x) => x.id === id);
    check(e, 'That EMI no longer exists.');
    Object.assign(e, pickEmi(patch));
    checkEmi(e);
    return clone(e);
  });

export const deleteEmi = async (id) =>
  transaction(() => {
    db.emis = db.emis.filter((e) => e.id !== id);
  });

// The statement file itself is read on the device and not kept; its transactions are saved.
export const saveStatement = async ({ file, sourceApp, period, transactions }) =>
  transaction(() => {
    const statement = {
      id: uid(),
      fileName: String(file.name).slice(0, 200),
      sourceApp,
      periodStart: period.start,
      periodEnd: period.end,
      txCount: transactions.length,
      createdAt: new Date().toISOString(),
    };
    const saved = transactions.map((t) => ({ ...cleanTx({ ...t, source: 'statement', statementId: statement.id }), id: uid() }));
    db.statements.unshift(statement);
    db.transactions.push(...saved);
    return { statement: clone(statement), transactions: clone(saved) };
  });

export const deleteStatement = async (statement, { withTransactions }) =>
  transaction(() => {
    if (withTransactions) db.transactions = db.transactions.filter((t) => t.statementId !== statement.id);
    else db.transactions.forEach((t) => {
      if (t.statementId === statement.id) t.statementId = null;
    });
    db.statements = db.statements.filter((s) => s.id !== statement.id);
  });

// ---------- backup ----------

export const exportBackup = () =>
  JSON.stringify({ app: 'FinCopilot', exportedAt: new Date().toISOString(), ...db }, null, 2);

export const importBackup = async (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a FinCopilot backup file.');
  }
  check(data && data.app === 'FinCopilot' && data.profile && Array.isArray(data.transactions), 'This is not a FinCopilot backup file.');
  const next = {
    version: VERSION,
    profile: { ...freshProfile(), ...data.profile },
    transactions: data.transactions.map((t) => ({ ...cleanTx(t), id: t.id || uid() })),
    emis: (data.emis || []).map((e) => ({ ...e, id: e.id || uid() })),
    statements: data.statements || [],
  };
  const before = db;
  db = next;
  try {
    write();
  } catch (err) {
    db = before;
    throw err;
  }
  return { transactions: next.transactions.length, emis: next.emis.length };
};

export const deleteAllData = async () => {
  db = empty();
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // nothing to remove
  }
};
