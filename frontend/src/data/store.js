// All reads and writes go through here. Data lives in Supabase (Postgres + Storage) and every
// table is protected by row-level security, so a user can only reach their own rows and files.

import { supabase } from '../lib/supabase';

const fail = (error, fallback) => {
  if (!error) return;
  const msg = String(error.message || '');
  if (/fetch|network|failed to fetch/i.test(msg)) throw new Error('No internet connection. Check your connection and try again.');
  throw new Error(msg || fallback);
};

// ---------- mapping between database columns and app fields ----------

const profileIn = (r) => ({
  id: r.id,
  fullName: r.full_name,
  monthlyIncome: Number(r.monthly_income),
  salaryDay: r.salary_day,
  bufferEnabled: r.buffer_enabled,
  bufferAmount: Number(r.buffer_amount),
  balanceAmount: r.balance_amount === null ? null : Number(r.balance_amount),
  balanceDate: r.balance_date,
  theme: r.theme,
  textSize: r.text_size,
  onboarded: r.onboarded,
});
const PROFILE_COLS = {
  fullName: 'full_name',
  monthlyIncome: 'monthly_income',
  salaryDay: 'salary_day',
  bufferEnabled: 'buffer_enabled',
  bufferAmount: 'buffer_amount',
  balanceAmount: 'balance_amount',
  balanceDate: 'balance_date',
  theme: 'theme',
  textSize: 'text_size',
  onboarded: 'onboarded',
};

const txIn = (r) => ({
  id: r.id,
  date: r.date,
  description: r.description,
  amount: Number(r.amount),
  type: r.type,
  category: r.category,
  note: r.note || '',
  source: r.source,
  statementId: r.statement_id,
  emiId: r.emi_id,
});
const txOut = (t) => ({
  date: t.date,
  description: String(t.description || 'Transaction').slice(0, 200),
  amount: Math.round(Number(t.amount) * 100) / 100,
  type: t.type,
  category: t.category,
  note: t.note ? String(t.note).slice(0, 200) : null,
  source: t.source || 'manual',
  statement_id: t.statementId || null,
  emi_id: t.emiId || null,
});

const emiIn = (r) => ({
  id: r.id,
  name: r.name,
  lender: r.lender,
  amount: Number(r.amount),
  dueDay: r.due_day,
  totalMonths: r.total_months,
  remainingMonths: r.remaining_months,
  principal: r.principal === null ? null : Number(r.principal),
  interestRate: r.interest_rate === null ? null : Number(r.interest_rate),
  autopay: r.autopay,
  paidThroughDate: r.paid_through_date,
  lastPaidDate: r.last_paid_date,
  createdAt: r.created_at,
});
const EMI_COLS = {
  name: 'name',
  lender: 'lender',
  amount: 'amount',
  dueDay: 'due_day',
  totalMonths: 'total_months',
  remainingMonths: 'remaining_months',
  principal: 'principal',
  interestRate: 'interest_rate',
  autopay: 'autopay',
  paidThroughDate: 'paid_through_date',
  lastPaidDate: 'last_paid_date',
};
const pick = (obj, map) => Object.fromEntries(Object.entries(obj).filter(([k]) => k in map).map(([k, v]) => [map[k], v]));

const statementIn = (r) => ({
  id: r.id,
  fileName: r.file_name,
  filePath: r.file_path,
  sourceApp: r.source_app,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  txCount: r.tx_count,
  createdAt: r.created_at,
});

// ---------- auth ----------

export const auth = {
  async session() {
    const { data, error } = await supabase.auth.getSession();
    fail(error, 'Could not check your sign-in.');
    return data.session;
  },
  onChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    fail(error, 'Could not create your account.');
    return data;
  },
  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && /invalid login/i.test(error.message)) throw new Error('Wrong email or password.');
    if (error && /not confirmed/i.test(error.message)) throw new Error('Please confirm your email first. Check your inbox for the link.');
    fail(error, 'Could not sign in.');
    return data;
  },
  async sendReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#reset` });
    fail(error, 'Could not send the reset email.');
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    fail(error, 'Could not change the password.');
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};

// ---------- loading ----------

