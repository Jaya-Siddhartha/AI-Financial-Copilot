import React from 'react';
import { Check, ChevronRight, Copy, History, KeyRound, Landmark, Lightbulb, QrCode, RotateCcw, SunMoon, Type } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { bankName, formatShortDate, inr } from '../lib/format';
import { TEXT_SIZES, THEMES } from '../lib/settings';

function Choice({ label, icon: Icon, options, value, onChange }) {
  return (
    <div className="setting">
      <div className="setting-label">
        <Icon size={20} aria-hidden="true" /> {label}
      </div>
      <div className="segmented big" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`seg ${value === o.id ? 'active' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage({ data, accounts, activeUserId, actions, settings }) {
  const { user, account, metrics } = data;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.upiId);
      actions.notify('UPI ID copied');
    } catch {
      actions.notify(user.upiId);
    }
  };

  return (
    <div className="page narrow">
      <div>
        <span className="eyebrow">Profile & settings</span>
        <h1 className="page-title">{user.fullName || user.name}</h1>
      </div>

      <section className="card profile-card frame">
        <Avatar name={user.fullName || user.name} size={64} />
        <div className="row-main">
          <div className="profile-name">{user.fullName || user.name}</div>
          <div className="muted">{user.mobile}</div>
          <button type="button" className="link-btn" onClick={copy}>
            {user.upiId} <Copy size={16} style={{ marginLeft: 4 }} />
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="display-title">
        <h2 className="card-title" id="display-title">Display</h2>
        <p className="card-sub" style={{ marginBottom: 12 }}>Make FinCopilot easier to read. Saved on this device.</p>
        <Choice label="Text size" icon={Type} options={TEXT_SIZES} value={settings.textSize} onChange={(textSize) => actions.setSettings({ textSize })} />
        <Choice label="Colours" icon={SunMoon} options={THEMES} value={settings.theme} onChange={(theme) => actions.setSettings({ theme })} />
        <button type="button" className="menu-row" onClick={() => { actions.setSettings({ tourDone: false }); actions.go('home'); }}>
          <span className="icon-circle"><Lightbulb size={20} /></span>
          <span className="row-main">Show the getting-started tips again</span>
          <ChevronRight size={20} className="muted" />
        </button>
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>Bank account</h2>
        <div className="row" style={{ paddingTop: 0 }}>
          <span className="icon-circle">
            <Landmark size={22} strokeWidth={1.8} />
          </span>
          <div className="row-main">
            <div className="row-title">{bankName(account)}</div>
            <div className="row-sub">Savings {account.accountNumberMasked} · used for UPI</div>
          </div>
        </div>
        <div className="muted small">
          Last checked balance {inr(metrics.verifiedBalance)} on {formatShortDate(metrics.lastBalanceCheckDate)}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Demo accounts</h2>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          Switch between the two accounts. Money sent between them arrives on the other side.
        </p>
        {accounts.map((acc) => {
          const active = acc.id === activeUserId;
          return (
            <button
              key={acc.id}
              type="button"
              className={`account-option ${active ? 'active' : ''}`}
              onClick={() => actions.switchAccount(acc.id)}
              aria-pressed={active}
            >
              <Avatar name={acc.fullName || acc.name} size={44} />
              <div className="row-main">
                <div className="row-title">{acc.fullName || acc.name}</div>
                <div className="row-sub">
                  {acc.upiId} · {inr(acc.currentBalance)}
                </div>
              </div>
              {active && <Check size={22} className="text-accent" />}
            </button>
          );
        })}
      </section>

      <section className="card menu-card">
        <button type="button" className="menu-row" onClick={() => actions.go('history')}>
          <span className="icon-circle"><History size={20} /></span>
          <span className="row-main">All payments (history)</span>
          <ChevronRight size={20} className="muted" />
        </button>
        <button type="button" className="menu-row" onClick={actions.receive}>
          <span className="icon-circle"><QrCode size={20} /></span>
          <span className="row-main">My QR code</span>
          <ChevronRight size={20} className="muted" />
        </button>
        <button type="button" className="menu-row" onClick={actions.checkBalance}>
          <span className="icon-circle"><Landmark size={20} /></span>
          <span className="row-main">Check bank balance</span>
          <ChevronRight size={20} className="muted" />
        </button>
        <button type="button" className="menu-row" onClick={actions.changePin}>
          <span className="icon-circle"><KeyRound size={20} /></span>
          <span className="row-main">Change UPI PIN</span>
          <ChevronRight size={20} className="muted" />
        </button>
        <button type="button" className="menu-row danger" onClick={actions.reset}>
          <span className="icon-circle danger"><RotateCcw size={20} /></span>
          <span className="row-main">
            Reset demo data
            <span className="row-sub">Restores both accounts, EMIs and payments</span>
          </span>
        </button>
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>How FinCopilot works</h2>
        <ol className="steps">
          <li><span><strong>Pay and receive with UPI.</strong> Every payment, including EMIs, needs your 4-digit UPI PIN.</span></li>
          <li><span><strong>Add your EMIs.</strong> FinCopilot tracks when each one is due and warns you if one is late.</span></li>
          <li><span><strong>See what is safe to spend.</strong> Your balance minus EMIs, usual daily spending and a small cushion.</span></li>
          <li><span><strong>Get warned before you pay.</strong> If a payment would put an EMI at risk, you are asked to confirm.</span></li>
        </ol>
        <p className="muted small" style={{ marginTop: 16 }}>
          This is a demo. Accounts, banks and payments are pretend, and no real money moves.
          {__BROWSER_DEMO__ && ' Everything runs in this browser and is saved only on this device.'}
        </p>
      </section>
    </div>
  );
}
