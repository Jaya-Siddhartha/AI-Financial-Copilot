import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join('/tmp', 'fintech_data')
  : path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[Store] Could not create DATA_DIR:', err.message);
}

export const DEMO_USERS = {
  SIDDHARTHA: {
    id: 'user_siddhartha',
    name: 'Siddhartha',
    fullName: 'Siddhartha Mukherjee',
    mobile: '+91 9876543210',
    phoneOnly: '9876543210',
    upiId: 'siddhartha@fin',
    upiPin: '1234',
    startingBalance: 50000,
    monthlyIncome: 50000,
    salaryDate: 1,
  },
  RAHUL: {
    id: 'user_rahul',
    name: 'Rahul Sharma',
    fullName: 'Rahul Sharma',
    mobile: '+91 9123456780',
    phoneOnly: '9123456780',
    upiId: 'rahul@fin',
    upiPin: '1234',
    startingBalance: 30000,
    monthlyIncome: 30000,
    salaryDate: 5,
  },
};

const defaultData = {
  users: [],
  accounts: [],
  transactions: [],
  emis: [],
};

const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.emis) parsed.emis = [];
      if (!parsed.users) parsed.users = [];
      if (!parsed.accounts) parsed.accounts = [];
      if (!parsed.transactions) parsed.transactions = [];
      return parsed;
    }
  } catch (err) {
    console.error('[Store] Error reading db.json, initializing fresh store:', err);
  }
  return { ...defaultData };
};

const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Error writing db.json:', err);
  }
};

const generateId = () => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

