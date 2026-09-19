import { dataService } from '../services/dataService.js';

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

    const transactions = await dataService.getTransactions(query, Number(limit));

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
      paymentMethod = 'UPI',
    } = req.body;

    // Validate amount
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than ₹0.' });
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
    if (recipientPhone && recipientPhone.trim()) {
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
    const finalRecipient = (
      recipientName ||
      recipientUpi ||
      (digitsOnly ? `+91 ${digitsOnly}` : '') ||
      'Contact'
    ).trim();

    if (!recipientUpi && !digitsOnly && !recipientName) {
      return res.status(400).json({
        success: false,
        message: 'Select a recipient or enter a 10-digit mobile number or UPI ID.',
      });
    }

    const transferResult = await dataService.transferBetweenAccounts({
      senderId: activeSenderId,
      recipientName: finalRecipient,
      recipientPhone: digitsOnly,
      recipientUpi: recipientUpi.trim(),
      amount: amountNum,
      upiPin,
      paymentMethod: paymentMethod || 'UPI',
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
    console.error('[transactionController] makePayment error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Payment failed.' });
  }
};

// Receive Money (Credit)
export const receiveMoney = async (req, res) => {
  try {
    const {
      userId,
      amount,
      senderName = 'Friend',
      category = 'Daily Expenses',
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

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Enter an amount greater than ₹0.' });
    }

    const sender = senderName.trim() || 'Sender';

    const newTx = await dataService.addTransaction({
      accountId: account.id || account._id,
      userId: targetUserId,
      title: `Received from ${sender}`,
      merchant: sender,
      category: category || 'Daily Expenses',
      type: 'credit',
      amount: amountNum,
      description: `Received via ${paymentMethod}`,
      status: 'completed',
      paymentMethod: paymentMethod,
      date: new Date().toISOString(),
    });

    const currentBalance = Number(account.currentBalance) || 0;
    const updatedBalance = currentBalance + amountNum;
    const updatedCredited = (Number(account.totalCredited) || 0) + amountNum;

    await dataService.updateAccountBalances(account.id || account._id, {
      currentBalance: updatedBalance,
      totalCredited: updatedCredited,
    });

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
    const { category } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const updated = await dataService.updateTransactionCategory(id, category.trim());
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

