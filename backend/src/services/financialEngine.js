import { CATEGORIES } from '../config/categories.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Spending older than this is ignored when working out the usual daily spend.
export const SPENDING_WINDOW_DAYS = 30;
export const MIN_DAILY_BURN = 300;
export const SAFETY_RESERVE = 2000;

// An EMI paid up to PAID_CYCLE_DAYS before a due date counts as paid for that due date.
const PAID_CYCLE_DAYS = 25;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// The due date for `dueDay` in a given month. A due day beyond the month's length
// (e.g. 31 in September) falls on the month's last day.
const dueDateIn = (year, month, dueDay) =>
  new Date(year, month, Math.min(Number(dueDay), daysInMonth(year, month)));

// Calculate days remaining until target day of month (1-31).
export const getDaysUntil = (dueDay, now = new Date()) => {
  const today = startOfDay(now);
  let due = dueDateIn(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) due = dueDateIn(today.getFullYear(), today.getMonth() + 1, dueDay);
  return Math.round((due - today) / DAY_MS);
};

const paidFor = (emi, dueDate) =>
  Boolean(emi.lastPaidDate) && new Date(emi.lastPaidDate).getTime() > dueDate.getTime() - PAID_CYCLE_DAYS * DAY_MS;

export const isPaidThisCycle = (emi, now = new Date()) => {
  const today = startOfDay(now);
  const next = new Date(today.getTime() + getDaysUntil(emi.dueDay, now) * DAY_MS);
  return paidFor(emi, next);
};

