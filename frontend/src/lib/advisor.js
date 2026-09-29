// Plain-language suggestions and answers built from the engine's numbers. Works with no AI model;
// the offline AI (lib/ai.js) uses the same facts to answer free-form questions.

import { inr } from './format.js';
import { emiBurden, loanSummary } from './emiCalc.js';
import { whatIf } from './engine.js';
import { scoreBand } from './creditReport.js';
import { goalPlan, GOAL_STATUS, monthlySurplus } from './goals.js';

const dayText = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const perDayText = (a) => (a.allowance && a.safeToSpend > 0 ? ` That is about ${inr(a.allowance.perDay)} a day for the next ${a.allowance.days} day${a.allowance.days === 1 ? '' : 's'} (until ${a.allowance.until}).` : '');

const listJoin = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] || '');

const when = (e) => (e.status === 'overdue' ? `${e.daysOverdue} day${e.daysOverdue === 1 ? '' : 's'} late` : e.daysRemaining === 0 ? 'due today' : e.daysRemaining === 1 ? 'due tomorrow' : `due in ${e.daysRemaining} days`);

// Ranked list of things worth doing now. tone: red (act now), amber (watch), green (good news).
export const suggestions = ({ analysis: a, profile, credit }) => {
  const list = [];
  for (const e of a.overdue) {
    list.push({ tone: 'red', title: `Pay your ${e.name} EMI now`, text: `${inr(e.amount)} is ${when(e)}. Late EMIs add fees and lower your credit score.` });
  }
  if (a.status === 'HIGH RISK' && a.nextEmi) {
    list.push({ tone: 'red', title: 'You may fall short for your next EMI', text: `You could be ${inr(a.shortBy)} short for ${a.nextEmi.name} (${inr(a.nextEmi.amount)}, ${when(a.nextEmi)}). Hold off on non-essential spending until it is paid.` });
  }
  if (!a.hasBalance) {
    list.push({ tone: 'amber', title: 'Add your bank balance', text: 'Enter the balance your bank shows so FinCopilot can work out what is safe to spend.' });
  }
  for (const e of a.emis.filter((x) => x.status === 'upcoming' && x.daysRemaining <= 3 && !x.autopay)) {
    list.push({ tone: 'amber', title: `${e.name} EMI ${when(e)}`, text: `Keep ${inr(e.amount)} in your account, or turn on autopay for it.` });
  }
  if (a.pace?.ahead) {
    list.push({ tone: 'amber', title: 'Spending faster than usual this month', text: `You have spent ${inr(a.pace.spentSoFar)} on everyday things so far; by this date you usually spend about ${inr(a.pace.usualByNow)}.` });
  }
  for (const s of a.spikes.slice(0, 2)) {
    list.push({ tone: 'amber', title: `More on ${s.category} this month`, text: `${inr(s.thisMonth)} so far against your usual ${inr(s.usual)} a month.` });
  }
  const monthlyEmi = a.emis.filter((e) => e.status !== 'closed').reduce((s, e) => s + Number(e.amount), 0);
  const burden = emiBurden(monthlyEmi, profile.monthlyIncome);
  if (burden.level === 'warn' || burden.level === 'bad') {
    list.push({ tone: burden.level === 'bad' ? 'red' : 'amber', title: 'EMIs take a big share of your income', text: `${Math.round(burden.ratio * 100)}% of your income goes to EMIs. Try to stay under 40% before taking another loan.` });
  }
  const subs = a.recurring.filter((r) => r.category === 'Entertainment' || r.amount < 1000);
  if (subs.length >= 2) {
    const total = subs.reduce((s, r) => s + r.amount, 0);
    list.push({ tone: 'amber', title: `${subs.length} repeating payments found`, text: `About ${inr(total)} a month on things like ${subs.slice(0, 3).map((r) => r.label).join(', ')}. Cancel any you no longer use.` });
  }
  if (!profile.bufferEnabled && Number(profile.monthlyIncome) > 0) {
    list.push({ tone: 'amber', title: 'No safety cushion set', text: `Keeping even ${inr(Math.round(profile.monthlyIncome * 0.05))} aside protects you from surprises. You can turn it on in Settings.` });
  }
  if (credit && credit.score < 700) {
    const weakest = [...credit.factors].sort((x, y) => x.score - y.score)[0];
    list.push({ tone: 'amber', title: 'Improve your credit health', text: weakest.tip });
  }
  if (a.status === 'SAFE' && a.hasBalance && !list.some((x) => x.tone === 'red')) {
    list.push({ tone: 'green', title: 'You are on track', text: a.nextEmi ? `Your EMIs are covered. You can spend up to ${inr(a.safeToSpend)}.` : `All EMIs are paid for now. You can spend up to ${inr(a.safeToSpend)}.` });
  }
  if (a.lowData) {
    list.push({ tone: 'amber', title: 'Upload a statement for better advice', text: 'Add a PhonePe, Google Pay, Paytm or bank statement so FinCopilot can learn your usual spending.' });
  }
  return list;
};

