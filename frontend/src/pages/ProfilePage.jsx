import React from 'react';
import { Check, ChevronRight, Copy, KeyRound, Landmark, RotateCcw } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { bankName, formatShortDate, inr } from '../lib/format';

export function ProfilePage({ data, accounts, activeUserId, actions }) {
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
    <div className="page" style={{ maxWidth: 720 }}>
      <section className="card profile-card">
        <Avatar name={user.fullName || user.name} size={60} />
        <div className="row-main">
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user.fullName || user.name}</div>
          <div className="muted small">{user.mobile}</div>
          <button type="button" className="link-btn" onClick={copy}>
            {user.upiId} <Copy size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>Bank account</h2>
        <div className="row" style={{ paddingTop: 0 }}>
          <span className="icon-circle" style={{ width: 44, height: 44 }}>
            <Landmark size={22} strokeWidth={1.8} />
          </span>
          <div className="row-main">
            <div className="row-title">{bankName(account)}</div>
            <div className="row-sub">Savings {account.accountNumberMasked} · Primary for UPI</div>
          </div>
        </div>
        <div className="muted small">
          Last checked balance {inr(metrics.verifiedBalance)} on {formatShortDate(metrics.lastBalanceCheckDate)}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Demo accounts</h2>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          Switch between the two accounts. Payments between them move money both ways.
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
              <Avatar name={acc.fullName || acc.name} size={40} />
              <div className="row-main">
                <div className="row-title">{acc.fullName || acc.name}</div>
                <div className="row-sub">
                  {acc.upiId} · {inr(acc.currentBalance)}
                </div>
              </div>
              {active && <Check size={20} color="var(--brand)" />}
            </button>
          );
        })}
      </section>

      <section className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <button type="button" className="menu-row" onClick={actions.checkBalance}>
          <span className="icon-circle" style={{ width: 36, height: 36 }}><Landmark size={18} /></span>
          <span className="row-main">Check bank balance</span>
          <ChevronRight size={18} color="var(--text-3)" />
        </button>
        <button type="button" className="menu-row" onClick={actions.changePin}>
          <span className="icon-circle" style={{ width: 36, height: 36 }}><KeyRound size={18} /></span>
          <span className="row-main">Change UPI PIN</span>
          <ChevronRight size={18} color="var(--text-3)" />
        </button>
        <button type="button" className="menu-row danger" onClick={actions.reset}>
          <span className="icon-circle" style={{ width: 36, height: 36 }}><RotateCcw size={18} /></span>
          <span className="row-main">
            Reset demo data
            <div className="row-sub">Restores both accounts, EMIs and transactions</div>
          </span>
        </button>
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>How FinCopilot works</h2>
        <div className="steps">
          <div className="step"><span><strong>Pay and receive with UPI.</strong> Every payment needs your 4-digit UPI PIN.</span></div>
          <div className="step"><span><strong>Add your EMIs.</strong> FinCopilot tracks when each one is due.</span></div>
          <div className="step"><span><strong>See what is safe to spend.</strong> Your balance minus upcoming EMIs, expected daily spending and a small buffer.</span></div>
          <div className="step"><span><strong>Get warned before you pay.</strong> If a payment would put an EMI at risk, you see it on the pay screen.</span></div>
        </div>
        <p className="muted small" style={{ marginTop: 16 }}>
          This is a demo. Accounts, banks and payments are simulated and no real money moves.
          {__BROWSER_DEMO__ && ' Everything runs in this browser and is saved only on this device.'}
        </p>
      </section>
    </div>
  );
}
