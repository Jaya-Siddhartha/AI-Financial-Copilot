// Credit health ESTIMATE on the 300–900 scale used in India. It is not a CIBIL/Experian score:
// bureaus use your full credit report. This looks only at what FinCopilot can see, weighted the
// way bureaus describe their main factors (repayment history matters most, then how much of
// your income goes to loans).

import { CATEGORIES } from './categories.js';

const PENALTY_WORDS = ['bounce', 'return charge', 'insufficient', 'penal', 'late fee', 'late payment', 'overdue charge', 'dishonour', 'ecs return', 'nach return'];

const band = (score) =>
  score >= 750 ? { label: 'Excellent', tone: 'green' } : score >= 700 ? { label: 'Good', tone: 'green' } : score >= 650 ? { label: 'Fair', tone: 'amber' } : { label: 'Needs work', tone: 'red' };

export const estimateCreditHealth = ({ analysis, transactions = [], profile }) => {
  const income = Number(profile.monthlyIncome) || 0;
  const activeEmis = analysis.emis.filter((e) => e.status !== 'closed');
  const monthlyEmi = activeEmis.reduce((s, e) => s + Number(e.amount), 0);
  const penalties = transactions.filter((t) => t.type === 'debit' && PENALTY_WORDS.some((w) => String(t.description).toLowerCase().includes(w))).length;
  const emiPaymentsMade = transactions.filter((t) => t.type === 'debit' && t.category === CATEGORIES.EMI).length;

  // 1. Repayment record (35%)
  const payment = Math.max(0, 1 - analysis.overdue.length * 0.35 - penalties * 0.1);
  // 2. Share of income going to EMIs (30%)
  const ratio = income > 0 ? monthlyEmi / income : null;
  const burden = ratio === null ? 0.5 : ratio <= 0.3 ? 1 : ratio <= 0.4 ? 0.8 : ratio <= 0.5 ? 0.55 : ratio <= 0.6 ? 0.35 : 0.15;
  // 3. Saving habit over recent months (15%)
  const months = analysis.trend.filter((m) => m.income > 0 || m.spent > 0).slice(-3);
  const inc = months.reduce((s, m) => s + m.income, 0) || income * months.length;
  const out = months.reduce((s, m) => s + m.spent, 0);
  const rate = inc > 0 && months.length ? (inc - out) / inc : null;
  const savings = rate === null ? 0.5 : rate >= 0.3 ? 1 : rate >= 0.2 ? 0.8 : rate >= 0.1 ? 0.6 : rate >= 0 ? 0.4 : 0.15;
  // 4. No bounced payments or penalty charges (10%)
  const stability = penalties === 0 ? 1 : penalties === 1 ? 0.6 : 0.3;
  // 5. Number of loans running at once (10%)
  const n = activeEmis.length;
  const loans = n <= 1 ? 1 : n === 2 ? 0.85 : n === 3 ? 0.65 : 0.45;

  // 6. Length of history seen (10%): bureaus reward a long, steady record.
  const monthsSeen = new Set(transactions.map((t) => String(t.date).slice(0, 7))).size;
  const history = monthsSeen >= 12 ? 1 : monthsSeen >= 6 ? 0.75 : monthsSeen >= 3 ? 0.5 : 0.3;

  const weighted = payment * 0.35 + burden * 0.25 + savings * 0.15 + stability * 0.1 + loans * 0.05 + history * 0.1;
  const score = Math.round(300 + 600 * weighted);
  const pct = (f) => Math.round(f * 100);

  const factors = [
    {
      name: 'Paying EMIs on time',
      weight: 35,
      score: pct(payment),
      note: analysis.overdue.length ? `${analysis.overdue.length} EMI late right now` : emiPaymentsMade ? `${emiPaymentsMade} EMI payments seen, none late now` : 'No late EMIs',
      tip: analysis.overdue.length ? 'Pay the late EMI first. A payment 30+ days late stays on your credit report for years.' : 'Keep it up. Turn on autopay so you never miss a date.',
    },
    {
      name: 'Share of income going to EMIs',
      weight: 25,
      score: pct(burden),
      note: ratio === null ? 'Add your monthly income' : `${Math.round(ratio * 100)}% of your income`,
      tip: ratio !== null && ratio > 0.4 ? 'Try to keep all EMIs under 40% of income before taking a new loan.' : 'Healthy. Lenders like to see this under 40%.',
    },
    {
      name: 'Saving each month',
      weight: 15,
      score: pct(savings),
      note: rate === null ? 'Not enough history yet' : `${Math.round(rate * 100)}% of income saved`,
      tip: rate !== null && rate < 0.2 ? 'Aim to save 20% of income. Start with a small automatic transfer on salary day.' : 'Good saving habit.',
    },
    {
      name: 'No bounced payments or penalties',
      weight: 10,
      score: pct(stability),
      note: penalties ? `${penalties} penalty or bounce charge found` : 'None found',
      tip: penalties ? 'Keep enough balance before autopay dates. Bounced EMIs hurt your score.' : 'Clean record.',
    },
    {
      name: 'Number of loans at once',
      weight: 5,
      score: pct(loans),
      note: `${n} active loan${n === 1 ? '' : 's'}`,
      tip: n >= 3 ? 'Close a small loan before opening another.' : 'Fine.',
    },
    {
      name: 'Length of history',
      weight: 10,
      score: pct(history),
      note: `${monthsSeen} month${monthsSeen === 1 ? '' : 's'} of transactions seen`,
      tip: monthsSeen < 6 ? 'Upload older statements: a longer steady record gives a truer picture.' : 'Good long record.',
    },
  ];

  const hasData = transactions.length >= 10 && income > 0;
  return { score, ...band(score), factors, confidence: hasData ? 'medium' : 'low' };
};
