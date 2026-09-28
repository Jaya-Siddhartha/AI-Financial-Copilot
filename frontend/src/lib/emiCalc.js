// Loan maths: monthly EMI, total interest, a yearly repayment schedule, and whether a new EMI
// fits your income.

// Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1), r = monthly rate.
export const emiFor = (principal, annualRatePct, months) => {
  const P = Number(principal) || 0;
  const n = Math.round(Number(months) || 0);
  const r = (Number(annualRatePct) || 0) / 12 / 100;
  if (P <= 0 || n <= 0) return 0;
  if (r === 0) return P / n;
  const f = (1 + r) ** n;
  return (P * r * f) / (f - 1);
};

export const loanSummary = (principal, annualRatePct, months) => {
  const emi = emiFor(principal, annualRatePct, months);
  const total = emi * Math.round(Number(months) || 0);
  return {
    emi: Math.round(emi),
    totalPayment: Math.round(total),
    totalInterest: Math.max(0, Math.round(total - (Number(principal) || 0))),
  };
};

// Principal and interest paid in each year of the loan, and what is still owed at year end.
export const yearlySchedule = (principal, annualRatePct, months) => {
  const n = Math.round(Number(months) || 0);
  const r = (Number(annualRatePct) || 0) / 12 / 100;
  const emi = emiFor(principal, annualRatePct, n);
  let owed = Number(principal) || 0;
  const years = [];
  for (let m = 1; m <= n; m++) {
    const interest = owed * r;
    const towardsPrincipal = Math.min(owed, emi - interest);
    owed = Math.max(0, owed - towardsPrincipal);
    const y = Math.ceil(m / 12);
    years[y - 1] ||= { year: y, principal: 0, interest: 0, owed: 0 };
    years[y - 1].principal += towardsPrincipal;
    years[y - 1].interest += interest;
    years[y - 1].owed = owed;
  }
  return years.map((y) => ({ year: y.year, principal: Math.round(y.principal), interest: Math.round(y.interest), owed: Math.round(y.owed) }));
};

// Share of monthly income going to EMIs. Lenders in India commonly cap this (FOIR) at 40–50%.
export const emiBurden = (totalMonthlyEmi, monthlyIncome) => {
  const income = Number(monthlyIncome) || 0;
  if (income <= 0) return { ratio: null, level: 'unknown', label: 'Add your monthly income to check this' };
  const ratio = (Number(totalMonthlyEmi) || 0) / income;
  if (ratio <= 0.3) return { ratio, level: 'good', label: 'Comfortable' };
  if (ratio <= 0.4) return { ratio, level: 'ok', label: 'Manageable' };
  if (ratio <= 0.5) return { ratio, level: 'warn', label: 'Stretched' };
  return { ratio, level: 'bad', label: 'Too high' };
};

// Paying a lump sum off the loan after `afterMonth` EMIs, keeping the EMI the same: how many
// months sooner it ends and how much interest is saved.
export const prepaymentSavings = (principal, annualRatePct, months, extra, afterMonth) => {
  const n = Math.round(Number(months) || 0);
  const r = (Number(annualRatePct) || 0) / 12 / 100;
  const emi = emiFor(principal, annualRatePct, n);
  const run = (lump) => {
    let owed = Number(principal) || 0;
    let interest = 0;
    let m = 0;
    // "After 0 EMIs" means paying the lump sum before the first EMI.
    if (lump > 0 && !(afterMonth > 0)) owed = Math.max(0, owed - lump);
    while (owed > 0.005 && m < 1200) {
      m += 1;
      const i = owed * r;
      interest += i;
      owed = Math.max(0, owed + i - emi);
      if (m === afterMonth && lump > 0) owed = Math.max(0, owed - lump);
    }
    return { months: m, interest };
  };
  const base = run(0);
  const after = run(Math.max(0, Number(extra) || 0));
  return {
    emi: Math.round(emi),
    monthsBefore: base.months,
    monthsAfter: after.months,
    monthsSaved: Math.max(0, base.months - after.months),
    interestSaved: Math.max(0, Math.round(base.interest - after.interest)),
  };
};