// Short summary of the user's money, used as the AI's only source of facts.
export const factSheet = ({ analysis: a, profile, credit, creditScores, goals }) => {
  const lines = [
    `Name: ${profile.fullName || 'User'}`,
    `Monthly income: ${inr(profile.monthlyIncome)}; salary day: ${profile.salaryDay}`,
    `Bank balance now: ${a.hasBalance ? inr(a.balance) : 'not set'}`,
    `Safe to spend now: ${a.safeToSpend === null ? 'unknown' : inr(a.safeToSpend)} (status ${a.status})`,
    `Safety cushion: ${a.buffer ? inr(a.buffer) : 'off'}`,
    `Usual everyday spending: ${inr(a.dailySpend)} per day`,
    `EMIs: ${a.emis.length ? a.emis.map((e) => `${e.name} ${inr(e.amount)} ${e.status === 'paid' ? 'paid this month' : e.status === 'closed' ? 'closed' : when(e)}${e.autopay ? ' (autopay)' : ''}`).join('; ') : 'none'}`,
    `EMIs still to pay this month: ${inr(a.totalDue)}`,
    `This month: spent ${inr(a.month.spent)}, received ${inr(a.month.income)}`,
    `Top spending (last 30 days): ${a.categoryBreakdown.slice(0, 5).map((c) => `${c.category} ${inr(c.amount)}`).join(', ') || 'none'}`,
    `Repeating payments: ${a.recurring.map((r) => `${r.label} ~${inr(r.amount)}`).join(', ') || 'none found'}`,
  ];
  if (a.pace) lines.push(`Everyday spending this month so far ${inr(a.pace.spentSoFar)}, usual by this date ${inr(a.pace.usualByNow)}`);
  if (a.allowance && a.safeToSpend > 0) lines.push(`Daily allowance: about ${inr(a.allowance.perDay)} a day for ${a.allowance.days} days until ${a.allowance.until}`);
  const real = creditScores?.[0];
  if (real) lines.push(`Real credit score (added by the user): ${real.bureau} ${real.score}/900 (${scoreBand(real.score).label}) on ${dayText(real.date)}`);
  if (credit) lines.push(`Estimated credit health: ${credit.score}/900 (${credit.label}), an estimate, not a bureau score`);
  if (goals?.length) {
    const surplus = monthlySurplus(a, profile);
    const items = goals.map((g) => {
      const p = goalPlan(g, surplus);
      return `${g.name} ${inr(p.saved)} of ${inr(p.target)}${p.months && p.left ? `, needs ${inr(p.perMonth)} a month` : ''}`;
    });
    lines.push(`Savings goals: ${items.join('; ')}`);
  }
  return lines.join('\n');
};

