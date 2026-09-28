import { isMongooseConnected } from '../config/db.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { EMI } from '../models/EMI.js';
import { memoryStore } from '../config/store.js';
import { autoCategorizeRecipient, CATEGORIES } from '../config/categories.js';

// UPI-style PIN protection: after MAX_PIN_ATTEMPTS wrong entries the PIN is locked for a while.
export const MAX_PIN_ATTEMPTS = 3;
export const PIN_LOCK_MINUTES = 5;

export const httpError = (status, message) => Object.assign(new Error(message), { status });

const idOf = (doc) => (doc ? String(doc.id || doc._id) : null);
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const digitsOf = (value) => String(value || '').replace(/[^0-9]/g, '').slice(-10);

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

  async updateUser(userId, updates) {
    if (isMongooseConnected) {
      return await User.findByIdAndUpdate(userId, updates, { new: true });
    }
    return await memoryStore.updateUser(userId, updates);
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
        const pattern = escapeRegex(query.search);
        q.$or = [
          { title: { $regex: pattern, $options: 'i' } },
          { merchant: { $regex: pattern, $options: 'i' } },
          { category: { $regex: pattern, $options: 'i' } },
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

  async getTransactionById(txId) {
    if (isMongooseConnected) {
      return await Transaction.findById(txId).lean();
    }
    return await memoryStore.findTransaction(txId);
  },

  async updateTransactionCategory(txId, category) {
    if (isMongooseConnected) {
      return await Transaction.findByIdAndUpdate(txId, { category }, { new: true });
    }
    return await memoryStore.updateTransactionCategory(txId, category);
  },

  // Atomic balance change. With requireFunds, the debit only happens if the balance covers it
  // (returns null otherwise), so two concurrent payments cannot overdraw the account.
  async adjustAccountBalance(accountId, deltas) {
    if (isMongooseConnected) {
      const { balanceDelta = 0, creditedDelta = 0, debitedDelta = 0, requireFunds = 0 } = deltas;
      const filter = { _id: accountId };
      if (requireFunds) {
        filter.currentBalance = { $gte: requireFunds };
        filter.$or = [{ bankBalance: { $gte: requireFunds } }, { bankBalance: { $exists: false } }, { bankBalance: null }];
      }
      const current = await Account.findById(accountId).lean();
      const inc = { currentBalance: balanceDelta, totalCredited: creditedDelta, totalDebited: debitedDelta };
      if (current && typeof current.bankBalance === 'number') inc.bankBalance = balanceDelta;
      return await Account.findOneAndUpdate(filter, { $inc: inc }, { new: true });
    }
    return await memoryStore.adjustAccountBalance(accountId, deltas);
  },

  // Validates a UPI PIN and enforces the wrong-attempt lockout. Throws an error with an HTTP status.
  async assertUpiPin(user, enteredPin, wrongPinMessage = 'Incorrect UPI PIN.') {
    const userId = idOf(user);
    const now = Date.now();
    const lockedUntil = user.pinLockedUntil ? new Date(user.pinLockedUntil).getTime() : 0;

    if (lockedUntil > now) {
      const minutes = Math.ceil((lockedUntil - now) / 60000);
      throw httpError(423, `UPI PIN is locked after ${MAX_PIN_ATTEMPTS} wrong attempts. Try again in ${minutes} min.`);
    }

    const pin = String(enteredPin ?? '').trim();
    if (!/^\d{4}$/.test(pin)) {
      throw httpError(400, 'Enter your 4-digit UPI PIN.');
    }

    if (!user.upiPin) {
      throw httpError(403, 'No UPI PIN is set for this account.');
    }

    if (pin !== String(user.upiPin)) {
      const attempts = (Number(user.pinFailedAttempts) || 0) + 1;
      if (attempts >= MAX_PIN_ATTEMPTS) {
        await this.updateUser(userId, {
          pinFailedAttempts: 0,
          pinLockedUntil: new Date(now + PIN_LOCK_MINUTES * 60000).toISOString(),
        });
        throw httpError(423, `Too many wrong attempts. UPI PIN locked for ${PIN_LOCK_MINUTES} minutes.`);
      }
      await this.updateUser(userId, { pinFailedAttempts: attempts });
      const left = MAX_PIN_ATTEMPTS - attempts;
      throw httpError(400, `${wrongPinMessage} ${left} attempt${left === 1 ? '' : 's'} left.`);
    }

    if (user.pinFailedAttempts || user.pinLockedUntil) {
      await this.updateUser(userId, { pinFailedAttempts: 0, pinLockedUntil: null });
    }
  },

  // UPI transfer. If the recipient is another account in this system, it is credited too.
  async transferBetweenAccounts({ senderId, recipientName, recipientPhone = '', recipientUpi = '', amount, upiPin, note = '', paymentMethod = 'UPI' }) {
    const amt = Number(amount);
    const senderUser = await this.getUserById(senderId);
    const senderAccount = senderUser ? await this.getAccountByUserId(idOf(senderUser)) : null;
    if (!senderUser || !senderAccount) {
      throw httpError(404, 'Sender account not found.');
    }

    await this.assertUpiPin(senderUser, upiPin, 'Incorrect UPI PIN. Payment not processed.');

    const cleanPhone = digitsOf(recipientPhone);
    const cleanUpi = String(recipientUpi || '').toLowerCase().trim();
    const cleanName = String(recipientName || '').toLowerCase().trim();

    const users = await this.getAllUsers();
    const recipientUser = users.find((u) => {
      if (idOf(u) === idOf(senderUser)) return false;
      const phone = digitsOf(u.phoneOnly || u.mobile);
      if (cleanPhone && phone && cleanPhone === phone) return true;
      if (cleanUpi && u.upiId && cleanUpi === u.upiId.toLowerCase()) return true;
      const names = [u.name, u.fullName].filter(Boolean).map((n) => n.toLowerCase());
      return Boolean(cleanName) && names.includes(cleanName);
    });

    const updatedSender = await this.adjustAccountBalance(idOf(senderAccount), {
      balanceDelta: -amt,
      debitedDelta: amt,
      requireFunds: amt,
    });
    if (!updatedSender) throw this.fundsError(senderAccount, amt);

    const displayRecipient = recipientUser ? recipientUser.name : recipientName;
    const nowIso = new Date().toISOString();

    const senderTx = await this.addTransaction({
      accountId: idOf(senderAccount),
      userId: idOf(senderUser),
      title: `Paid to ${displayRecipient}`,
      merchant: displayRecipient,
      category: autoCategorizeRecipient(displayRecipient),
      type: 'debit',
      amount: amt,
      description: note || `Paid via ${paymentMethod}`,
      status: 'completed',
      paymentMethod,
      date: nowIso,
    });

    let recipientTx = null;
    let updatedRecipient = null;
    if (recipientUser) {
      const recipientAccount = await this.getAccountByUserId(idOf(recipientUser));
      if (recipientAccount) {
        updatedRecipient = await this.adjustAccountBalance(idOf(recipientAccount), {
          balanceDelta: amt,
          creditedDelta: amt,
        });
        recipientTx = await this.addTransaction({
          accountId: idOf(recipientAccount),
          userId: idOf(recipientUser),
          title: `Received from ${senderUser.name}`,
          merchant: senderUser.name,
          category: CATEGORIES.OTHER,
          type: 'credit',
          amount: amt,
          description: note || `Received via ${paymentMethod}`,
          status: 'completed',
          paymentMethod,
          date: nowIso,
        });
      }
    }

    return {
      senderTx,
      senderBalance: updatedSender.currentBalance,
      recipientUser: recipientUser ? recipientUser.name : null,
      recipientBalance: updatedRecipient ? updatedRecipient.currentBalance : null,
      recipientTx,
    };
  },

  // Explains a refused debit: the app's balance is too low, or the bank's real balance is
  // (money moved outside the app since the last balance check).
  fundsError(account, amount) {
    const app = Number(account.currentBalance) || 0;
    if (app >= amount) {
      return httpError(400, 'Your bank says there is not enough money in your account. Check your bank balance: money may have been spent outside this app.');
    }
    return httpError(400, `Not enough balance. You have ₹${app.toLocaleString('en-IN')}.`);
  },

  // BALANCE CHECK: asks the (simulated) bank for the real balance. If money moved outside the
  // app, the difference is recorded as a "Bank balance update" entry and the app balance is
  // corrected, so the balance always equals the last bank figure plus in-app payments since.
  async verifyBankBalance(userId, enteredPin) {
    const user = await this.getUserById(userId);
    if (!user) throw httpError(404, 'User account not found.');

    await this.assertUpiPin(user, enteredPin, 'Incorrect UPI PIN.');

    const account = await this.getAccountByUserId(idOf(user));
    if (!account) throw httpError(404, 'Bank account not found.');

    const appBalance = Number(account.currentBalance) || 0;
    const bankBalance = Number(account.bankBalance ?? appBalance);
    const difference = Math.round((bankBalance - appBalance) * 100) / 100;
    const nowIso = new Date().toISOString();

    if (difference !== 0) {
      await this.addTransaction({
        accountId: idOf(account),
        userId: idOf(user),
        title: difference > 0 ? 'Bank balance update (money added outside this app)' : 'Bank balance update (money spent outside this app)',
        merchant: account.bankName || 'Your bank',
        category: CATEGORIES.BANK_UPDATE,
        type: difference > 0 ? 'credit' : 'debit',
        amount: Math.abs(difference),
        description: 'Found when you checked your bank balance',
        status: 'completed',
        paymentMethod: 'Direct Bank Transfer',
        date: nowIso,
      });
    }

    await this.updateAccountBalances(idOf(account), {
      currentBalance: bankBalance,
      bankBalance,
      verifiedBalance: bankBalance,
      lastBalanceCheckDate: nowIso,
    });

    return {
      success: true,
      verifiedBalance: bankBalance,
      currentBalance: bankBalance,
      previousAppBalance: appBalance,
      difference,
      lastBalanceCheckDate: nowIso,
      bankName: account.bankName || 'Simulated Bank (UPI)',
      accountNumberMasked: account.accountNumberMasked || '•••• 4092',
    };
  },

  // CHANGE UPI PIN
  async updateUpiPin(userId, oldPin, newPin) {
    const user = await this.getUserById(userId);
    if (!user) throw httpError(404, 'User account not found.');

    await this.assertUpiPin(user, oldPin, 'Current UPI PIN is incorrect.');

    const next = String(newPin ?? '').trim();
    if (!/^\d{4}$/.test(next)) {
      throw httpError(400, 'New UPI PIN must be exactly 4 digits.');
    }
    if (next === String(user.upiPin)) {
      throw httpError(400, 'Choose a new UPI PIN that is different from the current one.');
    }

    await this.updateUser(idOf(user), { upiPin: next });
    return { success: true, message: 'UPI PIN updated successfully.' };
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
