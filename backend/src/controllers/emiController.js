import { dataService } from '../services/dataService.js';
import { enrichEmi, getDaysUntil } from '../services/financialEngine.js';
import { CATEGORIES } from '../config/categories.js';

const resolveUserId = async (userId) => {
  if (userId) return userId;
  const activeUser = await dataService.getActiveUser();
  return activeUser ? (activeUser.id || activeUser._id) : null;
};

const FREQUENCIES = ['Monthly'];
const MAX_EMI_AMOUNT = 10000000;
const cleanText = (value, max = 60) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const findUserEmi = async (userId, emiId) => {
  const emis = await dataService.getEMIs(userId);
  return emis.find((e) => String(e._id || e.id) === String(emiId)) || null;
};

export const getEMIs = async (req, res) => {
  try {
    const targetUserId = await resolveUserId(req.query.userId);
    if (!targetUserId) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const emis = (await dataService.getEMIs(targetUserId)).map((e) => enrichEmi(e));
    return res.status(200).json({ success: true, count: emis.length, data: emis });
  } catch (error) {
    console.error('[emiController] getEMIs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEMI = async (req, res) => {
  try {
    const { userId, name, lender, amount, dueDay, frequency = 'Monthly', totalLoanAmount, remainingInstallments } = req.body;

    const targetUserId = await resolveUserId(userId);
    const account = targetUserId ? await dataService.getAccountByUserId(targetUserId) : null;
    if (!account) {
      return res.status(404).json({ success: false, message: 'No active account found' });
    }

    const cleanName = cleanText(name, 60);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Enter a name for the EMI.' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > MAX_EMI_AMOUNT) {
      return res.status(400).json({ success: false, message: 'Enter a valid EMI amount.' });
    }
    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ success: false, message: 'Only monthly EMIs are supported.' });
    }

    const dueDayNum = Number(dueDay);
    if (!Number.isInteger(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      return res.status(400).json({ success: false, message: 'Due day must be between 1 and 31.' });
    }

    const installments = Math.min(600, Math.max(1, Math.round(Number(remainingInstallments) || 12)));
    const dueDate = new Date(Date.now() + getDaysUntil(dueDayNum) * 86400000).toISOString();

    const newEMI = await dataService.createEMI({
      userId: targetUserId,
      accountId: account.id || account._id,
      name: cleanName,
      lender: cleanText(lender, 60) || 'Finance Provider',
      amount: Math.round(amountNum * 100) / 100,
      dueDay: dueDayNum,
      dueDate,
      frequency,
      totalLoanAmount: Number(totalLoanAmount) || amountNum * installments,
      remainingInstallments: installments,
      status: 'upcoming',
    });

    return res.status(201).json({
      success: true,
      message: 'EMI obligation added successfully',
      data: enrichEmi(newEMI),
    });
  } catch (error) {
    console.error('[emiController] createEMI error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const payEMI = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await resolveUserId(req.body.userId);

    const account = targetUserId ? await dataService.getAccountByUserId(targetUserId) : null;
    if (!account) {
      return res.status(404).json({ success: false, message: 'No active account found' });
    }

    const stored = await findUserEmi(targetUserId, id);
    if (!stored) {
      return res.status(404).json({ success: false, message: 'EMI record not found.' });
    }

    const targetEmi = enrichEmi(stored);
    if (targetEmi.status === 'paid_this_cycle') {
      return res.status(400).json({ success: false, message: 'This EMI is already paid for this month.' });
    }
    if (targetEmi.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This loan is already closed.' });
    }

    // An EMI payment moves money, so it needs the UPI PIN like any other payment.
    const user = await dataService.getUserById(targetUserId);
    await dataService.assertUpiPin(user, req.body.upiPin, 'Incorrect UPI PIN. EMI not paid.');

    const emiAmount = Number(targetEmi.amount);
    const updatedAccount = await dataService.adjustAccountBalance(account.id || account._id, {
      balanceDelta: -emiAmount,
      debitedDelta: emiAmount,
      requireFunds: emiAmount,
    });

    if (!updatedAccount) {
      const currentBalance = Number(account.currentBalance) || 0;
      return res.status(400).json({
        success: false,
        message: `Insufficient balance (₹${currentBalance.toLocaleString('en-IN')}) to pay EMI of ₹${emiAmount.toLocaleString('en-IN')}.`,
      });
    }

    const tx = await dataService.addTransaction({
      accountId: account.id || account._id,
      userId: targetUserId,
      title: `EMI Payment - ${targetEmi.name}`,
      merchant: targetEmi.lender,
      category: CATEGORIES.EMI,
      type: 'debit',
      amount: emiAmount,
      description: 'Paid via UPI Auto-Debit',
      status: 'completed',
      paymentMethod: 'UPI',
      date: new Date().toISOString(),
    });

    const remaining = Math.max(0, (Number(targetEmi.remainingInstallments) || 12) - 1);
    await dataService.updateEMI(targetEmi.id || targetEmi._id, {
      status: 'paid_this_cycle',
      remainingInstallments: remaining,
      lastPaidDate: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: `Successfully paid EMI of ₹${emiAmount.toLocaleString('en-IN')} to ${targetEmi.lender}.`,
      data: {
        transaction: tx,
        newBalance: updatedAccount.currentBalance,
        remainingInstallments: remaining,
      },
    });
  } catch (error) {
    if (!error.status) console.error('[emiController] payEMI error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'EMI payment failed.' });
  }
};

export const deleteEMI = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await resolveUserId(req.query.userId || req.body?.userId);

    const emi = targetUserId ? await findUserEmi(targetUserId, id) : null;
    if (!emi) {
      return res.status(404).json({ success: false, message: 'EMI record not found.' });
    }

    await dataService.deleteEMI(emi.id || emi._id);
    return res.status(200).json({
      success: true,
      message: 'EMI obligation removed.',
    });
  } catch (error) {
    console.error('[emiController] deleteEMI error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
