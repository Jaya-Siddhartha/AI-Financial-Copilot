import { CATEGORIES } from '../config/categories.js';

// Calculate days remaining until target day of month (1-31)
export const getDaysUntil = (dueDay) => {
  const now = new Date();
  const currentDay = now.getDate();

  if (dueDay >= currentDay) {
    return dueDay - currentDay;
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - currentDay + dueDay;
};

// Check if a category represents a fixed recurring obligation (excluded from discretionary daily burn rate)
export const isFixedCategory = (category = '') => {
  const cat = String(category).toLowerCase();
  return (
    cat.includes('housing') ||
    cat.includes('rent') ||
    cat.includes('emi') ||
    cat.includes('loan')
  );
};

// Central Financial Calculation Engine
export const analyzeFinancialState = ({
  user = {},
  account = {},
  transactions = [],
  emis = [],
  extraHypotheticalExpense = 0,
}) => {
  const baseBalance = Number(account.currentBalance ?? 50000);
  const currentBalance = Math.max(0, baseBalance - Number(extraHypotheticalExpense || 0));
  const verifiedBalance = Number(account.verifiedBalance ?? baseBalance);
  const lastBalanceCheckDate = account.lastBalanceCheckDate || new Date().toISOString();

  // 1. Transactions Since Last Bank Balance Verification Checkpoint
  const checkTime = new Date(lastBalanceCheckDate).getTime();
  let creditsSinceCheck = 0;
  let debitsSinceCheck = 0;
  let totalDebitSum = 0;
  let totalCreditSum = 0;
  let nonFixedDebitsSum = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const txTime = new Date(tx.date).getTime();

    if (tx.type === 'debit') {
      totalDebitSum += amt;
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;

      if (!isFixedCategory(tx.category)) {
        nonFixedDebitsSum += amt;
      }
      if (txTime > checkTime) {
        debitsSinceCheck += amt;
      }
    } else if (tx.type === 'credit') {
      totalCreditSum += amt;
      if (txTime > checkTime) {
        creditsSinceCheck += amt;
      }
    }
  });

  // Category breakdown for charts
  const categoryBreakdown = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalDebitSum > 0 ? Math.round((categoryMap[cat] / totalDebitSum) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 2. EMI Obligations & Days Remaining
  const enrichedEmis = emis.map((emi) => {
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

  const unpaidUpcomingEMIs = enrichedEmis.filter((e) => e.status !== 'paid_this_cycle');
  let nextEMI = null;
  let totalUpcomingEMIAmount = 0;
  let daysUntilNextEMI = 10;

  if (unpaidUpcomingEMIs.length > 0) {
    unpaidUpcomingEMIs.sort((a, b) => a.daysRemaining - b.daysRemaining);
    nextEMI = unpaidUpcomingEMIs[0];
    totalUpcomingEMIAmount = unpaidUpcomingEMIs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    daysUntilNextEMI = nextEMI.daysRemaining !== undefined ? nextEMI.daysRemaining : 10;
  }

  // 3. Daily Discretionary Burn Rate & Safety Cushion
  // Normalize discretionary spend across a standard 30-day monthly window
  const dailyBurnRate = Math.max(300, Math.round(nonFixedDebitsSum / 30));
  const expectedNormalExpenses = Math.round(dailyBurnRate * Math.max(1, daysUntilNextEMI));
  const safetyReserve = 2000;
  const totalObligations = totalUpcomingEMIAmount + expectedNormalExpenses;
  const safeToSpend = Math.max(0, currentBalance - totalUpcomingEMIAmount - expectedNormalExpenses - safetyReserve);
  const balanceAfterObligations = currentBalance - totalUpcomingEMIAmount;

  // 4. Explainable Risk Classification & Guidance
  let status = 'SAFE'; // 'SAFE' | 'CAUTION' | 'HIGH RISK'
  let summary = '';
  let advice = '';
  let riskReason = '';
  let projectedShortfall = 0;

  if (unpaidUpcomingEMIs.length === 0) {
    status = 'SAFE';
    summary = 'You have no pending EMI obligations this cycle. Your full balance is available.';
    advice = 'Your finances look completely safe. Maintain your healthy savings rate.';
    riskReason = 'Zero pending debt obligations for the active billing cycle.';
  } else if (currentBalance < totalUpcomingEMIAmount) {
    status = 'HIGH RISK';
    projectedShortfall = totalUpcomingEMIAmount - currentBalance;
    summary = `Your current balance (₹${currentBalance.toLocaleString('en-IN')}) is below your upcoming ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI obligation due in ${daysUntilNextEMI} days.`;
    advice = `Immediate action needed: arrange ₹${projectedShortfall.toLocaleString('en-IN')} before your EMI due date and stop discretionary spending.`;
    riskReason = `Current available funds do not cover the principal EMI amount of ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')}.`;
  } else if (currentBalance < totalObligations) {
    status = 'HIGH RISK';
    projectedShortfall = totalObligations - currentBalance;
    summary = `Based on your normal daily spending (₹${dailyBurnRate.toLocaleString('en-IN')}/day), you may run short by approximately ₹${projectedShortfall.toLocaleString('en-IN')} before your ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI due in ${daysUntilNextEMI} days.`;
    advice = `Cap daily discretionary spending below ₹${Math.max(0, Math.round(balanceAfterObligations / Math.max(1, daysUntilNextEMI))).toLocaleString('en-IN')}/day to protect your EMI.`;
    riskReason = `Projected daily spending will consume the balance needed to settle the upcoming EMI.`;
  } else if (currentBalance < totalObligations + safetyReserve) {
    status = 'CAUTION';
    summary = `Your balance covers your ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI, but remaining buffer after expected expenses is narrow.`;
    advice = 'Avoid large non-essential purchases until after your EMI payment clears.';
    riskReason = 'Remaining cushion is smaller than the recommended ₹2,000 emergency buffer.';
  } else {
    status = 'SAFE';
    summary = `Your balance is fully sufficient for your upcoming ₹${totalUpcomingEMIAmount.toLocaleString('en-IN')} EMI and expected normal spending.`;
    advice = `Your upcoming EMI is protected. You can safely spend up to ₹${safeToSpend.toLocaleString('en-IN')} without putting your loan payment at risk.`;
    riskReason = `Available balance exceeds all upcoming loan installments, daily burn rate, and emergency buffer.`;
  }

  // 5. 7-Day Projected Daily Balance Outlook
  const projected7Days = [];
  let runningProjectedBalance = currentBalance;
  const now = new Date();

  for (let i = 0; i <= 7; i++) {
    const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfMonth = targetDate.getDate();
    const dayLabel = i === 0 ? 'Today' : `Day +${i}`;

    let dayEmiDeduction = 0;
    unpaidUpcomingEMIs.forEach((e) => {
      if (e.dueDay === dayOfMonth) {
        dayEmiDeduction += Number(e.amount) || 0;
      }
    });

    if (i > 0) {
      runningProjectedBalance = Math.max(0, runningProjectedBalance - dailyBurnRate - dayEmiDeduction);
    }

    projected7Days.push({
      day: i,
      label: dayLabel,
      date: targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      projectedBalance: runningProjectedBalance,
      burnDeduction: i === 0 ? 0 : dailyBurnRate,
      emiDeduction: dayEmiDeduction,
      status: runningProjectedBalance >= totalUpcomingEMIAmount ? 'safe' : 'risk',
    });
  }

  // 6. Income & Salary Cycle Replenishment
  const salaryDate = user.salaryDate || 1;
  const daysUntilSalary = getDaysUntil(salaryDate);
  const monthlyIncome = Number(user.monthlyIncome || 50000);

  // 7. Multi-Horizon Forecast (30, 60, 90 Days)
  const monthlyEmiTotal = emis.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyDiscretionary = dailyBurnRate * 30;
  const monthlyHousing = 10000; // Fixed baseline rent

  const forecastHorizons = [
    {
      horizonDays: 30,
      label: '30-Day Outlook',
      projectedInflow: monthlyIncome,
      projectedObligations: monthlyEmiTotal + monthlyHousing + monthlyDiscretionary,
      projectedNetEndingBalance: Math.max(0, currentBalance + monthlyIncome - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary)),
      confidence: 'High (Based on recurring cycle)',
    },
    {
      horizonDays: 60,
      label: '60-Day Outlook',
      projectedInflow: monthlyIncome * 2,
      projectedObligations: (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 2,
      projectedNetEndingBalance: Math.max(0, currentBalance + monthlyIncome * 2 - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 2),
      confidence: 'Medium (Assumes stable income & commitments)',
    },
    {
      horizonDays: 90,
      label: '90-Day Outlook',
      projectedInflow: monthlyIncome * 3,
      projectedObligations: (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 3,
      projectedNetEndingBalance: Math.max(0, currentBalance + monthlyIncome * 3 - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 3),
      confidence: 'Estimated (Longer range horizon)',
    },
  ];

  // 8. Upcoming Obligation Timeline Events
  const timelineEvents = [];
  unpaidUpcomingEMIs.forEach((e) => {
    timelineEvents.push({
      type: 'emi',
      title: `${e.name} (${e.lender})`,
      amount: Number(e.amount),
      daysRemaining: e.daysRemaining,
      dueDay: e.dueDay,
      tag: 'EMI Obligation',
      color: '#D97706',
    });
  });

  timelineEvents.push({
    type: 'salary',
    title: 'Salary Replenishment',
    amount: monthlyIncome,
    daysRemaining: daysUntilSalary,
    dueDay: salaryDate,
    tag: 'Expected Inflow',
    color: '#059669',
  });

  timelineEvents.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    currentBalance,
    estimatedCurrentBalance: currentBalance,
    verifiedBalance,
    lastBalanceCheckDate,
    creditsSinceCheck,
    debitsSinceCheck,
    totalUpcomingEMI: totalUpcomingEMIAmount,
    nextEMI,
    dailyBurnRate,
    expectedNormalExpenses,
    safetyReserve,
    totalObligations,
    safeToSpend,
    balanceAfterObligations,
    riskStatus: status,
    summary,
    advice,
    riskReason,
    projectedShortfall,
    categoryBreakdown,
    enrichedEmis,
    projected7Days,
    forecastHorizons,
    timelineEvents,
    salaryCycle: {
      salaryDate,
      daysUntilSalary,
      monthlyIncome,
    },
  };
};
