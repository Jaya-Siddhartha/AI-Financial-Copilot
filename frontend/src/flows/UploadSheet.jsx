import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, LoaderCircle, Lock, X } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Alert } from '../components/ui/Alert';
import { readStatement } from '../lib/statementFiles';
import { markDuplicates } from '../lib/statementParser';
import { CATEGORY_LIST } from '../lib/categories';
import { errorText, formatShortDate, inr } from '../lib/format';
import { MAX_STATEMENTS_PER_UPLOAD } from '../config';

const SOURCES = ['Auto-detect', 'PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Bank', 'Other'];
const emptySlot = () => ({ file: null, source: 'Auto-detect', password: '', state: 'empty', error: '', result: null });

function Slot({ index, slot, onChange }) {
  const inputRef = useRef(null);
  return (
    <div className={`slot ${slot.state}`}>
      <div className="slot-head">
        <span className="slot-number">{index + 1}</span>
        {slot.file ? (
          <div className="row-main">
            <div className="row-title">{slot.file.name}</div>
            <div className="row-sub">
              {slot.state === 'ready' && `${slot.result.transactions.length} transactions · ${slot.result.source}`}
              {slot.state === 'reading' && 'Reading…'}
              {slot.state === 'picked' && `${Math.round(slot.file.size / 1024)} KB`}
              {slot.state === 'error' && 'Could not read'}
            </div>
          </div>
        ) : (
          <button type="button" className="slot-pick" onClick={() => inputRef.current?.click()}>
            <FileUp size={20} /> Choose statement {index + 1}
          </button>
        )}
        {slot.state === 'ready' && <CheckCircle2 size={22} className="text-green" aria-label="Ready" />}
        {slot.state === 'reading' && <LoaderCircle size={22} className="spin" />}
        {slot.file && slot.state !== 'reading' && (
          <button type="button" className="icon-btn" aria-label={`Remove statement ${index + 1}`} onClick={() => onChange(emptySlot())}>
            <X size={20} />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.xlsx,.xls,.txt,application/pdf,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onChange({ ...emptySlot(), file, state: 'picked' });
          }}
        />
      </div>
      {slot.file && slot.state !== 'ready' && (
        <div className="slot-options">
          <select className="input" value={slot.source} onChange={(e) => onChange({ ...slot, source: e.target.value })} aria-label={`Source of statement ${index + 1}`}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {(/\.pdf$/i.test(slot.file.name)) && (
            <div className="input-wrap">
              <Lock size={18} />
              <input className="input" type="password" autoComplete="off" placeholder="PDF password (if any)" value={slot.password} onChange={(e) => onChange({ ...slot, password: e.target.value, state: slot.state === 'error' ? 'picked' : slot.state })} aria-label={`Password for statement ${index + 1}`} />
            </div>
          )}
        </div>
      )}
      {slot.error && <div style={{ marginTop: 8 }}><Alert tone={slot.error.code === 'NEEDS_PASSWORD' ? 'amber' : 'red'}>{slot.error.message}</Alert></div>}
    </div>
  );
}