const amountIn = (text) => {
  const m = String(text).replace(/,/g, '').match(/(\d+(\.\d+)?)\s*(k|thousand|lakh|l)?\b/i);
  if (!m) return null;
  let n = Number(m[1]);
  const unit = (m[3] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') n *= 1000;
  if (unit === 'lakh' || unit === 'l') n *= 100000;
  return n;
};

// Which kind of question this is. Money decisions are always answered by the exact calculator,
// never by the language model.
export const DECISION_INTENTS = ['afford', 'loan', 'safe', 'emi', 'where', 'score', 'recurring', 'daily', 'goal'];

export const intentOf = (question) => {
  const q = String(question).toLowerCase();
  const amount = amountIn(q);
  if (/\b(loan|borrow|credit card|emi on|on (an )?emis?|in emis?|instal+ments?|no[- ]cost emi)\b/.test(q) && amount && /(take|get|should|borrow|apply|buy|purchase)/.test(q)) return 'loan';
  if (/afford|can i (buy|spend|pay)|should i (buy|spend)|good idea/.test(q) && amount) return 'afford';
  if (/(check|look at|watch).*(every ?day|daily)|one thing|where do i start/.test(q)) return 'daily';
  if (/safe|how much.*(spend|left)|spend.*today|budget/.test(q)) return 'safe';
  if (/emi|loan|due/.test(q)) return 'emi';
  if (/where|most|biggest|spent on|category|categories/.test(q)) return 'where';
  // "Why does my credit score matter?" is a question to explain, not a number to look up.
  if (/score|cibil|credit/.test(q) && /\b(why|explain|meaning|mean|matters?|important|how (does|do|is) .*(work|calculated|made))\b/.test(q)) return 'learnCredit';
  if (/score|cibil|credit|experian|equifax/.test(q)) return 'score';
  // "How are my goals going?" is a number question; "tips to reach my goal" is for the AI.
  if (/\bgoals?\b|saving (up )?for/.test(q) && !/\b(tips?|ideas?|ways?|advice|suggest)/.test(q)) return 'goal';
  if (/save|saving|cut|reduce/.test(q)) return 'save';
  if (/subscription|repeat|recurring/.test(q)) return 'recurring';
  return 'general';
};

// Answers questions directly from the numbers.
export const answer = (question, ctx) => {
  const q = String(question).toLowerCase();
  const { analysis: a, profile } = ctx;
  const amount = amountIn(q);
  const intent = intentOf(q);

  if (intent === 'loan') {
    const years = q.match(/(\d+)\s*(years?|yrs?)\b/);
    const monthsSaid = q.match(/(\d+)\s*months?\b/);
    const months = years ? Number(years[1]) * 12 : monthsSaid ? Number(monthsSaid[1]) : /\bloan\b/.test(q) ? 24 : 12;
    const loan = loanSummary(amount, 14, months);
    const current = a.emis.filter((e) => e.status !== 'closed').reduce((t, e) => t + Number(e.amount), 0);
    const burden = emiBurden(current + loan.emi, profile.monthlyIncome);
    const wants = /(trip|travel|holiday|vacation|phone|mobile|gadget|wedding|party|bike|shopping|gift)/.test(q);
    const parts = [`A loan of ${inr(amount)} over ${months} months at about 14% interest costs about ${inr(loan.emi)} a month, and ${inr(loan.totalInterest)} in interest overall.`];
    if (burden.ratio !== null) parts.push(`With your current EMIs, ${Math.round(burden.ratio * 100)}% of your income would go to EMIs (${burden.label.toLowerCase()}).`);
    if (wants) parts.push('For a want like this, saving up first is usually better than borrowing: you avoid the interest and keep your EMIs low.');
    else if (burden.level === 'warn' || burden.level === 'bad') parts.push('That is a lot of your income. Try a smaller amount or a longer period, or wait until another loan is closed.');
    else parts.push('It fits your income. Compare interest rates from a few lenders before you decide.');
    return parts.join(' ');
  }
  if (intent === 'daily') {
    if (!a.hasBalance) return 'Start by adding your bank balance on the Home screen. After that, just check the big "You can spend safely" number each day: if you stay under it, your EMIs are safe.';
    return `Just look at the big number on the Home screen: "You can spend safely". Today it is ${inr(a.safeToSpend)}.${perDayText(a)} If you spend less than that, your EMIs stay covered. Tap "Match with bank" once a week so the numbers stay right.`;
  }

  if (intent === 'afford') {
    const after = whatIf(ctx.engineInput, amount);
    if (!a.hasBalance) return 'First add your bank balance (Home → Update balance), then I can check this.';
    if (amount > a.balance) return `No. ${inr(amount)} is more than your balance of ${inr(a.balance)}.`;
    if (after.status === 'HIGH RISK') return `Not right now. Spending ${inr(amount)} could leave you ${inr(after.shortBy)} short for your ${a.nextEmi?.name || 'next'} EMI. Wait until it is paid.`;
    if (amount > a.safeToSpend) {
      const kept = [a.totalDue ? 'EMIs' : null, a.expectedSpend ? 'everyday needs' : null, a.buffer ? 'your safety cushion' : null].filter(Boolean);
      return `Not a good idea right now. ${inr(amount)} is ${inr(amount - a.safeToSpend)} more than you can safely spend (${inr(a.safeToSpend)}), so it would use money kept for ${listJoin(kept) || 'other things'}.`;
    }
    if (after.status === 'CAUTION') return `You can, but it is tight: your safe-to-spend would drop to ${inr(after.safeToSpend)} and your cushion gets thin.`;
    return `Yes. After spending ${inr(amount)}, you would still have ${inr(after.safeToSpend)} safe to spend and your EMIs stay covered.`;
  }
  if (intent === 'safe') {
    if (!a.hasBalance) return 'Add your bank balance first (Home → Update balance), and I will tell you how much is safe to spend.';
    const kept = [
      a.totalDue ? `${inr(a.totalDue)} for EMIs due in the next month` : null,
      a.expectedSpend ? `about ${inr(a.expectedSpend)} for everyday needs until the next EMI` : null,
      a.buffer ? `your ${inr(a.buffer)} cushion` : null,
    ].filter(Boolean);
    return `You can safely spend ${inr(a.safeToSpend)}.${kept.length ? ` That keeps ${listJoin(kept)} aside.` : ''}${a.nextEmi ? '' : ' No EMIs are waiting right now.'}${perDayText(a)}`;
  }
  if (intent === 'emi') {
    if (!a.emis.length) return 'You have no EMIs added. Add them in the EMIs tab so I can protect them.';
    return a.emis.map((e) => `${e.name}: ${inr(e.amount)}, ${e.status === 'paid' ? 'paid this month' : e.status === 'closed' ? 'closed' : when(e)}${e.autopay ? ' (autopay on)' : ''}.`).join(' ');
  }
  if (intent === 'where') {
    const top = a.categoryBreakdown.slice(0, 3);
    if (!top.length) return 'I do not see any spending in the last 30 days yet. Upload a statement or add expenses.';
    return `In the last 30 days you spent most on ${top.map((c) => `${c.category} (${inr(c.amount)})`).join(', ')}.`;
  }
  if (intent === 'save') {
    const tips = suggestions(ctx).filter((s) => s.tone !== 'green').slice(0, 3);
    const top = a.categoryBreakdown.find((c) => !['EMI & Loans', 'Rent & Housing', 'Savings & Investments'].includes(c.category));
    const parts = [];
    if (top) parts.push(`Your biggest everyday cost is ${top.category} at ${inr(top.amount)} in 30 days; cutting it by a fifth saves about ${inr(top.amount * 0.2)} a month.`);
    if (tips.length) parts.push(tips.map((t) => t.title).join('. ') + '.');
    parts.push(`Try moving ${inr(Math.round((profile.monthlyIncome || 0) * 0.1))} to savings on salary day, before you start spending.`);
    return parts.join(' ');
  }
  if (intent === 'score') {
    const real = ctx.creditScores?.[0];
    const weakest = ctx.credit ? [...ctx.credit.factors].sort((x, y) => x.score - y.score)[0] : null;
    const tip = weakest ? ` To improve it: ${weakest.tip}` : ' Pay every EMI and card bill on time, and keep card use low.';
    if (real) {
      const band = scoreBand(real.score);
      const prev = ctx.creditScores[1];
      const diff = prev ? real.score - prev.score : 0;
      const change = prev ? ` That is ${diff === 0 ? 'the same as' : `${Math.abs(diff)} points ${diff > 0 ? 'up' : 'down'} from`} your ${prev.bureau} ${prev.score} on ${dayText(prev.date)}.` : '';
      return `Your latest ${real.bureau} score is ${real.score} out of 900 (${band.label}), from ${dayText(real.date)}. ${band.note}${change}${tip}`;
    }
    const est = ctx.credit ? `Your estimated credit health is ${ctx.credit.score} out of 900 (${ctx.credit.label}), worked out from your data here. ` : '';
    return `${est}I cannot see your CIBIL score: bureaus only share it with lenders and licensed partners. Add it on the Credit score page by typing it in or uploading your free credit report PDF (each bureau gives one free report a year).${tip}`;
  }
  if (intent === 'learnCredit') {
    const real = ctx.creditScores?.[0];
    return `A credit score (300 to 900) tells banks how reliably you repay loans and cards. Above 750, loans are usually approved quickly and at lower interest; below 650, many lenders say no or charge more. What moves it most: paying every EMI and card bill on time, keeping credit card use low, not applying for many loans at once, and a long, steady record.${real ? ` Your latest ${real.bureau} score is ${real.score} (${scoreBand(real.score).label}).` : ' You can add yours on the Credit score page.'}`;
  }
  if (intent === 'goal') {
    const goals = ctx.goals || [];
    if (!goals.length) return 'You have no savings goals yet. Add one in Insights → Savings goals, for example an emergency fund of 3 months of expenses, and I will tell you how much to put aside each month.';
    const surplus = monthlySurplus(a, profile);
    const parts = goals.map((g) => {
      const p = goalPlan(g, surplus);
      if (p.status === 'done') return `${g.name}: reached (${inr(p.target)}).`;
      return `${g.name}: ${inr(p.saved)} of ${inr(p.target)} saved${p.months ? `, put aside ${inr(p.perMonth)} a month for ${p.months} month${p.months === 1 ? '' : 's'}` : ''} (${GOAL_STATUS[p.status].label.toLowerCase()}).`;
    });
    if (surplus !== null) parts.push(`You usually have about ${inr(Math.max(0, surplus))} left at the end of a month.`);
    return parts.join(' ');
  }
  if (intent === 'recurring') {
    if (!a.recurring.length) return 'I have not found repeating payments yet. They show up after two months of statements.';
    return `Repeating payments: ${a.recurring.map((r) => `${r.label} about ${inr(r.amount)}`).join(', ')}.`;
  }
  const top = suggestions(ctx)[0];
  return `${top ? `${top.title}. ${top.text}` : ''} You can ask me things like "How much can I spend?", "Can I afford 5000?", "Where does my money go?" or "How can I save more?"`.trim();
};
