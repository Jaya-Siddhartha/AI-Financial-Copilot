import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, KeyRound, LoaderCircle, LogOut, ShieldCheck, Trash2, Type } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { ThemePicker } from '../components/ThemePicker';
import { auth, deleteAccount, downloadStatementFile } from '../data/store';
import { TEXT_SIZES } from '../lib/settings';
import { errorText, inr } from '../lib/format';

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
  const open = async (s) => {
    try {
      window.open(await downloadStatementFile(s), '_blank', 'noopener');
    } catch (err) {
      actions.fail(err);
    }
  };
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
              {s.filePath && (
                <button type="button" className="icon-btn" aria-label={`Open ${s.fileName}`} onClick={() => open(s)}><ExternalLink size={20} /></button>
              )}
              <button type="button" className="icon-btn" aria-label={`Delete ${s.fileName}`} onClick={() => remove(s)}><Trash2 size={20} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AccountCard({ data, email, actions }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const changePassword = async () => {
    if (pw.length < 8) return setMsg({ tone: 'red', text: 'The new password must be at least 8 characters.' });
    setBusy(true);
    try {
      await auth.updatePassword(pw);
      setPw('');
      setMsg({ tone: 'green', text: 'Password changed.' });
    } catch (err) {
      setMsg({ tone: 'red', text: errorText(err) });
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const removeAccount = () =>
    actions.confirm({
      title: 'Delete your account?',
      message: 'This permanently deletes your account, all transactions, EMIs and uploaded statements. It cannot be undone.',
      confirmLabel: 'Delete everything',
      danger: true,
      requireText: 'DELETE',
      onConfirm: async () => {
        await deleteAccount(data.profile.id);
      },
    });

  return (
    <section className="card">
      <h2 className="card-title" style={{ marginBottom: 4 }}>Account</h2>
      <p className="card-sub" style={{ marginBottom: 12 }}>Signed in as {email}</p>
      <label className="field-label" htmlFor="set-pw"><KeyRound size={16} /> Change password</label>
      <div className="inline-form" style={{ marginTop: 6 }}>
        <input id="set-pw" className="input" type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ flex: 1 }} />
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !pw} onClick={changePassword}>Change</button>
      </div>
      {msg && <div style={{ marginTop: 10 }}><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="menu-card" style={{ marginTop: 12 }}>
        <button type="button" className="menu-row" onClick={actions.signOut}>
          <span className="icon-circle"><LogOut size={20} /></span>
          <span className="row-main">Sign out</span>
        </button>
        <button type="button" className="menu-row danger" onClick={removeAccount}>
          <span className="icon-circle danger"><Trash2 size={20} /></span>
          <span className="row-main">Delete my account and data</span>
        </button>
      </div>
    </section>
  );
}

export function SettingsPage({ data, email, actions }) {
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
      <AccountCard data={data} email={email} actions={actions} />

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 8 }}><ShieldCheck size={20} /> Privacy</h2>
        <p className="muted small">
          Your data is stored in your FinCopilot account and locked so only you can read it. Statements are read on your device; the original file is kept privately so you can open it again. The offline AI runs on your device and sends nothing anywhere. FinCopilot does not move money and is not a bank. The credit health number is an estimate, not your CIBIL score.
        </p>
      </section>
    </div>
  );
}
