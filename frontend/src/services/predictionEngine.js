// Client-Side AI Financial Prediction & Safe-to-Spend Engine

export const calculatePrediction = ({
  currentBalance = 50000,
  emis = [],
  transactions = [],
  safetyBuffer = 2000,
  extraHypotheticalExpense = 0,
}) => {
  const balance = Math.max(0, currentBalance - extraHypotheticalExpense);

  // 1. Calculate active non-paid EMIs
  const upcomingEMIs = emis.filter((e) => e.status !== 'paid_this_cycle');

  let nextEMI = null;
  let totalEMIAmount = 0;
  let daysUntilEMI = 10;

  if (upcomingEMIs.length > 0) {
    const sorted = [...upcomingEMIs].sort((a, b) => (a.daysRemaining || 10) - (b.daysRemaining || 10));
    nextEMI = sorted[0];
    totalEMIAmount = upcomingEMIs.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    daysUntilEMI = nextEMI.daysRemaining !== undefined ? nextEMI.daysRemaining : 10;
  }

  // 2. Compute Daily Burn Rate from non-EMI, non-fixed debits
  let nonFixedDebits = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'debit' && tx.category !== 'EMI' && tx.category !== 'Housing & Rent') {
      nonFixedDebits += Number(tx.amount) || 0;
    }
  });

  const dailyBurnRate = Math.max(500, Math.round(nonFixedDebits / 7));
  const estimatedExpenses = Math.round(dailyBurnRate * Math.max(1, daysUntilEMI));
  const totalRequired = totalEMIAmount + estimatedExpenses;
  const safeToSpend = Math.max(0, balance - totalEMIAmount - estimatedExpenses - safetyBuffer);
  const projectedBufferOrShortfall = balance - totalRequired;

  // 3. Determine Risk Status
  let status = 'SAFE'; // 'SAFE' | 'CAUTION' | 'HIGH RISK'
  let summary = '';
  let recommendation = '';

  if (upcomingEMIs.length === 0) {
    status = 'SAFE';
    summary = 'No pending EMI obligations this cycle. Full balance is available.';
    recommendation = 'Maintain your healthy savings rate.';
  } else if (balance < totalEMIAmount) {
    status = 'HIGH RISK';
    const shortfall = totalEMIAmount - balance;
    summary = `⚠️ Critical Shortfall: Current balance is ₹${shortfall.toLocaleString('en-IN')} below your required EMI obligation of ₹${totalEMIAmount.toLocaleString('en-IN')} due in ${daysUntilEMI} days.`;
    recommendation = 'Immediate funding required. Pause all non-essential spending.';
  } else if (balance < totalRequired) {
    status = 'HIGH RISK';
    const projectedShortfall = Math.abs(projectedBufferOrShortfall);
    summary = `⚠️ EMI Risk Detected: Based on your current spending rate (₹${dailyBurnRate.toLocaleString('en-IN')}/day), you may be short by approximately ₹${projectedShortfall.toLocaleString('en-IN')} before the ₹${totalEMIAmount.toLocaleString('en-IN')} EMI due in ${daysUntilEMI} days.`;
    recommendation = `Reduce daily discretionary spending below ₹${Math.max(0, Math.round((balance - totalEMIAmount) / daysUntilEMI)).toLocaleString('en-IN')}/day to protect your EMI.`;
  } else if (balance < totalRequired + safetyBuffer) {
    status = 'CAUTION';
    summary = `Tight Balance: Your balance will cover the ₹${totalEMIAmount.toLocaleString('en-IN')} EMI, but remaining safety buffer is narrow before ${daysUntilEMI} days.`;
    recommendation = 'Avoid large discretionary purchases until after the EMI clears.';
  } else {
    status = 'SAFE';
    summary = `Your balance is sufficient for the upcoming ₹${totalEMIAmount.toLocaleString('en-IN')} EMI and expected daily spending.`;
    recommendation = `Safe to spend up to ₹${safeToSpend.toLocaleString('en-IN')} without endangering your upcoming EMI.`;
  }

  return {
    status,
    summary,
    recommendation,
    currentBalance: balance,
    upcomingEMIAmount: totalEMIAmount,
    daysUntilEMI,
    dailyBurnRate,
    estimatedExpenses,
    safetyBuffer,
    totalRequired,
    safeToSpend,
    projectedBufferOrShortfall,
    nextEMI,
  };
};