// Automatic Categorization Helper
export const autoCategorize = (recipientName = '') => {
  const name = recipientName.toLowerCase();

  if (name.includes('grocery') || name.includes('supermart') || name.includes('fresh') || name.includes('market') || name.includes('blinkit') || name.includes('zepto') || name.includes('instamart')) {
    return 'Groceries & Food';
  }
  if (
    name.includes('restaurant') ||
    name.includes('cafe') ||
    name.includes('bistro') ||
    name.includes('food') ||
    name.includes('zomato') ||
    name.includes('swiggy') ||
    name.includes('coffee') ||
    name.includes('starbucks') ||
    name.includes('dining') ||
    name.includes('dhaba')
  ) {
    return 'Food & Dining';
  }
  if (
    name.includes('power') ||
    name.includes('electric') ||
    name.includes('broadband') ||
    name.includes('water') ||
    name.includes('wifi') ||
    name.includes('utility') ||
    name.includes('bill') ||
    name.includes('bescom') ||
    name.includes('tneb') ||
    name.includes('tatapower')
  ) {
    return 'Utilities & Bills';
  }
  if (name.includes('recharge') || name.includes('jio') || name.includes('airtel') || name.includes('vi ') || name.includes('vodafone') || name.includes('bsnl')) {
    return 'Recharge';
  }
  if (name.includes('uber') || name.includes('ola') || name.includes('metro') || name.includes('cab') || name.includes('fuel') || name.includes('petrol') || name.includes('shell') || name.includes('auto') || name.includes('rapido')) {
    return 'Transport';
  }
  if (name.includes('amazon') || name.includes('flipkart') || name.includes('croma') || name.includes('myntra') || name.includes('store') || name.includes('electronics') || name.includes('shopping') || name.includes('mall')) {
    return 'Shopping';
  }
  if (name.includes('rent') || name.includes('landlord') || name.includes('housing') || name.includes('society') || name.includes('flat')) {
    return 'Housing';
  }
  if (name.includes('loan') || name.includes('emi') || name.includes('finance') || name.includes('bank installment') || name.includes('bajaj')) {
    return 'EMI';
  }
  if (name.includes('salary') || name.includes('payroll') || name.includes('bonus') || name.includes('freelance') || name.includes('consulting')) {
    return 'Salary';
  }

  // Default for person-to-person payments
  return 'Daily Expenses';
};

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
    const newUser = {
      _id: userDoc.id || userDoc._id || generateId(),
      id: userDoc.id || userDoc._id || generateId(),
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
    const newAccount = {
      _id: accountDoc.id || accountDoc._id || generateId(),
      id: accountDoc.id || accountDoc._id || generateId(),
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

  // --- BALANCE VERIFICATION VIA UPI PIN ---
  async verifyBankBalance(userId, enteredPin) {
    const data = loadData();
    const user = data.users.find((u) => String(u._id || u.id) === String(userId));
    if (!user) {
      throw new Error('User account not found.');
    }

    const expectedPin = user.upiPin || '1234';
    if (String(enteredPin).trim() !== String(expectedPin).trim()) {
      throw new Error('Incorrect UPI PIN. Please try again.');
    }

    const account = data.accounts.find((a) => String(a.userId) === String(userId));
    if (!account) {
      throw new Error('Bank account not found.');
    }

    const nowIso = new Date().toISOString();
    // Update verified balance and reset baseline
    account.verifiedBalance = account.currentBalance;
    account.lastBalanceCheckDate = nowIso;
    account.updatedAt = nowIso;

    saveData(data);

    return {
      success: true,
      verifiedBalance: account.verifiedBalance,
      currentBalance: account.currentBalance,
      lastBalanceCheckDate: nowIso,
      bankName: account.bankName || 'Simulated Bank (UPI)',
      accountNumberMasked: account.accountNumberMasked || '•••• 4092',
    };
  },

  // --- CHANGE UPI PIN ---
  async updateUpiPin(userId, oldPin, newPin) {
    const data = loadData();
    const user = data.users.find((u) => String(u._id || u.id) === String(userId));
    if (!user) {
      throw new Error('User account not found.');
    }

    const expectedPin = user.upiPin || '1234';
    if (String(oldPin).trim() !== String(expectedPin).trim()) {
      throw new Error('Current UPI PIN is incorrect.');
    }

    if (!newPin || String(newPin).trim().length !== 4 || isNaN(Number(newPin))) {
      throw new Error('New UPI PIN must be exactly 4 digits.');
    }

    user.upiPin = String(newPin).trim();
    user.updatedAt = new Date().toISOString();
    saveData(data);

    return {
      success: true,
      message: 'UPI PIN updated successfully.',
    };
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
    const newItems = items.map((item) => ({
      _id: item.id || generateId(),
      id: item.id || generateId(),
      ...item,
      date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    data.transactions.push(...newItems);
    saveData(data);
    return newItems;
  },

  async createTransaction(item) {
    const data = loadData();
    const newTx = {
      _id: generateId(),
      id: generateId(),
      ...item,
      date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.transactions.unshift(newTx);
    saveData(data);
    return newTx;
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

  // --- ATOMIC INTER-ACCOUNT TRANSFER WITH PIN VALIDATION ---
  async transferBetweenAccounts({ senderId, recipientName, recipientPhone = '', recipientUpi = '', amount, upiPin, paymentMethod = 'UPI' }) {
    const data = loadData();
    const amt = Number(amount);

    // 1. Find Sender User & Account
    const senderUser = data.users.find((u) => String(u._id || u.id) === String(senderId));
    const senderAccount = data.accounts.find((a) => String(a.userId) === String(senderId));

    if (!senderUser || !senderAccount) {
      throw new Error('Sender account not found.');
    }

    // 2. Validate UPI PIN if provided (or verify against user PIN)
    if (upiPin) {
      const expectedPin = senderUser.upiPin || '1234';
      if (String(upiPin).trim() !== String(expectedPin).trim()) {
        throw new Error('Incorrect UPI PIN. Payment not processed.');
      }
    }

    if (senderAccount.currentBalance < amt) {
      throw new Error(`Insufficient balance! Available balance is ₹${senderAccount.currentBalance.toLocaleString('en-IN')}.`);
    }

    // Deduct from sender
    senderAccount.currentBalance -= amt;
    senderAccount.totalDebited = (senderAccount.totalDebited || 0) + amt;

    // 3. Check if recipient is another simulated user in our system
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '').slice(-10);
    const cleanUpi = (recipientUpi || recipientName || '').toLowerCase().trim();

    const recipientUser = data.users.find((u) => {
      if (String(u._id || u.id) === String(senderId)) return false; // Not self
      const uPhone = (u.phoneOnly || u.mobile || '').replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone && uPhone && cleanPhone === uPhone) return true;
      if (u.upiId && cleanUpi && (cleanUpi === u.upiId.toLowerCase() || cleanUpi.includes(u.upiId.toLowerCase()))) return true;
      if (recipientName && u.name && recipientName.toLowerCase().includes(u.name.toLowerCase())) return true;
      return false;
    });

    const displayRecipient = recipientUser ? recipientUser.name : recipientName;
    const category = autoCategorize(displayRecipient);

    // Create Sender Debit Transaction
    const senderTx = {
      _id: generateId(),
      id: generateId(),
      accountId: senderAccount._id || senderAccount.id,
      userId: senderUser._id || senderUser.id,
      title: `Paid to ${displayRecipient}`,
      merchant: displayRecipient,
      category,
      type: 'debit',
      amount: amt,
      description: `Paid via ${paymentMethod}`,
      status: 'completed',
      paymentMethod: paymentMethod,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.transactions.unshift(senderTx);

    let recipientTx = null;
    let recipientAccount = null;

    if (recipientUser) {
      recipientAccount = data.accounts.find((a) => String(a.userId) === String(recipientUser._id || recipientUser.id));
      if (recipientAccount) {
        // Credit to recipient
        recipientAccount.currentBalance += amt;
        recipientAccount.totalCredited = (recipientAccount.totalCredited || 0) + amt;

        recipientTx = {
          _id: generateId(),
          id: generateId(),
          accountId: recipientAccount._id || recipientAccount.id,
          userId: recipientUser._id || recipientUser.id,
          title: `Received from ${senderUser.name}`,
          merchant: senderUser.name,
          category: 'Daily Expenses',
          type: 'credit',
          amount: amt,
          description: `Received via ${paymentMethod}`,
          status: 'completed',
          paymentMethod: paymentMethod,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.transactions.unshift(recipientTx);
      }
    }

    saveData(data);

    return {
      senderTx,
      senderBalance: senderAccount.currentBalance,
      recipientUser: recipientUser ? recipientUser.name : null,
      recipientBalance: recipientAccount ? recipientAccount.currentBalance : null,
      recipientTx,
    };
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
    const newEmi = {
      _id: generateId(),
      id: generateId(),
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
    saveData({ ...defaultData });
    return true;
  },
};
