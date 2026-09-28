// In-browser copy of the FinCopilot API, used by the standalone demo build (`npm run build:demo`).
// It mirrors backend/src/controllers/*.js and reuses the backend's financial engine, categories
// and seed data, so safe-to-spend and risk figures match the real server exactly.
// State lives in memory and in this browser's localStorage; nothing is sent anywhere.

import { AxiosError } from 'axios';
import { analyzeFinancialState, enrichEmi, getDaysUntil } from '../../../backend/src/services/financialEngine.js';
import { autoCategorizeRecipient, CATEGORIES, CATEGORY_LIST } from '../../../backend/src/config/categories.js';
import { buildDemoSeed } from '../../../backend/src/services/seedData.js';

const STORAGE_KEY = 'fincopilot.browserDemo.v2';
const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCK_MINUTES = 5;
const MAX_UPI_AMOUNT = 100000;
const MAX_RECEIVE_AMOUNT = 1000000;
// The demo build must not show real bank names.
const DEMO_BANK_NAMES = { account_siddhartha: 'Demo Bank', account_rahul: 'Sample Bank' };

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const newId = () => (globalThis.crypto?.randomUUID?.() || `${Math.random()}${Date.now()}`).replace(/[^a-z0-9]/gi, '').slice(0, 20);
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const nowIso = () => new Date().toISOString();
const digitsOf = (value) => String(value || '').replace(/[^0-9]/g, '').slice(-10);
const parseAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
};

const freshState = () => {
  const seed = buildDemoSeed();
  const stamp = nowIso();
  const withIds = (doc) => ({ ...doc, _id: doc._id || doc.id || newId(), id: doc.id || doc._id || newId(), createdAt: stamp, updatedAt: stamp });
  return {
    users: seed.users.map(withIds),
    accounts: seed.accounts.map((a) => withIds({ ...a, bankName: DEMO_BANK_NAMES[a.id] || 'Demo Bank' })),
    transactions: seed.users.flatMap((u, i) =>
      seed.transactions[u.id].map((t) => {
        const id = newId();
        return { ...t, _id: id, id, userId: u.id, accountId: seed.accounts[i].id, createdAt: stamp, updatedAt: stamp };
      })
    ),
    emis: seed.emis.map(withIds),
  };
};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage may be blocked; fall back to an in-memory dataset.
  }
  return null;
};

let db = load() || freshState();

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Keep working in memory.
  }
};

const findUser = (id) => db.users.find((u) => u.id === id) || null;
const activeUser = (id) => (id && findUser(id)) || db.users[0];
const accountOf = (userId) => db.accounts.find((a) => a.userId === userId) || null;
const userTransactions = (userId) =>
  db.transactions.filter((t) => t.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));

const addTransaction = (tx) => {
  const id = newId();
  const record = { ...tx, _id: id, id, date: tx.date || nowIso(), createdAt: nowIso(), updatedAt: nowIso() };
  db.transactions.unshift(record);
  return record;
};

const adjustBalance = (account, { balanceDelta = 0, creditedDelta = 0, debitedDelta = 0, requireFunds = 0 }) => {
  const bank = account.bankBalance ?? account.currentBalance;
  if (requireFunds && (account.currentBalance < requireFunds || bank < requireFunds)) return null;
  account.currentBalance += balanceDelta;
  account.bankBalance = bank + balanceDelta;
  account.totalCredited = (account.totalCredited || 0) + creditedDelta;
  account.totalDebited = (account.totalDebited || 0) + debitedDelta;
  account.updatedAt = nowIso();
  return account;
};

// Same wording as dataService.fundsError on the server.
const fundsError = (account, amount) =>
  account.currentBalance >= amount
    ? new ApiError(400, 'Your bank says there is not enough money in your account. Check your bank balance: money may have been spent outside this app.')
    : new ApiError(400, `Not enough balance. You have ₹${account.currentBalance.toLocaleString('en-IN')}.`);

