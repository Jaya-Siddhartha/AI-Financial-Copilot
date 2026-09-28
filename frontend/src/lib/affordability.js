// Predicts what the dashboard will show after an extra discretionary payment, using the
// metrics the dashboard API already computed. Mirrors analyzeFinancialState() in
// backend/src/services/financialEngine.js, including the fact that the payment is added to
// the spending used for the daily burn rate (discretionary spend ÷ 30, minimum ₹300/day).

const MIN_DAILY_BURN = 300;

export const simulateSpend = (metrics = {}, extraSpend = 0) => {
  const extra = Number(extraSpend) || 0;
  const balance = Math.max(0, (Number(metrics.currentBalance) || 0) - extra);
  const emi = Number(metrics.totalUpcomingEMI) || 0;
  const reserve = Number(metrics.safetyReserve) || 0;
  const hasUpcomingEmi = Boolean(metrics.nextEMI);
  const days = Math.max(1, hasUpcomingEmi ? Number(metrics.nextEMI.daysRemaining) || 0 : 10);

  // Older API responses without discretionarySpend: keep the current burn rate.
  const dailyBurnRate =
    metrics.discretionarySpend === undefined
      ? Number(metrics.dailyBurnRate) || MIN_DAILY_BURN
      : Math.max(MIN_DAILY_BURN, Math.round((Number(metrics.discretionarySpend) + extra) / 30));
  const expected = dailyBurnRate * days;

  let status = 'SAFE';
  if (hasUpcomingEmi) {
    if (balance < emi + expected) status = 'HIGH RISK';
    else if (balance < emi + expected + reserve) status = 'CAUTION';
  }
  // A late EMI keeps the status at Caution or worse.
  if (status === 'SAFE' && Number(metrics.overdueCount) > 0) status = 'CAUTION';

  return {
    balance,
    status,
    dailyBurnRate,
    safeToSpend: Math.max(0, balance - emi - expected - reserve),
    shortfall: hasUpcomingEmi ? Math.max(0, emi + expected - balance) : 0,
  };
};