const loadAllRows = async (table, order) => {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order(order.column, { ascending: order.ascending }).range(from, from + PAGE - 1);
    fail(error, `Could not load ${table}.`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
};

export const loadEverything = async (userId) => {
  const [profileRes, txs, emis, statements] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    loadAllRows('transactions', { column: 'date', ascending: false }),
    loadAllRows('emis', { column: 'created_at', ascending: true }),
    loadAllRows('statements', { column: 'created_at', ascending: false }),
  ]);
  fail(profileRes.error, 'Could not load your profile.');
  if (!profileRes.data) throw new Error('Your profile was not found. Sign out and sign in again.');
  return {
    profile: profileIn(profileRes.data),
    transactions: txs.map(txIn),
    emis: emis.map(emiIn),
    statements: statements.map(statementIn),
  };
};

// ---------- writes ----------

export const updateProfile = async (userId, patch) => {
  const { data, error } = await supabase.from('profiles').update(pick(patch, PROFILE_COLS)).eq('id', userId).select().single();
  fail(error, 'Could not save your settings.');
  return profileIn(data);
};

export const addTransactions = async (list) => {
  const saved = [];
  for (let i = 0; i < list.length; i += 500) {
    const { data, error } = await supabase.from('transactions').insert(list.slice(i, i + 500).map(txOut)).select();
    fail(error, 'Could not save the transactions.');
    saved.push(...data.map(txIn));
  }
  return saved;
};

export const updateTransaction = async (id, patch) => {
  const { data, error } = await supabase.from('transactions').update(txOut(patch)).eq('id', id).select().single();
  fail(error, 'Could not update the transaction.');
  return txIn(data);
};

export const deleteTransaction = async (id) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  fail(error, 'Could not delete the transaction.');
};

export const addEmi = async (emi) => {
  const { data, error } = await supabase.from('emis').insert(pick(emi, EMI_COLS)).select().single();
  fail(error, 'Could not save the EMI.');
  return emiIn(data);
};

export const updateEmi = async (id, patch) => {
  const { data, error } = await supabase.from('emis').update(pick(patch, EMI_COLS)).eq('id', id).select().single();
  fail(error, 'Could not update the EMI.');
  return emiIn(data);
};

export const deleteEmi = async (id) => {
  const { error } = await supabase.from('emis').delete().eq('id', id);
  fail(error, 'Could not delete the EMI.');
};

// Saves one statement: the original file (private storage), its record, and its transactions.
export const saveStatement = async ({ userId, file, sourceApp, period, transactions }) => {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
  const path = `${userId}/${Date.now()}-${safe}`;
  const upload = await supabase.storage.from('statements').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
  const filePath = upload.error ? null : path; // the transactions matter most; keep going if only the file copy fails
  const { data, error } = await supabase
    .from('statements')
    .insert({ file_name: file.name.slice(0, 200), file_path: filePath, source_app: sourceApp, period_start: period.start, period_end: period.end, tx_count: transactions.length })
    .select()
    .single();
  if (error) {
    if (filePath) await supabase.storage.from('statements').remove([filePath]);
    fail(error, 'Could not save the statement.');
  }
  const statement = statementIn(data);
  try {
    const saved = await addTransactions(transactions.map((t) => ({ ...t, source: 'statement', statementId: statement.id })));
    return { statement, transactions: saved, fileSaved: Boolean(filePath) };
  } catch (err) {
    await supabase.from('statements').delete().eq('id', statement.id);
    if (filePath) await supabase.storage.from('statements').remove([filePath]);
    throw err;
  }
};

export const deleteStatement = async (statement, { withTransactions }) => {
  if (withTransactions) {
    const { error } = await supabase.from('transactions').delete().eq('statement_id', statement.id);
    fail(error, 'Could not delete the statement transactions.');
  }
  const { error } = await supabase.from('statements').delete().eq('id', statement.id);
  fail(error, 'Could not delete the statement.');
  if (statement.filePath) await supabase.storage.from('statements').remove([statement.filePath]);
};

export const downloadStatementFile = async (statement) => {
  const { data, error } = await supabase.storage.from('statements').createSignedUrl(statement.filePath, 60);
  fail(error, 'Could not open the file.');
  return data.signedUrl;
};

// Deletes the user's files, then the account itself (all rows go with it).
export const deleteAccount = async (userId) => {
  const { data: files } = await supabase.storage.from('statements').list(userId, { limit: 1000 });
  if (files?.length) await supabase.storage.from('statements').remove(files.map((f) => `${userId}/${f.name}`));
  const { error } = await supabase.rpc('delete_my_account');
  fail(error, 'Could not delete your account.');
  await supabase.auth.signOut();
};