const assertUpiPin = (user, enteredPin, wrongPinMessage) => {
  const now = Date.now();
  const lockedUntil = user.pinLockedUntil ? new Date(user.pinLockedUntil).getTime() : 0;
  if (lockedUntil > now) {
    const minutes = Math.ceil((lockedUntil - now) / 60000);
    throw new ApiError(423, `UPI PIN is locked after ${MAX_PIN_ATTEMPTS} wrong attempts. Try again in ${minutes} min.`);
  }
  const pin = String(enteredPin ?? '').trim();
  if (!/^\d{4}$/.test(pin)) throw new ApiError(400, 'Enter your 4-digit UPI PIN.');
  if (!user.upiPin) throw new ApiError(403, 'No UPI PIN is set for this account.');
  if (pin !== String(user.upiPin)) {
    const attempts = (user.pinFailedAttempts || 0) + 1;
    if (attempts >= MAX_PIN_ATTEMPTS) {
      user.pinFailedAttempts = 0;
      user.pinLockedUntil = new Date(now + PIN_LOCK_MINUTES * 60000).toISOString();
      save();
      throw new ApiError(423, `Too many wrong attempts. UPI PIN locked for ${PIN_LOCK_MINUTES} minutes.`);
    }
    user.pinFailedAttempts = attempts;
    save();
    const left = MAX_PIN_ATTEMPTS - attempts;
    throw new ApiError(400, `${wrongPinMessage} ${left} attempt${left === 1 ? '' : 's'} left.`);
  }
  user.pinFailedAttempts = 0;
  user.pinLockedUntil = null;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  fullName: user.fullName || user.name,
  mobile: user.mobile,
  phoneOnly: user.phoneOnly,
  upiId: user.upiId,
  monthlyIncome: user.monthlyIncome || 50000,
  salaryDate: user.salaryDate || 1,
  currency: '₹',
});

// ---------- Route handlers (same shapes as the Express controllers) ----------

