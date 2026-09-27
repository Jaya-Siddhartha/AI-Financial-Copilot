// Re-runs the backend's safe-to-spend rules for a hypothetical extra expense, using the
// metrics the dashboard API already computed (burn rate, EMIs, buffer). Mirrors
// analyzeFinancialState() in backend/src/services/financialEngine.js.

export const simulateSpend = (metrics = {}, extraSpend = 0) => {
  const balance = Math.max(0, (Number(metrics.currentBalance) || 0) - (Number(extraSpend) || 0));
  const emi = Number(metrics.totalUpcomingEMI) || 0;
  const expected = Number(metrics.expectedNormalExpenses) || 0;
  const reserve = Number(metrics.safetyReserve) || 0;
  const hasUpcomingEmi = Boolean(metrics.nextEMI);

  let status = 'SAFE';
  if (hasUpcomingEmi) {
    if (balance < emi + expected) status = 'HIGH RISK';
    else if (balance < emi + expected + reserve) status = 'CAUTION';
  }

  return {
    balance,
    status,
    safeToSpend: Math.max(0, balance - emi - expected - reserve),
    shortfall: hasUpcomingEmi ? Math.max(0, emi + expected - balance) : 0,
  };
};
