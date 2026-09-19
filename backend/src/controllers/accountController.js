import { dataService } from '../services/dataService.js';
import { seedDualDemoAccounts } from '../services/seedService.js';
import { DEMO_USERS } from '../config/store.js';
import { analyzeFinancialState } from '../services/financialEngine.js';

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

// Aggregated Dashboard Data with Central Financial Engine
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

    // 1. Fetch user's transactions & EMIs
    const transactions = await dataService.getTransactions({ userId: uId }, 100);
    const recentTransactions = transactions.slice(0, 10);
    const emis = await dataService.getEMIs(uId);

    // 2. Run Central Financial Analysis Engine
    const analysis = analyzeFinancialState({
      user,
      account,
      transactions,
      emis,
    });

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
          monthlyIncome: user.monthlyIncome || 50000,
          salaryDate: user.salaryDate || 1,
          currency: '₹',
        },
        account: {
          id: account.id || account._id,
          bankName: account.bankName || 'HDFC Bank (Simulated UPI)',
          accountNumberMasked: account.accountNumberMasked || '•••• 4092',
          currentBalance: analysis.currentBalance,
          verifiedBalance: analysis.verifiedBalance,
          lastBalanceCheckDate: analysis.lastBalanceCheckDate,
          startingBalance: account.startingBalance,
          totalCredited: account.totalCredited || 0,
          totalDebited: account.totalDebited || 0,
          currency: '₹',
        },
        metrics: {
          currentBalance: analysis.currentBalance,
          estimatedCurrentBalance: analysis.estimatedCurrentBalance,
          verifiedBalance: analysis.verifiedBalance,
          lastBalanceCheckDate: analysis.lastBalanceCheckDate,
          creditsSinceCheck: analysis.creditsSinceCheck,
          debitsSinceCheck: analysis.debitsSinceCheck,
          safeToSpend: analysis.safeToSpend,
          totalUpcomingEMI: analysis.totalUpcomingEMI,
          nextEMI: analysis.nextEMI,
          riskStatus: analysis.riskStatus,
          dailyBurnRate: analysis.dailyBurnRate,
          expectedNormalExpenses: analysis.expectedNormalExpenses,
          safetyReserve: analysis.safetyReserve,
          riskReason: analysis.riskReason,
          projectedShortfall: analysis.projectedShortfall,
        },
        aiPrediction: {
          status: analysis.riskStatus,
          summary: analysis.summary,
          advice: analysis.advice,
          recommendation: analysis.advice,
          riskReason: analysis.riskReason,
          currentBalance: analysis.currentBalance,
          estimatedCurrentBalance: analysis.estimatedCurrentBalance,
          verifiedBalance: analysis.verifiedBalance,
          lastBalanceCheckDate: analysis.lastBalanceCheckDate,
          upcomingEMIAmount: analysis.totalUpcomingEMI,
          daysUntilEMI: analysis.nextEMI ? (analysis.nextEMI.daysRemaining || 10) : 10,
          expectedNormalExpenses: analysis.expectedNormalExpenses,
          safetyReserve: analysis.safetyReserve,
          safeToSpend: analysis.safeToSpend,
          balanceAfterObligations: analysis.balanceAfterObligations,
          nextEMI: analysis.nextEMI,
        },
        emis: analysis.enrichedEmis,
        categoryBreakdown: analysis.categoryBreakdown,
        recentTransactions,
        projected7Days: analysis.projected7Days,
        forecastHorizons: analysis.forecastHorizons,
        timelineEvents: analysis.timelineEvents,
        salaryCycle: analysis.salaryCycle,
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
