import { isFixedExpense } from '../constants/categories';

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

// Client-Side AI Financial Prediction, Forecasting & Safe-to-Spend Engine
export const calculatePrediction = ({
  currentBalance = 50000,
  emis = [],
  transactions = [],
  safetyBuffer = 2000,
  extraHypotheticalExpense = 0,
  user = {},
}) => {
  const baseBalance = Number(currentBalance);
  const balance = Math.max(0, baseBalance - Number(extraHypotheticalExpense || 0));

  // 1. Calculate active non-paid EMIs
  const upcomingEMIs = emis.filter((e) => e.status !== 'paid_this_cycle');

  let nextEMI = null;
  let totalEMIAmount = 0;
  let daysUntilEMI = 10;

  if (upcomingEMIs.length > 0) {
    const sorted = [...upcomingEMIs].sort((a, b) => {
      const aDays = a.daysRemaining !== undefined ? a.daysRemaining : getDaysUntil(a.dueDay || 10);
      const bDays = b.daysRemaining !== undefined ? b.daysRemaining : getDaysUntil(b.dueDay || 10);
      return aDays - bDays;
    });
    nextEMI = sorted[0];
    totalEMIAmount = upcomingEMIs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    daysUntilEMI = nextEMI.daysRemaining !== undefined ? nextEMI.daysRemaining : getDaysUntil(nextEMI.dueDay || 10);
  }

  // 2. Compute Daily Burn Rate from non-EMI, non-fixed debits
  let nonFixedDebits = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'debit' && !isFixedExpense(tx.category)) {
      nonFixedDebits += Number(tx.amount) || 0;
    }
  });

  const dailyBurnRate = Math.max(300, Math.round(nonFixedDebits / 30));
  const estimatedExpenses = Math.round(dailyBurnRate * Math.max(1, daysUntilEMI));
  const totalRequired = totalEMIAmount + estimatedExpenses;
  const safeToSpend = Math.max(0, balance - totalEMIAmount - estimatedExpenses - safetyBuffer);
  const balanceAfterObligations = balance - totalEMIAmount;
  const projectedBufferOrShortfall = balance - totalRequired;

  // 3. Determine Risk Status
  let status = 'SAFE'; // 'SAFE' | 'CAUTION' | 'HIGH RISK'
  let summary = '';
  let recommendation = '';
  let riskReason = '';
  let projectedShortfall = 0;

  if (upcomingEMIs.length === 0) {
    status = 'SAFE';
    summary = 'No pending EMI obligations this cycle. Full balance is available.';
    recommendation = 'Maintain your healthy savings rate.';
    riskReason = 'Zero pending debt obligations for the active billing cycle.';
  } else if (balance < totalEMIAmount) {
    status = 'HIGH RISK';
    projectedShortfall = totalEMIAmount - balance;
    summary = `Critical Shortfall: Current balance is ₹${projectedShortfall.toLocaleString('en-IN')} below your required ₹${totalEMIAmount.toLocaleString('en-IN')} EMI obligation due in ${daysUntilEMI} days.`;
    recommendation = 'Immediate funding required. Pause all non-essential spending.';
    riskReason = `Current balance fails to cover the upcoming EMI obligation of ₹${totalEMIAmount.toLocaleString('en-IN')}.`;
  } else if (balance < totalRequired) {
    status = 'HIGH RISK';
    projectedShortfall = Math.abs(projectedBufferOrShortfall);
    summary = `EMI Risk Detected: Based on normal spending (₹${dailyBurnRate.toLocaleString('en-IN')}/day), you may run short by approximately ₹${projectedShortfall.toLocaleString('en-IN')} before your ₹${totalEMIAmount.toLocaleString('en-IN')} EMI due in ${daysUntilEMI} days.`;
    recommendation = `Reduce daily discretionary spending below ₹${Math.max(0, Math.round(balanceAfterObligations / Math.max(1, daysUntilEMI))).toLocaleString('en-IN')}/day to protect your EMI.`;
    riskReason = 'Projected daily spending will consume the balance required for the upcoming EMI.';
  } else if (balance < totalRequired + safetyBuffer) {
    status = 'CAUTION';
    summary = `Tight Balance: Your balance will cover the ₹${totalEMIAmount.toLocaleString('en-IN')} EMI, but remaining safety buffer is narrow before ${daysUntilEMI} days.`;
    recommendation = 'Avoid large discretionary purchases until after the EMI clears.';
    riskReason = 'Remaining buffer is below the ₹2,000 emergency threshold.';
  } else {
    status = 'SAFE';
    summary = `Your balance is fully sufficient for the upcoming ₹${totalEMIAmount.toLocaleString('en-IN')} EMI and expected daily spending.`;
    recommendation = `Safe to spend up to ₹${safeToSpend.toLocaleString('en-IN')} without endangering your upcoming EMI.`;
    riskReason = 'Available balance comfortably exceeds all upcoming EMIs, expected daily burn rate, and emergency buffer.';
  }

  // 4. 7-Day Projected Outlook
  const projected7Days = [];
  let runningProjectedBalance = balance;
  const now = new Date();

  for (let i = 0; i <= 7; i++) {
    const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfMonth = targetDate.getDate();
    const dayLabel = i === 0 ? 'Today' : `Day +${i}`;

    let dayEmiDeduction = 0;
    upcomingEMIs.forEach((e) => {
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
      status: runningProjectedBalance >= totalEMIAmount ? 'safe' : 'risk',
    });
  }

  // 5. Multi-Horizon Forecasts (30, 60, 90 Days)
  const monthlyIncome = Number(user.monthlyIncome || 50000);
  const monthlyEmiTotal = emis.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyDiscretionary = dailyBurnRate * 30;
  const monthlyHousing = 10000;

  const forecastHorizons = [
    {
      horizonDays: 30,
      label: '30-Day Outlook',
      projectedInflow: monthlyIncome,
      projectedObligations: monthlyEmiTotal + monthlyHousing + monthlyDiscretionary,
      projectedNetEndingBalance: Math.max(0, balance + monthlyIncome - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary)),
      confidence: 'High (Based on recurring cycle)',
    },
    {
      horizonDays: 60,
      label: '60-Day Outlook',
      projectedInflow: monthlyIncome * 2,
      projectedObligations: (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 2,
      projectedNetEndingBalance: Math.max(0, balance + monthlyIncome * 2 - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 2),
      confidence: 'Medium (Assumes stable commitments)',
    },
    {
      horizonDays: 90,
      label: '90-Day Outlook',
      projectedInflow: monthlyIncome * 3,
      projectedObligations: (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 3,
      projectedNetEndingBalance: Math.max(0, balance + monthlyIncome * 3 - (monthlyEmiTotal + monthlyHousing + monthlyDiscretionary) * 3),
      confidence: 'Estimated (Extended horizon)',
    },
  ];

  return {
    status,
    summary,
    recommendation,
    riskReason,
    currentBalance: balance,
    upcomingEMIAmount: totalEMIAmount,
    daysUntilEMI,
    dailyBurnRate,
    estimatedExpenses,
    safetyBuffer,
    totalRequired,
    safeToSpend,
    balanceAfterObligations,
    projectedBufferOrShortfall,
    projectedShortfall,
    nextEMI,
    projected7Days,
    forecastHorizons,
  };
};
