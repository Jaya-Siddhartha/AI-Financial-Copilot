import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { ThemePicker } from '../components/ThemePicker';
import { errorText, inr } from '../lib/format';

const digits = (v) => v.replace(/[^0-9]/g, '').slice(0, 9);

export function OnboardingPage({ profile, actions }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: profile.fullName || '',
    income: profile.monthlyIncome ? String(profile.monthlyIncome) : '',
    salaryDay: String(profile.salaryDay || 1),
    balance: '',
    bufferEnabled: true,
    buffer: '',
    theme: profile.theme || 'purple',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const income = Number(form.income) || 0;
  const suggested = Math.max(1000, Math.round((income * 0.05) / 500) * 500);

  const next = () => {
    setError('');
    if (step === 1) {
      if (!form.fullName.trim()) return setError('Enter your name.');
      const day = Number(form.salaryDay);
      if (!(day >= 1 && day <= 31)) return setError('Salary day must be between 1 and 31.');
    }
    setStep((s) => s + 1);
    return undefined;
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const balance = form.balance === '' ? null : Number(form.balance);
      await actions.saveProfile({
        fullName: form.fullName.trim(),
        monthlyIncome: income,
        salaryDay: Number(form.salaryDay) || 1,
        balanceAmount: balance,
        balanceDate: balance === null ? null : new Date().toISOString(),
        bufferEnabled: form.bufferEnabled,
        bufferAmount: form.bufferEnabled ? Number(form.buffer || suggested) : 0,
        theme: form.theme,
        onboarded: true,
      });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-card card onboarding">
        <div className="steps-bar" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= step ? 'on' : ''} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="page-title">Tell us about you</h2>
            <p className="page-sub">This is used to work out safe spending. You can change it later.</p>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="ob-name">Your name</label>
              <input id="ob-name" className="input" value={form.fullName} onChange={set('fullName')} maxLength={80} autoComplete="name" />
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="ob-income">Monthly income (₹)</label>
                <input id="ob-income" className="input" inputMode="numeric" placeholder="e.g. 45000" value={form.income} onChange={(e) => setForm((f) => ({ ...f, income: digits(e.target.value) }))} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ob-day">Salary comes on (day)</label>
                <input id="ob-day" className="input" inputMode="numeric" placeholder="1 – 31" maxLength={2} value={form.salaryDay} onChange={(e) => setForm((f) => ({ ...f, salaryDay: digits(e.target.value).slice(0, 2) }))} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="page-title">Your bank balance today</h2>
            <p className="page-sub">
              Open your bank or UPI app and type the balance it shows. From now on FinCopilot adds and subtracts your transactions to keep it up to date.
            </p>
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field-label" htmlFor="ob-balance">Balance (₹)</label>
              <input id="ob-balance" className="input input-big" inputMode="decimal" placeholder="e.g. 32500" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value.replace(/[^0-9.]/g, '').slice(0, 12) }))} />
              <span className="field-hint">You can skip this and add it later from Home.</span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="page-title">Keep a safety buffer?</h2>
            <p className="page-sub">A buffer is money you never want to touch, kept for surprises. It is left out of "safe to spend". Your choice.</p>
            <div className="segmented big" role="radiogroup" aria-label="Safety buffer" style={{ marginTop: 16 }}>
              <button type="button" role="radio" aria-checked={form.bufferEnabled} className={`seg ${form.bufferEnabled ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, bufferEnabled: true }))}>
                Yes, keep one
              </button>
              <button type="button" role="radio" aria-checked={!form.bufferEnabled} className={`seg ${!form.bufferEnabled ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, bufferEnabled: false }))}>
                No buffer
              </button>
            </div>
            {form.bufferEnabled && (
              <div className="field" style={{ marginTop: 16 }}>
                <label className="field-label" htmlFor="ob-buffer">Buffer amount (₹)</label>
                <input id="ob-buffer" className="input" inputMode="numeric" placeholder={String(suggested)} value={form.buffer} onChange={(e) => setForm((f) => ({ ...f, buffer: digits(e.target.value) }))} />
                <div className="quick-amounts" style={{ justifyContent: 'flex-start' }}>
                  {[1000, 2000, 5000, suggested].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
                    <button key={v} type="button" className={`seg ${Number(form.buffer || suggested) === v ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, buffer: String(v) }))}>
                      {inr(v)}
                    </button>
                  ))}
                </div>
                {income > 0 && <span className="field-hint">About 5% of your income ({inr(suggested)}) is a good start.</span>}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="page-title">Pick a look</h2>
            <p className="page-sub">You can change it any time in Settings.</p>
            <ThemePicker value={form.theme} onChange={(theme) => setForm((f) => ({ ...f, theme }))} preview />
          </>
        )}

        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-outline" onClick={() => (step === 1 ? actions.signOut() : setStep((s) => s - 1))} disabled={busy}>
            {step === 1 ? 'Sign out' : 'Back'}
          </button>
          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              {step === 2 && form.balance === '' ? 'Skip for now' : 'Continue'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>
              {busy ? <LoaderCircle size={20} className="spin" /> : 'Start using FinCopilot'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
