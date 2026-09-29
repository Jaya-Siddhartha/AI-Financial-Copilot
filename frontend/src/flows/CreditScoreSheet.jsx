import React, { useRef, useState } from 'react';
import { FileUp, LoaderCircle, Lock } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { BUREAUS, scoreBand } from '../lib/creditReport';
import { readCreditReport } from '../lib/statementFiles';
import { errorText, todayInput } from '../lib/format';

// Add a credit score: type it in, or upload your own credit report PDF and check what was read.
export function CreditScoreSheet({ actions, onClose }) {
  const [mode, setMode] = useState('type');
  const [form, setForm] = useState({ score: '', bureau: 'CIBIL', date: todayInput() });
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [facts, setFacts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const score = Number(form.score);
  const band = score >= 300 && score <= 900 ? scoreBand(score) : null;

  const read = async () => {
    setBusy(true);
    setError('');
    try {
      const f = await readCreditReport(file, password);
      setFacts(f);
      setForm({ score: String(f.score), bureau: f.bureau || 'CIBIL', date: f.reportDate || todayInput() });
    } catch (err) {
      setError(errorText(err, 'This report could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!(score >= 300 && score <= 900)) return setError('A credit score is a number between 300 and 900.');
    if (!form.date || form.date > todayInput()) return setError('Enter the date of the score (not in the future).');
    setBusy(true);
    setError('');
    try {
      await actions.addCreditScore({
        score,
        bureau: form.bureau,
        date: form.date,
        source: facts ? 'report' : 'manual',
        details: facts ? { activeAccounts: facts.activeAccounts, overdueAccounts: facts.overdueAccounts, enquiries: facts.enquiries } : null,
      });
      actions.notify(`${form.bureau} score ${score} saved`);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
    return undefined;
  };

  const showForm = mode === 'type' || facts;

  return (
    <Sheet
      title="Add your credit score"
      onClose={onClose}
      locked={busy}
      footer={
        showForm ? (
          <button type="submit" form="score-form" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <LoaderCircle size={20} className="spin" /> : 'Save score'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled={!file || busy} onClick={read}>
            {busy ? <LoaderCircle size={20} className="spin" /> : 'Read my report'}
          </button>
        )
      }
    >
      <div className="segmented big" role="tablist" aria-label="How to add" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={mode === 'type'} className={`seg ${mode === 'type' ? 'active' : ''}`} onClick={() => { setMode('type'); setFacts(null); setError(''); }}>
          Type it in
        </button>
        <button type="button" role="tab" aria-selected={mode === 'upload'} className={`seg ${mode === 'upload' ? 'active' : ''}`} onClick={() => { setMode('upload'); setError(''); }}>
          Upload report
        </button>
      </div>

      {mode === 'upload' && !facts && (
        <>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Choose the credit report PDF you downloaded from CIBIL, Experian, Equifax or CRIF. It is read on this device and not uploaded anywhere.
          </p>
          <button type="button" className="slot slot-pick report-pick" onClick={() => fileRef.current?.click()}>
            <FileUp size={20} /> {file ? file.name : 'Choose credit report PDF'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); e.target.value = ''; }} />
          <div className="input-wrap" style={{ marginTop: 10 }}>
            <Lock size={18} />
            <input className="input" type="password" autoComplete="off" placeholder="PDF password (if any)" aria-label="Report password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <p className="field-hint" style={{ marginTop: 6 }}>CIBIL reports are often locked with your date of birth or part of your name; the bureau's email tells you the format.</p>
        </>
      )}

      {facts && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="green">
            Read from {file?.name}: score {facts.score}
            {facts.bureau ? ` (${facts.bureau})` : ''}
            {facts.activeAccounts !== null ? `, ${facts.activeAccounts} active accounts` : ''}
            {facts.overdueAccounts !== null ? `, ${facts.overdueAccounts} overdue` : ''}. Check the details below, then save.
          </Alert>
        </div>
      )}

      {showForm && (
        <form id="score-form" onSubmit={save}>
          <div className="field">
            <label className="field-label" htmlFor="score-value">Score (300 – 900)</label>
            <input id="score-value" className="input input-big" inputMode="numeric" maxLength={3} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value.replace(/\D/g, '').slice(0, 3) }))} autoFocus={mode === 'type'} />
            {band && <span className={`field-hint credit-band ${band.tone}`}>{band.label}: {band.note}</span>}
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="score-bureau">From</label>
              <select id="score-bureau" className="input" value={form.bureau} onChange={(e) => setForm((f) => ({ ...f, bureau: e.target.value }))}>
                {BUREAUS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="score-date">Date</label>
              <input id="score-date" className="input" type="date" max={todayInput()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <p className="field-hint">Free places to check it: the bureau websites (one free report a year each) or apps that show a free score.</p>
        </form>
      )}
      {error && <div style={{ marginTop: 12 }}><Alert tone={/no credit history/i.test(error) ? 'amber' : 'red'}>{error}</Alert></div>}
      {error && mode === 'upload' && !facts && /No score/i.test(error) && (
        <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => { setMode('type'); setError(''); }}>
          Type it in instead
        </button>
      )}
    </Sheet>
  );
}