const routes = {
  'GET /health': () => ({ status: 'online', service: 'FinCopilot in-browser demo', timestamp: nowIso() }),

  'GET /account/all': () => ({
    success: true,
    hasAccount: true,
    data: db.users.map((u) => {
      const acc = accountOf(u.id);
      return {
        ...publicUser(u),
        currentBalance: acc.currentBalance,
        verifiedBalance: acc.verifiedBalance ?? acc.currentBalance,
        lastBalanceCheckDate: acc.lastBalanceCheckDate,
        bankName: acc.bankName,
      };
    }),
  }),

  'GET /account/dashboard': ({ query }) => {
    const user = activeUser(query.userId);
    const account = accountOf(user.id);
    const transactions = userTransactions(user.id).slice(0, 100);
    const emis = db.emis.filter((e) => e.userId === user.id);
    const a = analyzeFinancialState({ user, account, transactions, emis });
    return {
      success: true,
      hasAccount: true,
      data: {
        user: publicUser(user),
        account: {
          id: account.id,
          bankName: account.bankName,
          accountNumberMasked: account.accountNumberMasked,
          currentBalance: a.currentBalance,
          verifiedBalance: a.verifiedBalance,
          lastBalanceCheckDate: a.lastBalanceCheckDate,
          startingBalance: account.startingBalance,
          totalCredited: account.totalCredited || 0,
          totalDebited: account.totalDebited || 0,
          currency: '₹',
        },
        metrics: {
          currentBalance: a.currentBalance,
          estimatedCurrentBalance: a.estimatedCurrentBalance,
          verifiedBalance: a.verifiedBalance,
          lastBalanceCheckDate: a.lastBalanceCheckDate,
          creditsSinceCheck: a.creditsSinceCheck,
          debitsSinceCheck: a.debitsSinceCheck,
          safeToSpend: a.safeToSpend,
          totalUpcomingEMI: a.totalUpcomingEMI,
          nextEMI: a.nextEMI,
          riskStatus: a.riskStatus,
          overdueCount: a.overdueCount,
          dailyBurnRate: a.dailyBurnRate,
          discretionarySpend: a.discretionarySpend,
          oneOffThreshold: a.oneOffThreshold,
          expectedNormalExpenses: a.expectedNormalExpenses,
          safetyReserve: a.safetyReserve,
          riskReason: a.riskReason,
          projectedShortfall: a.projectedShortfall,
        },
        aiPrediction: {
          status: a.riskStatus,
          summary: a.summary,
          advice: a.advice,
          recommendation: a.advice,
          riskReason: a.riskReason,
          safeToSpend: a.safeToSpend,
          daysUntilEMI: a.nextEMI ? (a.nextEMI.daysRemaining ?? 10) : 10,
          nextEMI: a.nextEMI,
        },
        emis: a.enrichedEmis,
        categoryBreakdown: a.categoryBreakdown,
        recentTransactions: transactions.slice(0, 10),
        projected7Days: a.projected7Days,
        forecastHorizons: a.forecastHorizons,
        timelineEvents: a.timelineEvents,
        salaryCycle: a.salaryCycle,
      },
    };
  },

  'POST /account/check-balance': ({ body }) => {
    const user = findUser(body.userId);
    if (!user) throw new ApiError(404, 'User account not found.');
    assertUpiPin(user, body.upiPin, 'Incorrect UPI PIN.');
    const account = accountOf(user.id);
    const appBalance = account.currentBalance;
    const bank = account.bankBalance ?? appBalance;
    const difference = Math.round((bank - appBalance) * 100) / 100;
    const stamp = nowIso();
    if (difference !== 0) {
      addTransaction({
        accountId: account.id,
        userId: user.id,
        title: difference > 0 ? 'Bank balance update (money added outside this app)' : 'Bank balance update (money spent outside this app)',
        merchant: account.bankName || 'Your bank',
        category: CATEGORIES.BANK_UPDATE,
        type: difference > 0 ? 'credit' : 'debit',
        amount: Math.abs(difference),
        description: 'Found when you checked your bank balance',
        status: 'completed',
        paymentMethod: 'Direct Bank Transfer',
        date: stamp,
      });
    }
    Object.assign(account, { currentBalance: bank, bankBalance: bank, verifiedBalance: bank, lastBalanceCheckDate: stamp });
    save();
    return {
      success: true,
      message: 'Bank balance verified successfully.',
      data: {
        success: true,
        verifiedBalance: bank,
        currentBalance: bank,
        previousAppBalance: appBalance,
        difference,
        lastBalanceCheckDate: account.lastBalanceCheckDate,
        bankName: account.bankName,
        accountNumberMasked: account.accountNumberMasked,
      },
    };
  },

  'POST /account/verify-pin': ({ body }) => {
    const user = findUser(body.userId);
    if (!user) throw new ApiError(404, 'User account not found.');
    assertUpiPin(user, body.upiPin, 'Current UPI PIN is incorrect.');
    save();
    return { success: true, message: 'UPI PIN verified.' };
  },

  'POST /account/update-pin': ({ body }) => {
    const user = findUser(body.userId);
    if (!user) throw new ApiError(404, 'User account not found.');
    assertUpiPin(user, body.oldPin, 'Current UPI PIN is incorrect.');
    const next = String(body.newPin ?? '').trim();
    if (!/^\d{4}$/.test(next)) throw new ApiError(400, 'New UPI PIN must be exactly 4 digits.');
    if (next === String(user.upiPin)) throw new ApiError(400, 'Choose a new UPI PIN that is different from the current one.');
    user.upiPin = next;
    save();
    return { success: true, message: 'UPI PIN updated successfully.' };
  },

  'POST /account/reset': () => {
    db = freshState();
    save();
    return { success: true, message: 'Demo dataset reset successfully for both Siddhartha and Rahul accounts.' };
  },

  'GET /transactions': ({ query }) => {
    const user = activeUser(query.userId);
    const limit = Math.min(500, Math.max(1, Number.parseInt(query.limit, 10) || 100));
    const search = String(query.search || '').toLowerCase();
    const data = userTransactions(user.id)
      .filter((t) => !query.category || query.category === 'all' || t.category === query.category)
      .filter((t) => !query.type || query.type === 'all' || t.type === query.type)
      .filter((t) => !search || [t.title, t.merchant, t.category].some((v) => String(v || '').toLowerCase().includes(search)))
      .slice(0, limit);
    return { success: true, count: data.length, data };
  },

  'POST /transactions/payment': ({ body }) => {
    const amt = parseAmount(body.amount);
    if (amt === null) throw new ApiError(400, 'Enter an amount greater than ₹0.');
    if (amt > MAX_UPI_AMOUNT) throw new ApiError(400, `UPI payments are limited to ₹${MAX_UPI_AMOUNT.toLocaleString('en-IN')} per transaction.`);

    let phone = '';
    if (typeof body.recipientPhone === 'string' && body.recipientPhone.trim()) {
      phone = body.recipientPhone.replace(/[^0-9]/g, '');
      if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
      if (phone.length !== 10) throw new ApiError(400, 'Invalid mobile number. Please enter exactly 10 digits for Indian mobile numbers.');
    }
    const upi = cleanText(body.recipientUpi, 60);
    const name = cleanText(body.recipientName, 60);
    if (!upi && !phone && !name) throw new ApiError(400, 'Select a recipient or enter a 10-digit mobile number or UPI ID.');
    const finalRecipient = name || upi || `+91 ${phone}`;

    const sender = activeUser(body.senderId || body.userId);
    const senderAccount = accountOf(sender.id);
    assertUpiPin(sender, body.upiPin, 'Incorrect UPI PIN. Payment not processed.');

    const recipient = db.users.find((u) => {
      if (u.id === sender.id) return false;
      if (phone && digitsOf(u.phoneOnly || u.mobile) === digitsOf(phone)) return true;
      if (upi && u.upiId && upi.toLowerCase() === u.upiId.toLowerCase()) return true;
      return Boolean(name) && [u.name, u.fullName].filter(Boolean).map((n) => n.toLowerCase()).includes(name.toLowerCase());
    });

    if (!adjustBalance(senderAccount, { balanceDelta: -amt, debitedDelta: amt, requireFunds: amt })) {
      throw fundsError(senderAccount, amt);
    }

    const display = recipient ? recipient.name : finalRecipient;
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 120) : '';
    const date = nowIso();
    const senderTx = addTransaction({
      accountId: senderAccount.id,
      userId: sender.id,
      title: `Paid to ${display}`,
      merchant: display,
      category: autoCategorizeRecipient(display),
      type: 'debit',
      amount: amt,
      description: note || 'Paid via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
      date,
    });

    let recipientBalance = null;
    if (recipient) {
      const recipientAccount = accountOf(recipient.id);
      adjustBalance(recipientAccount, { balanceDelta: amt, creditedDelta: amt });
      recipientBalance = recipientAccount.currentBalance;
      addTransaction({
        accountId: recipientAccount.id,
        userId: recipient.id,
        title: `Received from ${sender.name}`,
        merchant: sender.name,
        category: CATEGORIES.OTHER,
        type: 'credit',
        amount: amt,
        description: note || 'Received via UPI',
        status: 'completed',
        paymentMethod: 'UPI',
        date,
      });
    }
    save();
    return {
      httpStatus: 201,
      success: true,
      message: `Payment Successful! ₹${amt.toLocaleString('en-IN')} sent to ${finalRecipient}.`,
      data: {
        transaction: senderTx,
        newBalance: senderAccount.currentBalance,
        recipientUser: recipient ? recipient.name : null,
        recipientBalance,
      },
    };
  },

  'POST /transactions/receive': ({ body }) => {
    const user = activeUser(body.userId);
    const account = accountOf(user.id);
    const amt = parseAmount(body.amount);
    if (amt === null) throw new ApiError(400, 'Enter an amount greater than ₹0.');
    if (amt > MAX_RECEIVE_AMOUNT) throw new ApiError(400, 'Amount is too large for a single credit.');
    const sender = cleanText(body.senderName, 60) || 'Sender';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 120) : '';
    const tx = addTransaction({
      accountId: account.id,
      userId: user.id,
      title: `Received from ${sender}`,
      merchant: sender,
      category: CATEGORY_LIST.includes(body.category) ? body.category : CATEGORIES.OTHER,
      type: 'credit',
      amount: amt,
      description: note || 'Received via UPI',
      status: 'completed',
      paymentMethod: 'UPI',
    });
    adjustBalance(account, { balanceDelta: amt, creditedDelta: amt });
    save();
    return {
      httpStatus: 201,
      success: true,
      message: `₹${amt.toLocaleString('en-IN')} received from ${sender}.`,
      data: { transaction: tx, newBalance: account.currentBalance },
    };
  },

  'PATCH /transactions/:id/category': ({ params, body }) => {
    if (!CATEGORY_LIST.includes(body.category)) throw new ApiError(400, 'Choose a valid category.');
    const tx = db.transactions.find((t) => t.id === params.id || t._id === params.id);
    if (!tx || !body.userId || tx.userId !== body.userId) throw new ApiError(404, 'Transaction not found.');
    tx.category = body.category;
    tx.updatedAt = nowIso();
    save();
    return { success: true, message: 'Transaction category updated successfully.', data: tx };
  },

  'GET /emi': ({ query }) => {
    const user = activeUser(query.userId);
    const data = db.emis.filter((e) => e.userId === user.id).map((e) => enrichEmi(e));
    return { success: true, count: data.length, data };
  },

  'POST /emi': ({ body }) => {
    const user = activeUser(body.userId);
    const account = accountOf(user.id);
    const name = cleanText(body.name, 60);
    if (!name) throw new ApiError(400, 'Enter a name for the EMI.');
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) throw new ApiError(400, 'Enter a valid EMI amount.');
    if (body.frequency !== undefined && body.frequency !== 'Monthly') throw new ApiError(400, 'Only monthly EMIs are supported.');
    const dueDay = Number(body.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new ApiError(400, 'Due day must be between 1 and 31.');
    const installments = Math.min(600, Math.max(1, Math.round(Number(body.remainingInstallments) || 12)));
    const id = newId();
    const emi = {
      _id: id,
      id,
      userId: user.id,
      accountId: account.id,
      name,
      lender: cleanText(body.lender, 60) || 'Finance Provider',
      amount: Math.round(amount * 100) / 100,
      dueDay,
      dueDate: new Date(Date.now() + getDaysUntil(dueDay) * 86400000).toISOString(),
      frequency: 'Monthly',
      totalLoanAmount: Number(body.totalLoanAmount) || amount * installments,
      remainingInstallments: installments,
      status: 'upcoming',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.emis.push(emi);
    save();
    return { httpStatus: 201, success: true, message: 'EMI obligation added successfully', data: enrichEmi(emi) };
  },

  'POST /emi/:id/pay': ({ params, body }) => {
    const user = activeUser(body.userId);
    const account = accountOf(user.id);
    const stored = db.emis.find((e) => e.userId === user.id && (e.id === params.id || e._id === params.id));
    if (!stored) throw new ApiError(404, 'EMI record not found.');
    const emi = enrichEmi(stored);
    if (emi.status === 'paid_this_cycle') throw new ApiError(400, 'This EMI is already paid for this month.');
    if (emi.status === 'closed') throw new ApiError(400, 'This loan is already closed.');
    assertUpiPin(user, body.upiPin, 'Incorrect UPI PIN. EMI not paid.');
    const amount = Number(emi.amount);
    if (!adjustBalance(account, { balanceDelta: -amount, debitedDelta: amount, requireFunds: amount })) {
      throw fundsError(account, amount);
    }
    const tx = addTransaction({
      accountId: account.id,
      userId: user.id,
      title: `EMI Payment - ${emi.name}`,
      merchant: emi.lender,
      category: CATEGORIES.EMI,
      type: 'debit',
      amount,
      description: 'Paid via UPI Auto-Debit',
      status: 'completed',
      paymentMethod: 'UPI',
    });
    const remaining = Math.max(0, (Number(emi.remainingInstallments) || 12) - 1);
    Object.assign(stored, { status: 'paid_this_cycle', remainingInstallments: remaining, lastPaidDate: nowIso(), paidThroughDate: emi.coversDueDate, updatedAt: nowIso() });
    save();
    return {
      success: true,
      message: `Successfully paid EMI of ₹${amount.toLocaleString('en-IN')} to ${emi.lender}.`,
      data: { transaction: tx, newBalance: account.currentBalance, remainingInstallments: remaining },
    };
  },

  'DELETE /emi/:id': ({ params, query }) => {
    const user = activeUser(query.userId);
    const index = db.emis.findIndex((e) => e.userId === user.id && (e.id === params.id || e._id === params.id));
    if (index === -1) throw new ApiError(404, 'EMI record not found.');
    db.emis.splice(index, 1);
    save();
    return { success: true, message: 'EMI obligation removed.' };
  },
};

