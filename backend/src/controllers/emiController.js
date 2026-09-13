import { dataService } from '../services/dataService.js';

const getDaysUntil = (dueDay) => {
  const now = new Date();
  const currentDay = now.getDate();

  if (dueDay >= currentDay) {
    return dueDay - currentDay;
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - currentDay + dueDay;
};

export const getEMIs = async (req, res) => {
  try {
    const { userId } = req.query;
    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    if (!targetUserId) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const emis = await dataService.getEMIs(targetUserId);

    const enriched = emis.map((emi) => {
      const daysRemaining = emi.dueDay ? getDaysUntil(emi.dueDay) : 10;
      let reminderBadge = 'Upcoming';
      let urgencyLevel = 'normal';

      if (emi.status === 'paid_this_cycle') {
        reminderBadge = 'Paid this cycle';
        urgencyLevel = 'paid';
      } else if (daysRemaining === 0) {
        reminderBadge = 'Due Today!';
        urgencyLevel = 'critical';
      } else if (daysRemaining === 1) {
        reminderBadge = 'Due Tomorrow';
        urgencyLevel = 'critical';
      } else if (daysRemaining <= 3) {
        reminderBadge = `Due in ${daysRemaining} days`;
        urgencyLevel = 'warning';
      } else {
        reminderBadge = `Due in ${daysRemaining} days`;
        urgencyLevel = 'normal';
      }

      return {
        ...emi,
        daysRemaining,
        reminderBadge,
        urgencyLevel,
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error('[emiController] getEMIs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEMI = async (req, res) => {
  try {
    const { userId, name, lender, amount, dueDay, frequency = 'Monthly', totalLoanAmount, remainingInstallments } = req.body;

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
      return res.status(400).json({ success: false, message: 'Enter a valid positive EMI amount.' });
    }

    const dueDayNum = Number(dueDay);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      return res.status(400).json({ success: false, message: 'Due day must be between 1 and 31.' });
    }

    const now = new Date();
    const daysUntil = dueDayNum >= now.getDate() ? dueDayNum - now.getDate() : 30 - now.getDate() + dueDayNum;
    const dueDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000).toISOString();

    const newEMI = await dataService.createEMI({
      userId: targetUserId,
      accountId: account.id || account._id,
      name: name.trim(),
      lender: lender ? lender.trim() : 'Finance Provider',
      amount: amountNum,
      dueDay: dueDayNum,
      dueDate,
      frequency,
      totalLoanAmount: Number(totalLoanAmount) || amountNum * (Number(remainingInstallments) || 12),
      remainingInstallments: Number(remainingInstallments) || 12,
      status: 'upcoming',
    });

    return res.status(201).json({
      success: true,
      message: 'EMI obligation added successfully',
      data: newEMI,
    });
  } catch (error) {
    console.error('[emiController] createEMI error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const payEMI = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    const account = await dataService.getAccountByUserId(targetUserId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'No active account found' });
    }

    const emis = await dataService.getEMIs(targetUserId);
    const targetEmi = emis.find((e) => String(e._id || e.id) === String(id));

    if (!targetEmi) {
      return res.status(404).json({ success: false, message: 'EMI record not found.' });
    }

    const emiAmount = Number(targetEmi.amount);
    const currentBalance = Number(account.currentBalance) || 0;

    if (currentBalance < emiAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance (₹${currentBalance.toLocaleString('en-IN')}) to pay EMI of ₹${emiAmount.toLocaleString('en-IN')}.`,
      });
    }

    // 1. Create debit transaction
    const tx = await dataService.addTransaction({
      accountId: account.id || account._id,
      userId: targetUserId,
      title: `EMI Payment - ${targetEmi.name}`,
      merchant: targetEmi.lender,
      category: 'EMI',
      type: 'debit',
      amount: emiAmount,
      description: `Paid via UPI Auto-Debit`,
      status: 'completed',
      paymentMethod: 'UPI',
      date: new Date().toISOString(),
    });

    // 2. Update account balance
    const newBalance = currentBalance - emiAmount;
    const newDebited = (Number(account.totalDebited) || 0) + emiAmount;
    await dataService.updateAccountBalances(account.id || account._id, {
      currentBalance: newBalance,
      totalDebited: newDebited,
    });

    // 3. Update EMI status
    const remaining = Math.max(0, (targetEmi.remainingInstallments || 12) - 1);
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
        newBalance,
        remainingInstallments: remaining,
      },
    });
  } catch (error) {
    console.error('[emiController] payEMI error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEMI = async (req, res) => {
  try {
    const { id } = req.params;
    await dataService.deleteEMI(id);
    return res.status(200).json({
      success: true,
      message: 'EMI obligation removed.',
    });
  } catch (error) {
    console.error('[emiController] deleteEMI error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
