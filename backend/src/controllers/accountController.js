import { dataService } from '../services/dataService.js';
import { seedDualDemoAccounts } from '../services/seedService.js';
import { DEMO_USERS } from '../config/store.js';

// Get list of all switchable simulated accounts
export const getAllAccounts = async (req, res) => {
  try {
    let users = await dataService.getAllUsers();
    if (!users || users.length === 0) {
      await seedDualDemoAccounts();
      users = await dataService.getAllUsers();
    }
    const accounts = await dataService.getAllAccounts();

    const switchableList = users.map((u) => {
      const uId = u.id || u._id;
      const acc = accounts.find((a) => String(a.userId) === String(uId));
      return {
        id: uId,
        name: u.name,
        fullName: u.fullName || u.name,
        mobile: u.mobile || '+91 9876543210',
        phoneOnly: u.phoneOnly || '9876543210',
        upiId: u.upiId || `${u.name.toLowerCase()}@fin`,
        currentBalance: acc ? acc.currentBalance : 50000,
        verifiedBalance: acc ? (acc.verifiedBalance !== undefined ? acc.verifiedBalance : acc.currentBalance) : 50000,
        lastBalanceCheckDate: acc ? (acc.lastBalanceCheckDate || new Date().toISOString()) : new Date().toISOString(),
        bankName: acc ? acc.bankName : 'Simulated UPI Bank',
      };
    });

    return res.status(200).json({
      success: true,
      hasAccount: true,
      data: switchableList,
    });
  } catch (error) {
    console.error('[accountController] getAllAccounts error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get current account status
export const getCurrentAccount = async (req, res) => {
  try {
    const { userId } = req.query;
    let user = await dataService.getActiveUser(userId);

    // If no users exist, auto-seed dual accounts
    if (!user) {
      await seedDualDemoAccounts();
      user = await dataService.getActiveUser(userId);
    }

    const uId = user.id || user._id;
    const account = await dataService.getAccountByUserId(uId);

    return res.status(200).json({
      success: true,
      exists: true,
      hasAccount: true,
      data: {
        user: {
          id: uId,
          name: user.name,
          fullName: user.fullName || user.name,
          mobile: user.mobile || '+91 9876543210',
          phoneOnly: user.phoneOnly || '9876543210',
          upiId: user.upiId || `${user.name.toLowerCase()}@fin`,
          monthlyIncome: user.monthlyIncome,
          salaryDate: user.salaryDate,
          currency: '₹',
        },
        account,
      },
    });
  } catch (error) {
    console.error('[accountController] getCurrentAccount error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate days remaining until due day
const getDaysUntil = (dueDay) => {
  const now = new Date();
  const currentDay = now.getDate();

  if (dueDay >= currentDay) {
    return dueDay - currentDay;
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - currentDay + dueDay;
};

// Aggregated Dashboard Data with Simplified Indian Plain-English AI Prediction
export const getDashboardData = async (req, res) => {
  try {
    const { userId } = req.query;
    let user = await dataService.getActiveUser(userId);

    if (!user) {
      await seedDualDemoAccounts();
      user = await dataService.getActiveUser(userId);
    }

    const uId = user.id || user._id;
    const account = await dataService.getAccountByUserId(uId);

    if (!account) {
      return res.status(404).json({ success: false, hasAccount: false, message: 'Account not found.' });
    }

    // 1. Fetch user's transactions
    const transactions = await dataService.getTransactions({ userId: uId }, 100);
    const recentTransactions = transactions.slice(0, 8);

    // 2. Fetch user's EMIs
    const rawEmis = await dataService.getEMIs(uId);
    const emis = rawEmis.map((emi) => {
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

    // 3. Category distribution & non-fixed debits
    const categoryMap = {};
    let totalDebitSum = 0;
    let totalCreditSum = 0;
    let nonFixedDebitsSum = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'debit') {
        totalDebitSum += amt;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;
        if (tx.category !== 'EMI' && tx.category !== 'Housing') {
          nonFixedDebitsSum += amt;
        }
      } else if (tx.type === 'credit') {
        totalCreditSum += amt;
      }
    });

    const categoryBreakdown = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalDebitSum > 0 ? Math.round((categoryMap[cat] / totalDebitSum) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // 4. Daily Spending & AI Safe-to-Spend Calculation
    const currentBalance = Number(account.currentBalance) || 0;
    const verifiedBalance = account.verifiedBalance !== undefined ? Number(account.verifiedBalance) : currentBalance;
    const lastBalanceCheckDate = account.lastBalanceCheckDate || new Date().toISOString();

    // Transactions since verification
    const checkTime = new Date(lastBalanceCheckDate).getTime();
    let creditsSinceCheck = 0;
    let debitsSinceCheck = 0;

    transactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime > checkTime) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'credit') creditsSinceCheck += amt;
        if (tx.type === 'debit') debitsSinceCheck += amt;
      }
    });

    const estimatedCurrentBalance = currentBalance;
    const upcomingUnpaidEMIs = emis.filter((e) => e.status !== 'paid_this_cycle');

    let nextEMI = null;
    let totalUpcomingEMIAmount = 0;
    let daysUntilNextEMI = 10;

    if (upcomingUnpaidEMIs.length > 0) {
      upcomingUnpaidEMIs.sort((a, b) => a.daysRemaining - b.daysRemaining);
      nextEMI = upcomingUnpaidEMIs[0];
      totalUpcomingEMIAmount = upcomingUnpaidEMIs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      daysUntilNextEMI = nextEMI.daysRemaining || 10;
    }

    // Daily normal spending estimate
    const dailyBurnRate = Math.max(500, Math.round(nonFixedDebitsSum / 7));
    const expectedNormalExpenses = Math.round(dailyBurnRate * Math.max(1, daysUntilNextEMI));
    const safetyReserve = 2000;

    const totalObligations = totalUpcomingEMIAmount + expectedNormalExpenses;
    const safeToSpend = Math.max(0, currentBalance - totalUpcomingEMIAmount - expectedNormalExpenses - safetyReserve);
    const balanceAfterObligations = currentBalance - totalUpcomingEMIAmount;

    // Plain-English AI Status and Advice
    let status = 'SAFE'; // SAFE | CAUTION | HIGH RISK
    let plainExplanation = '';
    let aiAdvice = '';

    if (upcomingUnpaidEMIs.length === 0) {
      status = 'SAFE';
      plainExplanation = 'You have no pending EMI obligations this cycle. Your full balance is available to spend.';
      aiAdvice = 'Your finances look completely safe.';
    } else if (currentBalance < totalUpcomingEMIAmount) {
      status = 'HIGH RISK';
      const shortfall = totalUpcomingEMIAmount - currentBalance;
      plainExplanation = `Your current estimated balance may not be enough to cover your upcoming ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI due in ${daysUntilNextEMI} days. You are short by ₹${shortfall.toLocaleString('en-IN')}.`;
      aiAdvice = `Stop all non-essential payments and arrange ₹${shortfall.toLocaleString('en-IN')} before your EMI due date.`;
    } else if (currentBalance < totalObligations) {
      status = 'HIGH RISK';
      const projectedShortfall = totalObligations - currentBalance;
      plainExplanation = `Based on your recent daily spending pattern, you may run out of money before your ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI due in ${daysUntilNextEMI} days.`;
      aiAdvice = `Your spending is putting your upcoming EMI at risk. Limit your daily spending to under ₹${Math.max(0, Math.round(balanceAfterObligations / daysUntilNextEMI)).toLocaleString('en-IN')}/day.`;
    } else if (currentBalance < totalObligations + safetyReserve) {
      status = 'CAUTION';
      plainExplanation = `Your balance is getting close to the amount needed for your upcoming ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI.`;
      aiAdvice = 'Avoid large non-essential purchases until after your EMI payment clears.';
    } else {
      status = 'SAFE';
      plainExplanation = `Your balance is sufficient for your upcoming ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI and expected normal spending.`;
      aiAdvice = `Your upcoming EMI is protected. You can safely spend up to ₹${safeToSpend.toLocaleString('en-IN')} without putting your upcoming EMI at risk.`;
    }

    return res.status(200).json({
      success: true,
      hasAccount: true,
      data: {
        user: {
          id: uId,
          name: user.name,
          fullName: user.fullName || user.name,
          mobile: user.mobile || '+91 9876543210',
          phoneOnly: user.phoneOnly || '9876543210',
          upiId: user.upiId || `${user.name.toLowerCase()}@fin`,
          currency: '₹',
        },
        account: {
          id: account.id || account._id,
          bankName: account.bankName || 'HDFC Bank (Simulated UPI)',
          accountNumberMasked: account.accountNumberMasked || '•••• 4092',
          currentBalance: currentBalance,
          verifiedBalance: verifiedBalance,
          lastBalanceCheckDate: lastBalanceCheckDate,
          startingBalance: account.startingBalance,
          totalCredited: account.totalCredited || totalCreditSum,
          totalDebited: account.totalDebited || totalDebitSum,
          currency: '₹',
        },
        metrics: {
          currentBalance,
          estimatedCurrentBalance,
          verifiedBalance,
          lastBalanceCheckDate,
          creditsSinceCheck,
          debitsSinceCheck,
          safeToSpend,
          totalUpcomingEMI: totalUpcomingEMIAmount,
          nextEMI,
          riskStatus: status,
          dailyBurnRate,
        },
        aiPrediction: {
          status,
          summary: plainExplanation,
          advice: aiAdvice,
          recommendation: aiAdvice,
          currentBalance,
          estimatedCurrentBalance,
          verifiedBalance,
          lastBalanceCheckDate,
          upcomingEMIAmount: totalUpcomingEMIAmount,
          daysUntilEMI: daysUntilNextEMI,
          expectedNormalExpenses,
          safetyReserve,
          safeToSpend,
          balanceAfterObligations,
          nextEMI,
        },
        emis,
        categoryBreakdown,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('[accountController] getDashboardData error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Check Bank Balance via 4-Digit UPI PIN
export const checkBankBalance = async (req, res) => {
  try {
    const { userId, upiPin } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (!upiPin || String(upiPin).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please enter your 4-digit UPI PIN.' });
    }

    const verificationResult = await dataService.verifyBankBalance(targetUserId, upiPin);

    return res.status(200).json({
      success: true,
      message: 'Bank balance verified successfully.',
      data: verificationResult,
    });
  } catch (error) {
    console.error('[accountController] checkBankBalance error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Balance verification failed.' });
  }
};

// Update / Change UPI PIN
export const updateUpiPin = async (req, res) => {
  try {
    const { userId, oldPin, newPin } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      const activeUser = await dataService.getActiveUser();
      targetUserId = activeUser ? (activeUser.id || activeUser._id) : null;
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const result = await dataService.updateUpiPin(targetUserId, oldPin, newPin);

    return res.status(200).json(result);
  } catch (error) {
    console.error('[accountController] updateUpiPin error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Reset demo to standard initial dual-account state
export const resetAccount = async (req, res) => {
  try {
    await seedDualDemoAccounts();
    return res.status(200).json({
      success: true,
      message: 'Demo dataset reset successfully for both Siddhartha and Rahul accounts.',
    });
  } catch (error) {
    console.error('[accountController] resetAccount error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