// Finds the handler for "METHOD /path", filling :params.
const match = (method, path) => {
  const parts = path.split('/').filter(Boolean);
  for (const [key, handler] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const pp = pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params = {};
    if (pp.every((p, i) => (p.startsWith(':') ? ((params[p.slice(1)] = decodeURIComponent(parts[i])), true) : p === parts[i]))) {
      return { handler, params };
    }
  }
  return null;
};

// Framework-free entry point: used by the axios adapter and by tests.
export const handleRequest = (method, path, query = {}, body = {}) => {
  const found = match(method.toUpperCase(), path);
  if (!found) return { status: 404, data: { success: false, message: `Route ${path} not found` } };
  try {
    const { httpStatus: status = 200, ...data } = found.handler({ params: found.params, query, body: body || {} });
    return { status, data };
  } catch (err) {
    if (err instanceof ApiError) return { status: err.status, data: { success: false, message: err.message } };
    return { status: 500, data: { success: false, message: err.message } };
  }
};

// axios adapter: answers requests locally with a short delay so loading states still show.
export const browserAdapter = async (config) => {
  const url = new URL(config.url, 'http://demo.local');
  const query = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) };
  Object.keys(query).forEach((k) => query[k] === undefined && delete query[k]);
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : config.data || {};

  await new Promise((resolve) => setTimeout(resolve, 150));
  const { status, data } = handleRequest(config.method || 'get', url.pathname, query, body);
  const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
  if (status >= 400) {
    throw new AxiosError(data.message, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, null, response);
  }
  return response;
};