// Adds due-date countdown, reminder text and urgency level to an EMI record.
// status: 'upcoming' | 'overdue' | 'paid_this_cycle' | 'closed'
export const enrichEmi = (emi, now = new Date()) => {
  const plain = typeof emi.toObject === 'function' ? emi.toObject() : emi;
  const today = startOfDay(now);
  const dueDay = Number(plain.dueDay) || 1;
  const daysUntilNext = getDaysUntil(dueDay, now);
  const nextDue = new Date(today.getTime() + daysUntilNext * DAY_MS);
  const prevDue = dueDateIn(nextDue.getFullYear(), nextDue.getMonth() - 1, dueDay);
  const createdAt = plain.createdAt ? startOfDay(new Date(plain.createdAt)) : null;

  const closed = plain.remainingInstallments !== undefined && Number(plain.remainingInstallments) <= 0;
  // The previous due date has passed, the loan already existed then, and nothing was paid for it.
  const overdue = !closed && (!createdAt || prevDue >= createdAt) && !paidFor(plain, prevDue);
  const paid = !closed && !overdue && paidFor(plain, nextDue);
  const daysOverdue = overdue ? Math.round((today - prevDue) / DAY_MS) : 0;

  let status;
  let reminderBadge;
  let urgencyLevel;
  if (closed) {
    status = 'closed';
    reminderBadge = 'Loan closed';
    urgencyLevel = 'paid';
  } else if (overdue) {
    status = 'overdue';
    reminderBadge = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
    urgencyLevel = 'critical';
  } else if (paid) {
    status = 'paid_this_cycle';
    reminderBadge = 'Paid this month';
    urgencyLevel = 'paid';
  } else {
    status = 'upcoming';
    if (daysUntilNext === 0) reminderBadge = 'Due today';
    else if (daysUntilNext === 1) reminderBadge = 'Due tomorrow';
    else reminderBadge = `Due in ${daysUntilNext} days`;
    urgencyLevel = daysUntilNext <= 1 ? 'critical' : daysUntilNext <= 3 ? 'warning' : 'normal';
  }

  return {
    ...plain,
    status,
    // An overdue EMI is due now.
    daysRemaining: overdue ? 0 : daysUntilNext,
    daysOverdue,
    reminderBadge,
    urgencyLevel,
  };
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

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// Central Financial Calculation Engine
export const analyzeFinancialState = ({
  user = {},
  account = {},
  transactions = [],
  emis = [],
  extraHypotheticalExpense = 0,
  now = new Date(),
}) => {
  const baseBalance = Number(account.currentBalance ?? 50000);
  const currentBalance = Math.max(0, baseBalance - Number(extraHypotheticalExpense || 0));
  const verifiedBalance = Number(account.verifiedBalance ?? baseBalance);
  const lastBalanceCheckDate = account.lastBalanceCheckDate || now.toISOString();

  // 1. Transactions since the last balance check, and spending in the recent window
  const checkTime = new Date(lastBalanceCheckDate).getTime();
  const windowStart = now.getTime() - SPENDING_WINDOW_DAYS * DAY_MS;
  let creditsSinceCheck = 0;
  let debitsSinceCheck = 0;
  let totalDebitSum = 0;
  let nonFixedDebitsSum = 0;
  let housingDebitsSum = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const txTime = new Date(tx.date).getTime();
    const inWindow = txTime >= windowStart;

    if (tx.type === 'debit') {
      if (inWindow) {
        totalDebitSum += amt;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;
        if (!isFixedCategory(tx.category)) {
          nonFixedDebitsSum += amt;
        } else if (tx.category === CATEGORIES.HOUSING) {
          housingDebitsSum += amt;
        }
      }
      if (txTime > checkTime) {
        debitsSinceCheck += amt;
      }
    } else if (tx.type === 'credit') {
      if (txTime > checkTime) {
        creditsSinceCheck += amt;
      }
    }
  });

  // Category breakdown for charts (last 30 days)
  const categoryBreakdown = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalDebitSum > 0 ? Math.round((categoryMap[cat] / totalDebitSum) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 2. EMI Obligations & Days Remaining
  const enrichedEmis = emis.map((e) => enrichEmi(e, now));

  const unpaidEMIs = enrichedEmis.filter((e) => e.status === 'upcoming' || e.status === 'overdue');
  const overdueEMIs = enrichedEmis.filter((e) => e.status === 'overdue');
  let nextEMI = null;
  let totalUpcomingEMIAmount = 0;
  let daysUntilNextEMI = 10;

  if (unpaidEMIs.length > 0) {
    unpaidEMIs.sort((a, b) => a.daysRemaining - b.daysRemaining || b.daysOverdue - a.daysOverdue);
    nextEMI = unpaidEMIs[0];
    totalUpcomingEMIAmount = unpaidEMIs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    daysUntilNextEMI = nextEMI.daysRemaining;
  }

  // 3. Daily Discretionary Burn Rate & Safety Cushion
  // Everyday (non-fixed) spending over the last 30 days, per day.
  const dailyBurnRate = Math.max(MIN_DAILY_BURN, Math.round(nonFixedDebitsSum / SPENDING_WINDOW_DAYS));
  const expectedNormalExpenses = Math.round(dailyBurnRate * Math.max(1, daysUntilNextEMI));
  const safetyReserve = SAFETY_RESERVE;
  const totalObligations = totalUpcomingEMIAmount + expectedNormalExpenses;
  const safeToSpend = Math.max(0, currentBalance - totalUpcomingEMIAmount - expectedNormalExpenses - safetyReserve);
  const balanceAfterObligations = currentBalance - totalUpcomingEMIAmount;

  // 4. Explainable Risk Classification & Guidance
  let status = 'SAFE'; // 'SAFE' | 'CAUTION' | 'HIGH RISK'
  let summary = '';
  let advice = '';
  let riskReason = '';
  let projectedShortfall = 0;
  const dueWhen = daysUntilNextEMI === 0 ? 'due now' : `due in ${daysUntilNextEMI} day${daysUntilNextEMI === 1 ? '' : 's'}`;

  if (unpaidEMIs.length === 0) {
    status = 'SAFE';
    summary = 'You have no EMIs left to pay this month. Your balance is free to use.';
    advice = 'You are in good shape. Keep a little aside for surprises.';
    riskReason = 'No EMI payments are pending this month.';
  } else if (currentBalance < totalUpcomingEMIAmount) {
    status = 'HIGH RISK';
    projectedShortfall = totalUpcomingEMIAmount - currentBalance;
    summary = `Your balance (${rupees(currentBalance)}) is less than the ${rupees(totalUpcomingEMIAmount)} you owe in EMIs, ${dueWhen}.`;
    advice = `Add ${rupees(projectedShortfall)} before the due date and stop non-essential spending.`;
    riskReason = `Your balance does not cover your EMIs of ${rupees(totalUpcomingEMIAmount)}.`;
  } else if (currentBalance < totalObligations) {
    status = 'HIGH RISK';
    projectedShortfall = totalObligations - currentBalance;
    summary = `At your usual spending of ${rupees(dailyBurnRate)} a day, you could be ${rupees(projectedShortfall)} short for your ${rupees(totalUpcomingEMIAmount)} EMI, ${dueWhen}.`;
    advice = `Try to keep daily spending under ${rupees(Math.max(0, balanceAfterObligations / Math.max(1, daysUntilNextEMI)))} a day until your EMI is paid.`;
    riskReason = 'Your usual spending would use up the money needed for the EMI.';
  } else if (currentBalance < totalObligations + safetyReserve) {
    status = 'CAUTION';
    summary = `You can pay your ${rupees(totalUpcomingEMIAmount)} EMI, but very little is left over after everyday spending.`;
    advice = 'Avoid big purchases until your EMI is paid.';
    riskReason = `Less than the ${rupees(safetyReserve)} safety cushion would be left.`;
  } else {
    status = 'SAFE';
    summary = `You have enough for your ${rupees(totalUpcomingEMIAmount)} EMI and your everyday spending.`;
    advice = `You can spend up to ${rupees(safeToSpend)} without putting your EMI at risk.`;
    riskReason = 'Your balance covers your EMIs, your usual spending and a safety cushion.';
  }

  // A missed EMI always needs attention, even when the balance covers it.
  if (overdueEMIs.length > 0) {
    const late = overdueEMIs[0];
    if (status === 'SAFE') status = 'CAUTION';
    advice = `Your ${late.name} EMI is ${late.daysOverdue} day${late.daysOverdue === 1 ? '' : 's'} late. Pay it now to avoid late fees. ${advice}`;
  }

  // 5. 7-Day Projected Daily Balance Outlook
  const projected7Days = [];
  let runningProjectedBalance = currentBalance;

  for (let i = 0; i <= 7; i++) {
    const targetDate = new Date(now.getTime() + i * DAY_MS);
    const dayOfMonth = targetDate.getDate();
    const monthLength = daysInMonth(targetDate.getFullYear(), targetDate.getMonth());
    const dayLabel = i === 0 ? 'Today' : `Day +${i}`;

    let dayEmiDeduction = 0;
    unpaidEMIs.forEach((e) => {
      // Overdue EMIs are assumed to be paid tomorrow; others on their (month-clamped) due day.
      const dueToday = e.status === 'overdue' ? i === 1 : Math.min(Number(e.dueDay), monthLength) === dayOfMonth;
      if (dueToday) dayEmiDeduction += Number(e.amount) || 0;
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
      emiDeduction: i === 0 ? 0 : dayEmiDeduction,
      status: runningProjectedBalance >= totalUpcomingEMIAmount ? 'safe' : 'risk',
    });
  }

  // 6. Income & Salary Cycle Replenishment
  const salaryDate = user.salaryDate || 1;
  const daysUntilSalary = getDaysUntil(salaryDate, now);
  const monthlyIncome = Number(user.monthlyIncome || 50000);

  // 7. Multi-Horizon Forecast (30, 60, 90 Days). Ending balances can be negative: that is a shortfall.
  const monthlyEmiTotal = enrichedEmis
    .filter((e) => e.status !== 'closed')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyDiscretionary = dailyBurnRate * 30;
  const monthlyHousing = housingDebitsSum; // Rent paid in the last 30 days
  const monthlyOut = monthlyEmiTotal + monthlyHousing + monthlyDiscretionary;

  const forecastHorizons = [
    [30, 'High (Based on recurring cycle)'],
    [60, 'Medium (Assumes stable income & commitments)'],
    [90, 'Estimated (Longer range horizon)'],
  ].map(([horizonDays, confidence]) => {
    const months = horizonDays / 30;
    const ending = currentBalance + monthlyIncome * months - monthlyOut * months;
    return {
      horizonDays,
      label: `${horizonDays}-Day Outlook`,
      projectedInflow: monthlyIncome * months,
      projectedObligations: monthlyOut * months,
      projectedNetEndingBalance: ending,
      shortfall: ending < 0,
      confidence,
    };
  });

  // 8. Upcoming Obligation Timeline Events
  const timelineEvents = unpaidEMIs.map((e) => ({
    type: 'emi',
    title: `${e.name} (${e.lender})`,
    amount: Number(e.amount),
    daysRemaining: e.daysRemaining,
    dueDay: e.dueDay,
    overdue: e.status === 'overdue',
    tag: e.status === 'overdue' ? 'Overdue EMI' : 'EMI Obligation',
  }));

  timelineEvents.push({
    type: 'salary',
    title: 'Salary',
    amount: monthlyIncome,
    daysRemaining: daysUntilSalary,
    dueDay: salaryDate,
    tag: 'Expected Inflow',
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
    overdueCount: overdueEMIs.length,
    dailyBurnRate,
    discretionarySpend: nonFixedDebitsSum,
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
