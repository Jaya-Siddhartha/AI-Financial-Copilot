import { dataService } from '../services/dataService.js';
import { CATEGORIES, CATEGORY_LIST } from '../config/categories.js';

// NPCI's standard per-transaction limit for person-to-person UPI payments.
export const MAX_UPI_AMOUNT = 100000;
const MAX_RECEIVE_AMOUNT = 1000000;
const PAYMENT_METHODS = ['UPI', 'Direct Bank Transfer', 'Card', 'Cash'];
const cleanMethod = (value) => (PAYMENT_METHODS.includes(value) ? value : 'UPI');
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Returns the amount rounded to paise, or null if it is not a positive number.
const parseAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
};

export const getTransactions = async (req, res) => {
  try {
    const { category, type, search, userId, limit = 100 } = req.query;

    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    const query = {};
    if (targetUserId) {
      query.userId = targetUserId;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (type && (type === 'credit' || type === 'debit')) {
      query.type = type;
    }
    if (search) {
      query.search = search;
    }

    const safeLimit = Math.min(500, Math.max(1, Number.parseInt(limit, 10) || 100));
    const transactions = await dataService.getTransactions(query, safeLimit);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error('[transactionController] getTransactions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Simplified Indian UPI Simulated Payment
export const makePayment = async (req, res) => {
  try {
    const {
      senderId,
      userId,
      recipientName,
      recipientPhone = '',
      recipientUpi = '',
      amount,
      upiPin,
      note = '',
      paymentMethod = 'UPI',
    } = req.body;

    const amountNum = parseAmount(amount);
    if (amountNum === null) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than ₹0.' });
    }
    if (amountNum > MAX_UPI_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `UPI payments are limited to ₹${MAX_UPI_AMOUNT.toLocaleString('en-IN')} per transaction.`,
      });
    }

    // Resolve sender (support senderId or userId)
    let activeSenderId = senderId || userId;
    if (!activeSenderId) {
      const activeUser = await dataService.getActiveUser();
      if (!activeUser) {
        return res.status(404).json({ success: false, message: 'No active account found.' });
      }
      activeSenderId = activeUser.id || activeUser._id;
    }

    // Validate mobile number if provided
    let digitsOnly = '';
    if (typeof recipientPhone === 'string' && recipientPhone.trim()) {
      digitsOnly = recipientPhone.replace(/[^0-9]/g, '');
      // If user typed 12 digits like 919876543210, strip leading 91
      if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        digitsOnly = digitsOnly.slice(2);
      }
      if (digitsOnly.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Invalid mobile number. Please enter exactly 10 digits for Indian mobile numbers.',
        });
      }
    }

    // Recipient name resolution
    const cleanUpi = cleanText(recipientUpi, 60);
    const cleanName = cleanText(recipientName, 60);
    const finalRecipient = cleanName || cleanUpi || (digitsOnly ? `+91 ${digitsOnly}` : '');

    if (!cleanUpi && !digitsOnly && !cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Select a recipient or enter a 10-digit mobile number or UPI ID.',
      });
    }

    const transferResult = await dataService.transferBetweenAccounts({
      senderId: activeSenderId,
      recipientName: finalRecipient,
      recipientPhone: digitsOnly,
      recipientUpi: cleanUpi,
      amount: amountNum,
      upiPin,
      note: typeof note === 'string' ? note.trim().slice(0, 120) : '',
      paymentMethod: cleanMethod(paymentMethod),
    });

    return res.status(201).json({
      success: true,
      message: `Payment Successful! ₹${amountNum.toLocaleString('en-IN')} sent to ${finalRecipient}.`,
      data: {
        transaction: transferResult.senderTx,
        newBalance: transferResult.senderBalance,
        recipientUser: transferResult.recipientUser,
        recipientBalance: transferResult.recipientBalance,
        recipientTx: transferResult.recipientTx,
      },
    });
  } catch (error) {
    if (!error.status) console.error('[transactionController] makePayment error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Payment failed.' });
  }
};

// Receive Money (Credit)
export const receiveMoney = async (req, res) => {
  try {
    const {
      userId,
      amount,
      senderName = 'Friend',
      category = CATEGORIES.OTHER,
      note = '',
      paymentMethod = 'UPI',
    } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    const account = await dataService.getAccountByUserId(targetUserId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'No active account found' });
    }

    const amountNum = parseAmount(amount);
    if (amountNum === null) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than ₹0.' });
    }
    if (amountNum > MAX_RECEIVE_AMOUNT) {
      return res.status(400).json({ success: false, message: 'Amount is too large for a single credit.' });
    }

    const sender = cleanText(senderName, 60) || 'Sender';
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 120) : '';

    const newTx = await dataService.addTransaction({
      accountId: account.id || account._id,
      userId: targetUserId,
      title: `Received from ${sender}`,
      merchant: sender,
      category: CATEGORY_LIST.includes(category) ? category : CATEGORIES.OTHER,
      type: 'credit',
      amount: amountNum,
      description: cleanNote || `Received via ${cleanMethod(paymentMethod)}`,
      status: 'completed',
      paymentMethod: cleanMethod(paymentMethod),
      date: new Date().toISOString(),
    });

    const updatedAccount = await dataService.adjustAccountBalance(account.id || account._id, {
      balanceDelta: amountNum,
      creditedDelta: amountNum,
    });
    const updatedBalance = updatedAccount ? updatedAccount.currentBalance : Number(account.currentBalance) + amountNum;

    return res.status(201).json({
      success: true,
      message: `₹${amountNum.toLocaleString('en-IN')} received from ${sender}.`,
      data: {
        transaction: newTx,
        newBalance: updatedBalance,
      },
    });
  } catch (error) {
    console.error('[transactionController] receiveMoney error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Category of an existing transaction (Manual Correction)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, userId } = req.body;

    if (!CATEGORY_LIST.includes(category)) {
      return res.status(400).json({ success: false, message: 'Choose a valid category.' });
    }

    // Only the owner of a transaction may change it.
    const existing = userId ? await dataService.getTransactionById(id) : null;
    if (!existing || String(existing.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const updated = await dataService.updateTransactionCategory(id, category);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction category updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('[transactionController] updateCategory error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

