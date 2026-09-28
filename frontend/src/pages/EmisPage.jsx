import React, { useMemo, useState } from 'react';
import { Calculator, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { emiBurden, loanSummary, prepaymentSavings, yearlySchedule } from '../lib/emiCalc';
import { dueText, inr, ordinal } from '../lib/format';

const STATUS = {
  overdue: { label: 'Late', tone: 'red' },
  upcoming: { label: 'To pay', tone: 'brand' },
  paid: { label: 'Paid', tone: 'green' },
  closed: { label: 'Closed', tone: 'green' },
};

function EmiList({ data, analysis: a, actions }) {
  const active = a.emis.filter((e) => e.status !== 'closed');
  const monthly = active.reduce((s, e) => s + Number(e.amount), 0);
  const burden = emiBurden(monthly, data.profile.monthlyIncome);

  const toggleAutopay = async (emi) => {
    try {
      await actions.saveEmi({ id: emi.id, autopay: !emi.autopay });
      actions.notify(emi.autopay ? `Autopay off for ${emi.name}` : `Autopay on: ${emi.name} will be recorded on its due date`);
    } catch (err) {
      actions.fail(err);
    }
  };

  const remove = (emi) =>
    actions.confirm({
      title: `Delete ${emi.name}?`,
      message: 'It will no longer be kept aside in "safe to spend". Past payments stay in your history.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await actions.deleteEmi(emi);
        actions.closeSheet();
        actions.notify(`${emi.name} deleted`);
      },
    });

  return (
    <>
      <section className="card summary frame">
        <div className="eyebrow">EMIs every month</div>
        <div className="summary-value">{inr(monthly)}</div>
        <div className="summary-stats">
          <div><div className="summary-stat-label">Loans</div><div className="summary-stat-value">{active.length}</div></div>
          <div><div className="summary-stat-label">Still to pay now</div><div className="summary-stat-value">{inr(a.totalDue)}</div></div>
          <div><div className="summary-stat-label">Of income</div><div className="summary-stat-value">{burden.ratio === null ? '—' : `${Math.round(burden.ratio * 100)}%`}</div></div>
        </div>
        {burden.ratio !== null && (
          <div className={`burden ${burden.level}`}>
            <div className="progress"><span style={{ width: `${Math.min(100, burden.ratio * 100 * 1.6)}%` }} /></div>
            <span>{burden.label}. Try to keep EMIs under 40% of income.</span>
          </div>
        )}
      </section>

      <section className="card">
        {a.emis.length === 0 ? (
          <div className="empty">
            No EMIs yet. Add your loans so FinCopilot can keep money aside for them and remind you before they are due.
            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => actions.editEmi()}>
              <Plus size={18} /> Add an EMI
            </button>
          </div>
        ) : (
          a.emis.map((emi) => {
            const st = STATUS[emi.status];
            const total = Number(emi.totalMonths) || 0;
            const known = emi.remainingMonths !== null && emi.remainingMonths !== undefined && emi.remainingMonths !== '';
            const done = total && known ? Math.min(1, Math.max(0, (total - Number(emi.remainingMonths)) / total)) : null;
            return (
              <article className={`emi ${emi.status === 'overdue' ? 'late' : ''}`} key={emi.id}>
                <div className="emi-top">
                  <span className={`icon-circle ${emi.status === 'overdue' ? 'danger' : ''}`}><HandCoins size={22} /></span>
                  <div className="row-main">
                    <div className="row-title">{emi.name}</div>
                    <div className="row-sub">{emi.lender ? `${emi.lender} · ` : ''}{ordinal(emi.dueDay)} of every month</div>
                  </div>
                  <span className={`chip ${st.tone}`}>{emi.status === 'upcoming' ? dueText(emi.daysRemaining, emi) : emi.status === 'overdue' ? `${emi.daysOverdue} day${emi.daysOverdue === 1 ? '' : 's'} late` : st.label}</span>
                </div>
                <div className="emi-foot">
                  <div className="emi-amount">{inr(emi.amount)}</div>
                  <span className="muted small">
                    {known ? `${emi.remainingMonths} month${Number(emi.remainingMonths) === 1 ? '' : 's'} left` : 'Months left not set'}
                    {done !== null && ` · ${Math.round(done * 100)}% repaid`}
                  </span>
                </div>
                {done !== null && <div className="progress"><span style={{ width: `${done * 100}%` }} /></div>}
                <div className="emi-foot">
                  <label className="switch">
                    <input type="checkbox" checked={emi.autopay} onChange={() => toggleAutopay(emi)} />
                    <span className="switch-ui" aria-hidden="true" />
                    <span>Autopay</span>
                  </label>
                  <div className="emi-actions">
                    <button type="button" className="icon-btn" aria-label={`Edit ${emi.name}`} onClick={() => actions.editEmi(emi)}><Pencil size={20} /></button>
                    <button type="button" className="icon-btn" aria-label={`Delete ${emi.name}`} onClick={() => remove(emi)}><Trash2 size={20} /></button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={emi.status === 'paid' || emi.status === 'closed'} onClick={() => actions.payEmi(emi)}>
                      {emi.status === 'paid' ? 'Paid' : emi.status === 'closed' ? 'Closed' : 'Mark paid'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
      <p className="muted small">
        Autopay: when the due date arrives, FinCopilot records the EMI as paid in your history automatically (your bank does the actual debit). Turn it off for EMIs you pay by hand.
      </p>
    </>
  );
}

function EmiCalculator({ data, analysis: a, actions }) {
  const [principal, setPrincipal] = useState('500000');
  const [rate, setRate] = useState('10.5');
  const [years, setYears] = useState('3');
  const months = Math.round((Number(years) || 0) * 12);
  const result = useMemo(() => loanSummary(principal, rate, months), [principal, rate, months]);
  const schedule = useMemo(() => (months > 0 && months <= 600 ? yearlySchedule(principal, rate, months) : []), [principal, rate, months]);
  const existing = a.emis.filter((e) => e.status !== 'closed').reduce((s, e) => s + Number(e.amount), 0);
  const burden = emiBurden(existing + result.emi, data.profile.monthlyIncome);
  const interestShare = result.totalPayment ? result.totalInterest / result.totalPayment : 0;
  const valid = Number(principal) > 0 && months > 0 && months <= 600 && Number(rate) >= 0 && Number(rate) <= 60;

  return (
    <>
      <section className="card">
        <h2 className="card-title">EMI calculator</h2>
        <p className="card-sub" style={{ marginBottom: 12 }}>See the monthly EMI and total interest before you take a loan.</p>
        <div className="field">
          <label className="field-label" htmlFor="calc-p">Loan amount (₹)</label>
          <input id="calc-p" className="input input-big" inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value.replace(/\D/g, '').slice(0, 10))} />
          <input type="range" className="range" min="10000" max="5000000" step="10000" value={Math.min(5000000, Number(principal) || 0)} onChange={(e) => setPrincipal(e.target.value)} aria-label="Loan amount slider" />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="calc-r">Interest (% a year)</label>
            <input id="calc-r" className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="calc-y">Years</label>
            <input id="calc-y" className="input" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value.replace(/[^0-9.]/g, '').slice(0, 4))} />
          </div>
        </div>
        {!valid ? (
          <Alert tone="amber">Enter a loan amount, an interest rate up to 60% and a period up to 50 years.</Alert>
        ) : (
          <>
            <div className="calc-result frame">
              <span className="compare-label">Monthly EMI</span>
              <span className="calc-emi">{inr(result.emi)}</span>
              <span className="muted small">for {months} months</span>
            </div>
            <div className="compare">
              <div className="compare-item"><div className="compare-label">Total interest</div><div className="compare-value">{inr(result.totalInterest)}</div></div>
              <div className="compare-item"><div className="compare-label">Total you pay</div><div className="compare-value">{inr(result.totalPayment)}</div></div>
            </div>
            <div className="split-bar" style={{ marginTop: 12 }} role="img" aria-label={`${Math.round((1 - interestShare) * 100)}% loan amount, ${Math.round(interestShare * 100)}% interest`}>
              <span className="split-seg safe" style={{ width: `${(1 - interestShare) * 100}%` }} />
              <span className="split-seg emi" style={{ width: `${interestShare * 100}%` }} />
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>{Math.round(interestShare * 100)}% of what you pay is interest.</p>

            <div style={{ marginTop: 14 }}>
              {burden.ratio === null ? (
                <Alert tone="amber">Add your monthly income in Settings to check if this EMI fits.</Alert>
              ) : (
                <Alert tone={burden.level === 'good' ? 'green' : burden.level === 'ok' ? 'brand' : burden.level === 'warn' ? 'amber' : 'red'}>
                  With your current EMIs ({inr(existing)}), you would pay {inr(existing + result.emi)} a month in EMIs: {Math.round(burden.ratio * 100)}% of your income. {burden.label}.
                  {burden.level === 'bad' && ' Most lenders would refuse this, and it leaves too little to live on.'}
                  {a.hasBalance && a.safeToSpend !== null && result.emi > a.safeToSpend && ' The first EMI is more than what is safe to spend right now.'}
                </Alert>
              )}
            </div>
            <button type="button" className="btn btn-soft btn-block" style={{ marginTop: 12 }} onClick={() => actions.editEmi(null, { amount: result.emi, principal: Number(principal), interestRate: Number(rate), totalMonths: months, remainingMonths: months })}>
              <Plus size={18} /> Add this as an EMI
            </button>
          </>
        )}
      </section>

      {valid && <Prepayment principal={principal} rate={rate} months={months} />}

      {valid && schedule.length > 0 && (
        <section className="card">
          <h2 className="card-title" style={{ marginBottom: 8 }}>Year by year</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Year</th><th>Loan repaid</th><th>Interest</th><th>Still owed</th></tr>
              </thead>
              <tbody>
                {schedule.map((y) => (
                  <tr key={y.year}><td>{y.year}</td><td>{inr(y.principal)}</td><td>{inr(y.interest)}</td><td>{inr(y.owed)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

// "What if I pay extra once?" Keeps the EMI the same and shows how much sooner the loan ends.
function Prepayment({ principal, rate, months }) {
  const [extra, setExtra] = useState('50000');
  const [after, setAfter] = useState('12');
  const afterMonth = Math.min(Math.max(1, Number(after) || 1), Math.max(1, months - 1));
  const r = useMemo(() => prepaymentSavings(principal, rate, months, Number(extra) || 0, afterMonth), [principal, rate, months, extra, afterMonth]);
  return (
    <section className="card">
      <h2 className="card-title">Pay extra once</h2>
      <p className="card-sub" style={{ marginBottom: 12 }}>Got a bonus? See what a one-time extra payment saves. Your EMI stays the same; the loan ends sooner.</p>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="pre-amt">Extra payment (₹)</label>
          <input id="pre-amt" className="input" inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value.replace(/\D/g, '').slice(0, 9))} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pre-after">After how many EMIs</label>
          <input id="pre-after" className="input" inputMode="numeric" value={after} onChange={(e) => setAfter(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        </div>
      </div>
      <div className="compare">
        <div className="compare-item"><div className="compare-label">Interest saved</div><div className="compare-value text-green">{inr(r.interestSaved)}</div></div>
        <div className="compare-item"><div className="compare-label">Loan ends</div><div className="compare-value">{r.monthsSaved} month{r.monthsSaved === 1 ? '' : 's'} sooner</div></div>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        {r.monthsBefore} EMIs become {r.monthsAfter}. Check your lender's prepayment charges first (floating-rate home loans usually have none).
      </p>
    </section>
  );
}

export function EmisPage(props) {
  const [view, setView] = useState(props.initialView || 'list');
  return (
    <div className="page narrow">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">EMIs</span>
          <h1 className="page-title">Loans and EMIs</h1>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => props.actions.editEmi()}>
          <Plus size={18} /> Add EMI
        </button>
      </div>
      <div className="segmented big" role="tablist" aria-label="EMI view">
        <button type="button" role="tab" aria-selected={view === 'list'} className={`seg ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          <HandCoins size={18} /> My EMIs
        </button>
        <button type="button" role="tab" aria-selected={view === 'calc'} className={`seg ${view === 'calc' ? 'active' : ''}`} onClick={() => setView('calc')}>
          <Calculator size={18} /> Calculator
        </button>
      </div>
      {view === 'list' ? <EmiList {...props} /> : <EmiCalculator {...props} />}
    </div>
  );
}

