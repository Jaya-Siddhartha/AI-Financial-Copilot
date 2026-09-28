import React, { useState } from 'react';
import { Eye, EyeOff, HandCoins, LoaderCircle, PieChart, ShieldCheck } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { auth } from '../data/store';
import { errorText } from '../lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function PasswordInput({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        className="input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={8}
        required
        style={{ paddingRight: '3rem' }}
      />
      <button type="button" className="icon-btn input-end" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const switchTo = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return setError('Enter a valid email address.');
    if (mode !== 'forgot' && password.length < 8) return setError('The password must be at least 8 characters.');
    if (mode === 'signup' && !name.trim()) return setError('Enter your name.');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await auth.signIn({ email: cleanEmail, password });
      } else if (mode === 'signup') {
        const res = await auth.signUp({ email: cleanEmail, password, fullName: name.trim() });
        if (!res.session) {
          setInfo(`We sent a confirmation link to ${cleanEmail}. Open it, then sign in here.`);
          setMode('signin');
        }
      } else {
        await auth.sendReset(cleanEmail);
        setInfo(`If ${cleanEmail} has an account, a password reset link is on its way.`);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';

  return (
    <div className="auth">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">FinCopilot</span>
        </div>
        <h1 className="auth-headline">Know what you can spend before you spend it.</h1>
        <ul className="auth-points">
          <li><HandCoins size={22} /> Never miss an EMI: we keep money aside for it.</li>
          <li><PieChart size={22} /> Upload PhonePe, Google Pay, Paytm or bank statements and see where your money goes.</li>
          <li><ShieldCheck size={22} /> Private: your data is locked to your account. The AI runs on your own device.</li>
        </ul>
      </section>

      <section className="auth-card card">
        <h2 className="page-title" style={{ marginTop: 0 }}>{title}</h2>
        <p className="page-sub" style={{ marginBottom: 16 }}>
          {mode === 'signup' ? 'Free. Takes a minute.' : mode === 'forgot' ? 'We will email you a link to set a new password.' : 'Sign in to see your money.'}
        </p>
        {info && <div style={{ marginBottom: 12 }}><Alert tone="green">{info}</Alert></div>}
        {error && <div style={{ marginBottom: 12 }}><Alert>{error}</Alert></div>}
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <div className="field">
              <label className="field-label" htmlFor="auth-name">Your name</label>
              <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          {mode !== 'forgot' && (
            <div className="field">
              <label className="field-label" htmlFor="auth-password">Password</label>
              <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {mode === 'signup' && <span className="field-hint">At least 8 characters.</span>}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <LoaderCircle size={20} className="spin" /> : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
          </button>
        </form>
        <div className="auth-links">
          {mode === 'signin' && (
            <>
              <button type="button" className="link-btn" onClick={() => switchTo('forgot')}>Forgot password?</button>
              <span>
                New here? <button type="button" className="link-btn" onClick={() => switchTo('signup')}>Create an account</button>
              </span>
            </>
          )}
          {mode !== 'signin' && (
            <span>
              Have an account? <button type="button" className="link-btn" onClick={() => switchTo('signin')}>Sign in</button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

export function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('The password must be at least 8 characters.');
    setBusy(true);
    setError('');
    try {
      await auth.updatePassword(password);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-card card">
        <h2 className="page-title" style={{ marginTop: 0 }}>Set a new password</h2>
        {error && <div style={{ margin: '12px 0' }}><Alert>{error}</Alert></div>}
        <form onSubmit={submit}>
          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label" htmlFor="new-password">New password</label>
            <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <LoaderCircle size={20} className="spin" /> : 'Save password'}
          </button>
        </form>
      </section>
    </div>
  );
}
