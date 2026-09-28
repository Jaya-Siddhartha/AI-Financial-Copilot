import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, LoaderCircle, ShieldCheck, Trash2, Type, Upload } from 'lucide-react';
import { ThemePicker } from '../components/ThemePicker';
import { TEXT_SIZES } from '../lib/settings';
import { inr } from '../lib/format';

const digits = (v, max = 9) => v.replace(/[^0-9]/g, '').slice(0, max);

function ProfileCard({ profile, actions }) {
  const [form, setForm] = useState({ fullName: profile.fullName, income: String(profile.monthlyIncome || ''), salaryDay: String(profile.salaryDay) });
  const [busy, setBusy] = useState(false);
  const changed = form.fullName !== profile.fullName || Number(form.income || 0) !== Number(profile.monthlyIncome) || Number(form.salaryDay) !== Number(profile.salaryDay);

  const save = async () => {
    const day = Number(form.salaryDay);
    if (!form.fullName.trim()) return actions.notify('Enter your name.', 'error');
    if (!(day >= 1 && day <= 31)) return actions.notify('Salary day must be between 1 and 31.', 'error');
    setBusy(true);
    try {
      await actions.saveProfile({ fullName: form.fullName.trim(), monthlyIncome: Number(form.income || 0), salaryDay: day });
      actions.notify('Profile saved');
    } catch (err) {
      actions.fail(err);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <section className="card">
      <h2 className="card-title" style={{ marginBottom: 12 }}>Profile</h2>
      <div className="field">
        <label className="field-label" htmlFor="set-name">Name</label>
        <input id="set-name" className="input" value={form.fullName} maxLength={80} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="set-income">Monthly income (₹)</label>
          <input id="set-income" className="input" inputMode="numeric" value={form.income} onChange={(e) => setForm((f) => ({ ...f, income: digits(e.target.value) }))} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="set-day">Salary day</label>
          <input id="set-day" className="input" inputMode="numeric" value={form.salaryDay} onChange={(e) => setForm((f) => ({ ...f, salaryDay: digits(e.target.value, 2) }))} />
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-sm" disabled={!changed || busy} onClick={save}>
        {busy ? <LoaderCircle size={18} className="spin" /> : 'Save'}
      </button>
    </section>
  );
}

// The user decides whether to keep a buffer, and how much.
function BufferCard({ profile, actions }) {
  const [amount, setAmount] = useState(String(profile.bufferAmount || ''));
  const income = Number(profile.monthlyIncome) || 0;
  const fivePct = Math.max(500, Math.round((income * 0.05) / 100) * 100);
  const presets = [...new Set([1000, 2000, 3000, 5000, income ? fivePct : null].filter(Boolean))].sort((a, b) => a - b);

  useEffect(() => setAmount(String(profile.bufferAmount || '')), [profile.bufferAmount]);

  const save = async (patch, message) => {
    try {
      await actions.saveProfile(patch);
      actions.notify(message);
    } catch (err) {
      actions.fail(err);
    }
  };

  return (
    <section className="card" aria-labelledby="buffer-title">
      <div className="card-head">
        <h2 className="card-title" id="buffer-title">Safety buffer</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={profile.bufferEnabled}
            onChange={(e) => save({ bufferEnabled: e.target.checked, bufferAmount: e.target.checked ? Number(amount || 2000) : profile.bufferAmount }, e.target.checked ? 'Buffer turned on' : 'Buffer turned off')}
          />
          <span className="switch-ui" aria-hidden="true" />
          <span>{profile.bufferEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      <p className="card-sub">
        Money you never want to touch, kept aside for surprises. It is taken out of "safe to spend". {profile.bufferEnabled ? `Right now: ${inr(profile.bufferAmount)}.` : 'Turned off: all your spare money counts as safe to spend.'}
      </p>
      {profile.bufferEnabled && (
        <>
          <div className="quick-amounts" style={{ justifyContent: 'flex-start' }}>
            {presets.map((v) => (
              <button key={v} type="button" className={`seg ${Number(profile.bufferAmount) === v ? 'active' : ''}`} onClick={() => save({ bufferAmount: v }, `Buffer set to ${inr(v)}`)}>
                {inr(v)}{income && v === fivePct ? ' (5%)' : ''}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <div className="input-wrap" style={{ flex: 1 }}>
              <span className="input-prefix" aria-hidden="true">₹</span>
              <input className="input input-money" inputMode="numeric" aria-label="Buffer amount" value={amount} onChange={(e) => setAmount(digits(e.target.value))} />
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={!amount || Number(amount) === Number(profile.bufferAmount)} onClick={() => save({ bufferAmount: Number(amount) }, `Buffer set to ${inr(Number(amount))}`)}>
              Set
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function StatementsCard({ data, actions }) {
  const remove = (s) =>
    actions.confirm({
      title: `Delete ${s.fileName}?`,
      message: `Also delete the ${s.txCount} transactions it added? Choose "Delete all" to remove them too, or keep them and delete just the file.`,
      confirmLabel: 'Delete all',
      secondaryLabel: 'Keep transactions',
      danger: true,
      onConfirm: async () => {
        await actions.removeStatement(s, true);
        actions.closeSheet();
        actions.notify('Statement and its transactions deleted');
      },
      onSecondary: async () => {
        await actions.removeStatement(s, false);
        actions.closeSheet();
        actions.notify('Statement file deleted, transactions kept');
      },
    });

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Uploaded statements</h2>
        <button type="button" className="btn btn-soft btn-sm" onClick={actions.upload}>Upload</button>
      </div>
      {data.statements.length === 0 ? (
        <div className="empty">None yet. Upload up to 5 at a time: PhonePe, Google Pay, Paytm or any bank.</div>
      ) : (
        <div className="list">
          {data.statements.map((s) => (
            <div className="row" key={s.id}>
              <span className="icon-circle"><FileText size={20} /></span>
              <div className="row-main">
                <div className="row-title">{s.fileName}</div>
                <div className="row-sub">
                  {s.sourceApp} · {s.txCount} transactions{s.periodStart ? ` · ${s.periodStart} to ${s.periodEnd}` : ''}
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label={`Delete ${s.fileName}`} onClick={() => remove(s)}><Trash2 size={20} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Data lives on this device, so a backup file is how it moves to a new phone or computer.
function DataCard({ data, actions }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const download = () => {
    const blob = new Blob([actions.exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fincopilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    actions.notify('Backup downloaded');
  };

  const restore = (file) =>
    actions.confirm({
      title: 'Restore this backup?',
      message: `Everything on this device will be replaced with the data in ${file.name}.`,
      confirmLabel: 'Restore',
      onConfirm: async () => {
        setBusy(true);
        try {
          const result = await actions.importBackup(await file.text());
          actions.closeSheet();
          actions.notify(`Restored ${result.transactions} transactions and ${result.emis} EMIs`, 'ok', true);
        } finally {
          setBusy(false);
        }
      },
    });

  const wipe = () =>
    actions.confirm({
      title: 'Delete all data on this device?',
      message: 'Your profile, transactions, EMIs and statements will be removed from this device. Download a backup first if you may need them.',
      confirmLabel: 'Delete everything',
      danger: true,
      requireText: 'DELETE',
      onConfirm: async () => {
        await actions.deleteAllData();
        actions.closeSheet();
      },
    });

  return (
    <section className="card">
      <h2 className="card-title">Your data</h2>
      <p className="card-sub" style={{ marginBottom: 12 }}>
        Saved on this device only: {data.transactions.length} transactions, {data.emis.length} EMIs. Download a backup to keep a copy or move to another phone or computer.
      </p>
      <div className="menu-card">
        <button type="button" className="menu-row" onClick={download}>
          <span className="icon-circle"><Download size={20} /></span>
          <span className="row-main">Download backup</span>
        </button>
        <button type="button" className="menu-row" onClick={() => fileRef.current?.click()} disabled={busy}>
          <span className="icon-circle">{busy ? <LoaderCircle size={20} className="spin" /> : <Upload size={20} />}</span>
          <span className="row-main">Restore from a backup file</span>
        </button>
        <button type="button" className="menu-row danger" onClick={wipe}>
          <span className="icon-circle danger"><Trash2 size={20} /></span>
          <span className="row-main">Delete all data on this device</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) restore(file);
        }}
      />
    </section>
  );
}

export function SettingsPage({ data, actions }) {
  const { profile } = data;
  const setLook = async (patch) => {
    try {
      await actions.saveProfile(patch);
    } catch (err) {
      actions.fail(err);
    }
  };

  return (
    <div className="page narrow">
      <div>
        <span className="eyebrow">Settings</span>
        <h1 className="page-title">Settings</h1>
      </div>

      <ProfileCard profile={profile} actions={actions} />
      <BufferCard profile={profile} actions={actions} />

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>Appearance</h2>
        <ThemePicker value={profile.theme} onChange={(theme) => setLook({ theme })} />
        <div className="setting" style={{ marginTop: 16 }}>
          <div className="setting-label"><Type size={20} aria-hidden="true" /> Text size</div>
          <div className="segmented big" role="radiogroup" aria-label="Text size">
            {TEXT_SIZES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={profile.textSize === t.id} className={`seg ${profile.textSize === t.id ? 'active' : ''}`} onClick={() => setLook({ textSize: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <StatementsCard data={data} actions={actions} />
      <DataCard data={data} actions={actions} />

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 8 }}><ShieldCheck size={20} /> Privacy</h2>
        <p className="muted small">
          No account and no sign-up. Everything is saved on this device and never sent to a server. Statements are read on your device and the files are not kept. The offline AI also runs on your device and sends nothing anywhere. If you clear your browser data, FinCopilot data is cleared too, so keep a backup. FinCopilot does not move money and is not a bank. The credit health number is an estimate, not your CIBIL score.
        </p>
      </section>
    </div>
  );
}