export function UploadSheet({ existing, actions, onClose }) {
  const [slots, setSlots] = useState(() => Array.from({ length: MAX_STATEMENTS_PER_UPLOAD }, emptySlot));
  const [step, setStep] = useState('pick'); // pick | review | saving
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const picked = slots.filter((s) => s.file && s.state !== 'ready');
  const reading = slots.some((s) => s.state === 'reading');
  const setSlot = (i, next) => setSlots((all) => all.map((s, j) => (j === i ? (typeof next === 'function' ? next(s) : next) : s)));

  const readAll = async () => {
    setError('');
    const results = await Promise.all(
      slots.map(async (slot, i) => {
        if (!slot.file || slot.state === 'ready') return slot;
        setSlot(i, (s) => ({ ...s, state: 'reading', error: '' }));
        try {
          const result = await readStatement(slot.file, slot.password);
          if (slot.source !== 'Auto-detect') result.source = slot.source;
          const next = { ...slot, state: 'ready', result, error: '' };
          setSlot(i, next);
          return next;
        } catch (err) {
          const next = { ...slot, state: 'error', error: { code: err.code, message: errorText(err, 'This file could not be read.') } };
          setSlot(i, next);
          return next;
        }
      })
    );
    const ready = results.map((s, i) => ({ ...s, index: i })).filter((s) => s.state === 'ready');
    if (!ready.length) return false;
    const failed = results.some((s) => s.state === 'error');
    if (failed) setError('Some files could not be read (see above). Fix or remove them, or review the rest.');
    const combined = ready.flatMap((s) => s.result.transactions.map((t) => ({ ...t, slot: s.index })));
    setRows(markDuplicates(combined, existing).map((t, k) => ({ ...t, key: k })));
    return !failed;
  };

  const goReview = async () => {
    if (await readAll()) setStep('review');
  };

  const readyCount = slots.filter((s) => s.state === 'ready').length;
  const selected = rows.filter((r) => r.include);
  const totals = useMemo(
    () => selected.reduce((acc, r) => ({ ...acc, [r.type]: acc[r.type] + r.amount }), { debit: 0, credit: 0 }),
    [selected]
  );
  const shown = rows.filter((r) => filter === 'all' || (filter === 'dup' ? r.duplicate : filter === r.type));
  const dupCount = rows.filter((r) => r.duplicate).length;
  const toggle = (key, patch) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setAll = (include) => setRows((all) => all.map((r) => (shown.includes(r) ? { ...r, include } : r)));

  const save = async () => {
    setStep('saving');
    setError('');
    try {
      const items = slots
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.state === 'ready')
        .map(({ s, i }) => ({
          file: s.file,
          sourceApp: s.result.source,
          period: s.result.period,
          transactions: rows.filter((r) => r.slot === i && r.include).map(({ date, description, amount, type, category }) => ({ date, description, amount, type, category })),
        }))
        .filter((item) => item.transactions.length);
      const count = await actions.importStatements(items);
      actions.notify(`${count} transactions added from ${items.length} statement${items.length === 1 ? '' : 's'}`, 'ok', true);
      onClose();
    } catch (err) {
      setError(errorText(err, 'Could not save. Nothing was added; please try again.'));
      setStep('review');
    }
  };

  if ((step === 'review' || step === 'saving') && rows.length) {
    return (
      <Sheet
        title="Check before adding"
        onClose={onClose}
        onBack={step === 'saving' ? undefined : () => setStep('pick')}
        locked={step === 'saving'}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={step === 'saving' || !selected.length}>
            {step === 'saving' ? <LoaderCircle size={20} className="spin" /> : `Add ${selected.length} transactions`}
          </button>
        }
      >
        <p className="muted small">
          Untick anything you do not want. {dupCount ? `${dupCount} look like duplicates (the same payment in two statements, or already saved) and are unticked.` : ''}
        </p>
        <div className="compare" style={{ marginTop: 8 }}>
          <div className="compare-item"><div className="compare-label">Money out</div><div className="compare-value">{inr(totals.debit)}</div></div>
          <div className="compare-item"><div className="compare-label">Money in</div><div className="compare-value text-green">{inr(totals.credit)}</div></div>
        </div>
        <div className="filters">
          <div className="segmented" role="radiogroup" aria-label="Show">
            {[['all', 'All'], ['debit', 'Out'], ['credit', 'In'], ['dup', `Duplicates (${dupCount})`]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={filter === id} className={`seg ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="filters">
          <button type="button" className="link-btn" onClick={() => setAll(true)}>Tick all shown</button>
          <button type="button" className="link-btn" onClick={() => setAll(false)}>Untick all shown</button>
        </div>
        <div className="review-list">
          {shown.slice(0, 400).map((r) => (
            <div key={r.key} className={`review-row ${r.include ? '' : 'off'}`}>
              <label className="review-check">
                <input type="checkbox" checked={r.include} onChange={(e) => toggle(r.key, { include: e.target.checked })} aria-label={`Include ${r.description}`} />
              </label>
              <div className="row-main">
                <div className="row-title">{r.description}</div>
                <div className="row-sub">
                  {formatShortDate(r.date)} · Statement {r.slot + 1}
                  {r.duplicate && <span className="chip amber" style={{ marginLeft: 6 }}>{r.duplicate === 'exact' ? 'Duplicate' : 'Possible duplicate'}</span>}
                </div>
                <select className="input input-sm" value={r.category} onChange={(e) => toggle(r.key, { category: e.target.value })} aria-label={`Category for ${r.description}`}>
                  {CATEGORY_LIST.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className={`row-amount ${r.type === 'credit' ? 'credit' : ''}`}>{r.type === 'credit' ? '+' : '−'} {inr(r.amount)}</div>
            </div>
          ))}
          {shown.length > 400 && <p className="muted small">Showing the first 400 of {shown.length}. The rest are included as ticked.</p>}
        </div>
        {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Upload statements"
      onClose={onClose}
      locked={reading}
      footer={
        readyCount && !reading && rows.length ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('review')}>
            Review {rows.length} transactions
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled={!picked.length || reading} onClick={goReview}>
            {reading ? <LoaderCircle size={20} className="spin" /> : `Read ${picked.length || ''} file${picked.length === 1 ? '' : 's'}`}
          </button>
        )
      }
    >
      <p className="muted small">
        Add up to {MAX_STATEMENTS_PER_UPLOAD} statements at once: PhonePe, Google Pay, Paytm, BHIM or any bank. PDF, Excel (.xlsx) or CSV. Files are read on your device; only the transactions are saved, on this device.
      </p>
      <div className="slots">
        {slots.map((slot, i) => (
          <Slot
            key={i}
            index={i}
            slot={slot}
            onChange={(next) => {
              setSlot(i, next);
              setRows([]);
            }}
          />
        ))}
      </div>
      <details className="help">
        <summary>How do I download a statement?</summary>
        <div className="help-body">
          <p><strong>PhonePe:</strong> History → Download statement → choose dates. The PDF password is usually your mobile number.</p>
          <p><strong>Google Pay:</strong> Profile → Settings → Statement (or on the web at pay.google.com) → download.</p>
          <p><strong>Paytm:</strong> Balance &amp; History → Download statement (PDF or Excel).</p>
          <p><strong>Bank:</strong> Net banking → Account statement → download as PDF or Excel. The password is often part of your name and date of birth.</p>
        </div>
      </details>
      {error && <div style={{ marginTop: 12 }}><Alert tone="amber">{error}</Alert></div>}
    </Sheet>
  );
}
