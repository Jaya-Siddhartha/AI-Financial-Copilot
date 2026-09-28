// Developer-only stand-in for store.js, used by `npm run dev:mock` and the UI tests. It keeps
// data in memory (and sessionStorage) with the same functions and rules as the Supabase store,
// so every screen can be exercised without a real account. Never included in production builds:
// vite.config.js swaps it in only in "mock" mode.

const KEY = 'fincopilot.mock';
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const delay = () => new Promise((r) => setTimeout(r, 60));

const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};
let db = load() || { session: null, users: {} };
const save = () => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
};
const listeners = new Set();
const emit = (event) => listeners.forEach((fn) => fn(event, db.session));
const me = () => db.users[db.session?.user?.id];

const check = (cond, message) => {
  if (!cond) throw new Error(message);
};

export const auth = {
  async session() {
    return db.session;
  },
  onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  async signUp({ email, password, fullName }) {
    await delay();
    check(password.length >= 8, 'Password should be at least 8 characters.');
    check(!Object.values(db.users).some((u) => u.email === email), 'User already registered');
    const id = uid();
    db.users[id] = {
      email,
      password,
      profile: { id, fullName, monthlyIncome: 0, salaryDay: 1, bufferEnabled: true, bufferAmount: 2000, balanceAmount: null, balanceDate: null, theme: 'purple', textSize: 'normal', onboarded: false },
      transactions: [],
      emis: [],
      statements: [],
    };
    db.session = { user: { id, email } };
    save();
    emit('SIGNED_IN');
    return { session: db.session };
  },
  async signIn({ email, password }) {
    await delay();
    const entry = Object.entries(db.users).find(([, u]) => u.email === email && u.password === password);
    check(entry, 'Wrong email or password.');
    db.session = { user: { id: entry[0], email } };
    save();
    emit('SIGNED_IN');
    return { session: db.session };
  },
  async sendReset() {
    await delay();
  },
  async updatePassword(password) {
    check(password.length >= 8, 'Password should be at least 8 characters.');
    me().password = password;
    save();
  },
  async signOut() {
    db.session = null;
    save();
    emit('SIGNED_OUT');
  },
};

const clone = (x) => JSON.parse(JSON.stringify(x));

export const loadEverything = async () => {
  await delay();
  const u = me();
  check(u, 'Your profile was not found.');
  return clone({
    profile: u.profile,
    transactions: [...u.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
    emis: u.emis,
    statements: u.statements,
  });
};

export const updateProfile = async (userId, patch) => {
  await delay();
  Object.assign(me().profile, patch);
  save();
  return clone(me().profile);
};

const validTx = (t) => {
  check(Number(t.amount) > 0, 'amount must be positive');
  check(['debit', 'credit'].includes(t.type), 'bad type');
  check(String(t.description || '').length >= 1 && String(t.description).length <= 200, 'bad description');
};

export const addTransactions = async (list) => {
  await delay();
  const saved = list.map((t) => {
    validTx(t);
    return { note: '', source: 'manual', statementId: null, emiId: null, ...t, id: uid(), amount: Math.round(Number(t.amount) * 100) / 100 };
  });
  me().transactions.push(...saved);
  save();
  return clone(saved);
};

export const updateTransaction = async (id, patch) => {
  await delay();
  validTx(patch);
  const t = me().transactions.find((x) => x.id === id);
  check(t, 'Transaction not found');
  Object.assign(t, patch, { id });
  save();
  return clone(t);
};

export const deleteTransaction = async (id) => {
  await delay();
  me().transactions = me().transactions.filter((t) => t.id !== id);
  save();
};

export const addEmi = async (emi) => {
  await delay();
  check(Number(emi.amount) > 0, 'amount must be positive');
  check(emi.dueDay >= 1 && emi.dueDay <= 31, 'bad due day');
  const saved = { lender: '', autopay: false, paidThroughDate: null, lastPaidDate: null, totalMonths: null, principal: null, interestRate: null, remainingMonths: 12, ...emi, id: uid(), createdAt: new Date().toISOString() };
  me().emis.push(saved);
  save();
  return clone(saved);
};

export const updateEmi = async (id, patch) => {
  await delay();
  const e = me().emis.find((x) => x.id === id);
  check(e, 'EMI not found');
  const { id: _ignored, status, daysRemaining, daysOverdue, dueDate, coversDueDate, ...clean } = patch;
  Object.assign(e, clean);
  save();
  return clone(e);
};

export const deleteEmi = async (id) => {
  await delay();
  me().emis = me().emis.filter((e) => e.id !== id);
  save();
};

export const saveStatement = async ({ file, sourceApp, period, transactions }) => {
  await delay();
  const statement = { id: uid(), fileName: file.name, filePath: null, sourceApp, periodStart: period.start, periodEnd: period.end, txCount: transactions.length, createdAt: new Date().toISOString() };
  me().statements.unshift(statement);
  save();
  const saved = await addTransactions(transactions.map((t) => ({ ...t, source: 'statement', statementId: statement.id })));
  return { statement: clone(statement), transactions: saved, fileSaved: false };
};

export const deleteStatement = async (statement, { withTransactions }) => {
  await delay();
  const u = me();
  if (withTransactions) u.transactions = u.transactions.filter((t) => t.statementId !== statement.id);
  else u.transactions.forEach((t) => {
    if (t.statementId === statement.id) t.statementId = null;
  });
  u.statements = u.statements.filter((s) => s.id !== statement.id);
  save();
};

export const downloadStatementFile = async () => {
  throw new Error('Files are not kept in test mode.');
};

export const deleteAccount = async () => {
  delete db.users[db.session.user.id];
  await auth.signOut();
};
