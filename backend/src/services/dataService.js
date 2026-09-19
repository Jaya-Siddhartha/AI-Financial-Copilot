import { isMongooseConnected } from '../config/db.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { EMI } from '../models/EMI.js';
import { memoryStore, DEMO_USERS } from '../config/store.js';

export const dataService = {
  // USERS
  async getAllUsers() {
    if (isMongooseConnected) {
      return await User.find().lean();
    }
    return await memoryStore.getAllUsers();
  },

  async getUserById(userId) {
    if (isMongooseConnected) {
      return await User.findById(userId);
    }
    return await memoryStore.findUser({ id: userId });
  },

  async getActiveUser(preferredUserId) {
    if (isMongooseConnected) {
      if (preferredUserId) {
        const found = await User.findById(preferredUserId);
        if (found) return found;
      }
      return await User.findOne();
    }

    if (preferredUserId) {
      const found = await memoryStore.findUser({ id: preferredUserId });
      if (found) return found;
    }
    return await memoryStore.findUser({});
  },

  async upsertUser(userData) {
    if (isMongooseConnected) {
      let user = await User.findById(userData.id || userData._id);
      if (user) {
        Object.assign(user, userData);
        return await user.save();
      }
      return await User.create(userData);
    }

    let existing = await memoryStore.findUser({ id: userData.id || userData._id });
    if (existing) {
      return await memoryStore.updateUser(existing.id || existing._id, userData);
    }
    return await memoryStore.createUser(userData);
  },

  // ACCOUNTS
  async getAllAccounts() {
    if (isMongooseConnected) {
      return await Account.find().lean();
    }
    return await memoryStore.getAllAccounts();
  },

  async getAccountByUserId(userId) {
    if (isMongooseConnected) {
      return await Account.findOne({ userId });
    }
    return await memoryStore.findAccount({ userId });
  },

  async upsertAccount(userId, accountData) {
    if (isMongooseConnected) {
      let account = await Account.findOne({ userId });
      if (account) {
        Object.assign(account, accountData);
        return await account.save();
      }
      return await Account.create({ userId, ...accountData });
    }

    let existing = await memoryStore.findAccount({ userId });
    if (existing) {
      return await memoryStore.updateAccount(existing.id || existing._id, accountData);
    }
    return await memoryStore.createAccount({ userId, ...accountData });
  },

  async updateAccountBalances(accountId, updates) {
    if (isMongooseConnected) {
      return await Account.findByIdAndUpdate(accountId, updates, { new: true });
    }
    return await memoryStore.updateAccount(accountId, updates);
  },

  // TRANSACTIONS
  async getTransactions(query = {}, limit = 100) {
    if (isMongooseConnected) {
      const q = {};
      if (query.userId) q.userId = query.userId;
      if (query.category && query.category !== 'all') q.category = query.category;
      if (query.type && query.type !== 'all') q.type = query.type;
      if (query.search) {
        q.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { merchant: { $regex: query.search, $options: 'i' } },
          { category: { $regex: query.search, $options: 'i' } },
        ];
      }
      return await Transaction.find(q).sort({ date: -1 }).limit(limit).lean();
    }
    return await memoryStore.findTransactions(query, { date: -1 }, limit);
  },

  async seedTransactions(user, account, demoItems) {
    const userId = user.id || user._id;
    const accountId = account.id || account._id;

    if (isMongooseConnected) {
      await Transaction.deleteMany({ userId });
      const docs = demoItems.map((item) => ({ ...item, userId, accountId }));
      return await Transaction.insertMany(docs);
    }

    await memoryStore.deleteTransactions({ userId });
    const docs = demoItems.map((item) => ({ ...item, userId, accountId }));
    return await memoryStore.insertManyTransactions(docs);
  },

  async addTransaction(txData) {
    if (isMongooseConnected) {
      return await Transaction.create(txData);
    }
    return await memoryStore.createTransaction(txData);
  },

  async updateTransactionCategory(txId, category) {
    if (isMongooseConnected) {
      return await Transaction.findByIdAndUpdate(txId, { category }, { new: true });
    }
    return await memoryStore.updateTransactionCategory(txId, category);
  },

  // ATOMIC TRANSFER
  async transferBetweenAccounts(transferPayload) {
    return await memoryStore.transferBetweenAccounts(transferPayload);
  },

  // BALANCE VERIFICATION
  async verifyBankBalance(userId, enteredPin) {
    return await memoryStore.verifyBankBalance(userId, enteredPin);
  },

  // UPDATE UPI PIN
  async updateUpiPin(userId, oldPin, newPin) {
    return await memoryStore.updateUpiPin(userId, oldPin, newPin);
  },

  // EMIS
  async getEMIs(userId) {
    if (isMongooseConnected) {
      return await EMI.find({ userId }).sort({ dueDay: 1 }).lean();
    }
    return await memoryStore.findEMIs({ userId });
  },

  async createEMI(emiData) {
    if (isMongooseConnected) {
      return await EMI.create(emiData);
    }
    return await memoryStore.createEMI(emiData);
  },

  async updateEMI(emiId, updates) {
    if (isMongooseConnected) {
      return await EMI.findByIdAndUpdate(emiId, updates, { new: true });
    }
    return await memoryStore.updateEMI(emiId, updates);
  },

  async deleteEMI(emiId) {
    if (isMongooseConnected) {
      return await EMI.findByIdAndDelete(emiId);
    }
    return await memoryStore.deleteEMI(emiId);
  },

  // RESET
  async resetAll() {
    if (isMongooseConnected) {
      await Transaction.deleteMany({});
      await Account.deleteMany({});
      await User.deleteMany({});
      await EMI.deleteMany({});
      return true;
    }
    return await memoryStore.resetAll();
  },
};
