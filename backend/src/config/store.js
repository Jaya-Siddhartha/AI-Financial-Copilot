import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.FINCOPILOT_DATA_DIR
  || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join('/tmp', 'fintech_data')
    : path.join(__dirname, '../../data'));
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[Store] Could not create DATA_DIR:', err.message);
}

export { DEMO_USERS } from '../services/seedData.js';

const defaultData = {
  users: [],
  accounts: [],
  transactions: [],
  emis: [],
};

const loadData = () => {
  let raw;
  try {
    if (!fs.existsSync(DATA_FILE)) return structuredClone(defaultData);
    raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.emis) parsed.emis = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.accounts) parsed.accounts = [];
    if (!parsed.transactions) parsed.transactions = [];
    return parsed;
  } catch (err) {
    // Keep the unreadable file for recovery instead of silently overwriting it on the next save.
    if (raw !== undefined) {
      const aside = `${DATA_FILE}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(DATA_FILE, aside);
        console.error(`[Store] db.json could not be parsed; moved it to ${aside}.`, err.message);
      } catch (moveErr) {
        console.error('[Store] db.json could not be parsed or moved aside:', moveErr.message);
      }
    } else {
      console.error('[Store] Error reading db.json:', err.message);
    }
  }
  return structuredClone(defaultData);
};

// Write to a temporary file and rename it over db.json, so a crash mid-write never leaves a
// half-written file behind.
const saveData = (data) => {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('[Store] Error writing db.json:', err);
  }
};

const generateId = () => randomUUID().replace(/-/g, '').slice(0, 20);

export const memoryStore = {
  // --- USERS ---
  async getAllUsers() {
    const data = loadData();
    return data.users;
  },

  async findUser(query = {}) {
    const data = loadData();
    if (Object.keys(query).length === 0) {
      return data.users[0] || null;
    }
    return (
      data.users.find((u) => {
        return Object.entries(query).every(([k, v]) => {
          if (k === '_id' || k === 'id') return String(u._id || u.id) === String(v);
          return u[k] === v;
        });
      }) || null
    );
  },

  async createUser(userDoc) {
    const data = loadData();
    const newId = userDoc.id || userDoc._id || generateId();
    const newUser = {
      _id: newId,
      id: newId,
      upiPin: userDoc.upiPin || '1234',
      ...userDoc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    saveData(data);
    return newUser;
  },

  async updateUser(userId, updateDoc) {
    const data = loadData();
    const index = data.users.findIndex((u) => String(u._id || u.id) === String(userId));
    if (index === -1) return null;
    data.users[index] = {
      ...data.users[index],
      ...updateDoc,
      updatedAt: new Date().toISOString(),
    };
    saveData(data);
    return data.users[index];
  },

  // --- ACCOUNTS ---
  async getAllAccounts() {
    const data = loadData();
    return data.accounts;
  },

  async findAccount(query = {}) {
    const data = loadData();
    return (
      data.accounts.find((a) => {
        return Object.entries(query).every(([k, v]) => {
          if (k === 'userId') return String(a.userId) === String(v);
          if (k === '_id' || k === 'id') return String(a._id || a.id) === String(v);
          return a[k] === v;
        });
      }) || null
    );
  },

  async createAccount(accountDoc) {
    const data = loadData();
    const newId = accountDoc.id || accountDoc._id || generateId();
    const newAccount = {
      _id: newId,
      id: newId,
      verifiedBalance: accountDoc.verifiedBalance !== undefined ? accountDoc.verifiedBalance : accountDoc.currentBalance,
      lastBalanceCheckDate: accountDoc.lastBalanceCheckDate || new Date().toISOString(),
      ...accountDoc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.accounts.push(newAccount);
    saveData(data);
    return newAccount;
  },

  async updateAccount(accountId, updateDoc) {
    const data = loadData();
    const index = data.accounts.findIndex((a) => String(a._id || a.id) === String(accountId));
    if (index === -1) return null;
    data.accounts[index] = {
      ...data.accounts[index],
      ...updateDoc,
      updatedAt: new Date().toISOString(),
    };
    saveData(data);
    return data.accounts[index];
  },

  // --- TRANSACTIONS ---
  async findTransactions(query = {}, sortOptions = { date: -1 }, limitCount = 100) {
    const data = loadData();
    let list = data.transactions.filter((tx) => {
      let match = true;
      if (query.userId && String(tx.userId) !== String(query.userId)) match = false;
      if (query.category && query.category !== 'all' && tx.category !== query.category) match = false;
      if (query.type && query.type !== 'all' && tx.type !== query.type) match = false;
      if (query.search) {
        const s = query.search.toLowerCase();
        const inTitle = (tx.title || '').toLowerCase().includes(s);
        const inMerchant = (tx.merchant || '').toLowerCase().includes(s);
        const inCategory = (tx.category || '').toLowerCase().includes(s);
        if (!inTitle && !inMerchant && !inCategory) match = false;
      }
      return match;
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (limitCount) {
      list = list.slice(0, limitCount);
    }
    return list;
  },

  async insertManyTransactions(items) {
    const data = loadData();
    const newItems = items.map((item) => {
      const newId = item.id || item._id || generateId();
      return {
      _id: newId,
      id: newId,
      ...item,
      date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      };
    });
    data.transactions.push(...newItems);
    saveData(data);
    return newItems;
  },

  async createTransaction(item) {
    const data = loadData();
    const newId = generateId();
    const newTx = {
      _id: newId,
      id: newId,
      ...item,
      date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.transactions.unshift(newTx);
    saveData(data);
    return newTx;
  },

  async findTransaction(txId) {
    const data = loadData();
    return data.transactions.find((tx) => String(tx._id || tx.id) === String(txId)) || null;
  },

  async updateTransactionCategory(txId, newCategory) {
    const data = loadData();
    const index = data.transactions.findIndex(
      (tx) => String(tx._id || tx.id) === String(txId)
    );
    if (index === -1) return null;
    data.transactions[index].category = newCategory;
    data.transactions[index].updatedAt = new Date().toISOString();
    saveData(data);
    return data.transactions[index];
  },

  async deleteTransactions(query = {}) {
    const data = loadData();
    if (Object.keys(query).length === 0) {
      data.transactions = [];
    } else if (query.userId) {
      data.transactions = data.transactions.filter(
        (tx) => String(tx.userId) !== String(query.userId)
      );
    }
    saveData(data);
    return { deletedCount: true };
  },

  // Read-modify-write of a balance in one synchronous step, so concurrent requests in the
  // same process cannot interleave. Returns null when requireFunds is set and funds are short.
  async adjustAccountBalance(accountId, { balanceDelta = 0, creditedDelta = 0, debitedDelta = 0, requireFunds = 0 }) {
    const data = loadData();
    const account = data.accounts.find((a) => String(a._id || a.id) === String(accountId));
    if (!account) return null;
    if (requireFunds && Number(account.currentBalance) < requireFunds) return null;
    account.currentBalance = Number(account.currentBalance) + balanceDelta;
    account.totalCredited = (Number(account.totalCredited) || 0) + creditedDelta;
    account.totalDebited = (Number(account.totalDebited) || 0) + debitedDelta;
    account.updatedAt = new Date().toISOString();
    saveData(data);
    return account;
  },

  // --- EMIS ---
  async findEMIs(query = {}) {
    const data = loadData();
    return data.emis.filter((e) => {
      let match = true;
      if (query.userId && String(e.userId) !== String(query.userId)) match = false;
      if (query.status && e.status !== query.status) match = false;
      return match;
    });
  },

  async createEMI(emiDoc) {
    const data = loadData();
    const newId = emiDoc.id || emiDoc._id || generateId();
    const newEmi = {
      _id: newId,
      id: newId,
      ...emiDoc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.emis.push(newEmi);
    saveData(data);
    return newEmi;
  },

  async updateEMI(emiId, updateDoc) {
    const data = loadData();
    const index = data.emis.findIndex((e) => String(e._id || e.id) === String(emiId));
    if (index === -1) return null;
    data.emis[index] = {
      ...data.emis[index],
      ...updateDoc,
      updatedAt: new Date().toISOString(),
    };
    saveData(data);
    return data.emis[index];
  },

  async deleteEMI(emiId) {
    const data = loadData();
    data.emis = data.emis.filter((e) => String(e._id || e.id) !== String(emiId));
    saveData(data);
    return true;
  },

  async resetAll() {
    saveData(structuredClone(defaultData));
    return true;
  },
};
