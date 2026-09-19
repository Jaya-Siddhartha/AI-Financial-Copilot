import React from 'react';
import {
  Smartphone,
  QrCode,
  CreditCard,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Zap,
  CheckCircle,
  Lock,
  AtSign,
} from 'lucide-react';

export const PaymentsPage = ({
  dashboardData,
  onOpenPaymentWithContact,
  onOpenPayment,
  onOpenReceive,
  onOpenCheckBalance,
}) => {
  const account = dashboardData?.account;
  const metrics = dashboardData?.metrics;
  const recentTxs = dashboardData?.recentTransactions || [];

  const estimatedBalance = Number(metrics?.currentBalance ?? account?.currentBalance ?? 0);
  const verifiedBalance = Number(metrics?.verifiedBalance ?? account?.verifiedBalance ?? estimatedBalance);

  const quickContacts = [
    { name: 'Rahul Sharma', phone: '9123456780', upiId: 'rahul@fin', initial: 'R', color: '#4F46E5' },
    { name: 'Priya Patel', phone: '9823456781', upiId: 'priya@okhdfc', initial: 'P', color: '#059669' },
    { name: 'Amit Kumar (Landlord)', phone: '9988776655', upiId: 'amit@paytm', initial: 'A', color: '#D97706' },
    { name: 'Vikram Mehta', phone: '9012345678', upiId: 'vikram@icici', initial: 'V', color: '#7C3AED' },
    { name: 'Ananya Roy', phone: '9345678901', upiId: 'ananya@fin', initial: 'A', color: '#0284C7' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Card */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)',
          border: '1px solid var(--primary-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '24px 28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Send size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
              UPI Payments Hub
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
            Instant simulated Indian UPI transfers to 10-digit mobile numbers (+91) or UPI IDs with PIN authorization.
          </p>
        </div>

        {/* Current Balances & Actions */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Available Balance
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald)' }}>
              ₹{estimatedBalance.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={onOpenPayment}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <Send size={15} />
            <span>Pay Now</span>
          </button>

          {onOpenCheckBalance && (
            <button
              onClick={onOpenCheckBalance}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.86rem' }}
            >
              <Lock size={15} color="var(--primary)" />
              <span>Check Balance</span>
            </button>
          )}
        </div>
      </div>

      {/* Send to Contacts (1-Click) */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
              Send to Contacts
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Tap any contact to immediately launch the UPI payment modal
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
          {quickContacts.map((c) => (
            <button
              key={c.phone}
              type="button"
              onClick={() => onOpenPaymentWithContact(c)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                minWidth: '90px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  boxShadow: `0 4px 14px ${c.color}35`,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {c.initial}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-title)', textAlign: 'center' }}>
                {c.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div
          onClick={onOpenPayment}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smartphone size={22} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-title)' }}>
              Pay to Mobile Number
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              +91 10-digit Indian numbers
            </div>
          </div>
        </div>

        <div
          onClick={onOpenPayment}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--blue-light)',
              border: '1px solid var(--blue-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AtSign size={22} color="var(--blue)" />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-title)' }}>
              Pay to UPI ID / VPA
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              e.g. rahul@fin, user@upi
            </div>
          </div>
        </div>

        <div
          onClick={onOpenCheckBalance}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--amber-light)',
              border: '1px solid var(--amber-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-title)' }}>
              Check Bank Balance
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Verify with 4-digit UPI PIN
            </div>
          </div>
        </div>

        <div
          onClick={onOpenReceive}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--emerald-light)',
              border: '1px solid var(--emerald-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownLeft size={22} color="var(--emerald)" />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-title)' }}>
              Receive Money
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Simulate cash inflow
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payment History */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
            Recent Payment History
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recentTxs.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <div
                key={tx._id || tx.id || Math.random()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      background: isCredit ? 'var(--emerald-light)' : 'var(--bg-surface)',
                      border: isCredit ? '1px solid var(--emerald-border)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isCredit ? <ArrowDownLeft size={16} color="var(--emerald)" /> : <ArrowUpRight size={16} color="var(--rose)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-title)' }}>
                      {tx.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {tx.paymentMethod || 'UPI'} • {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: isCredit ? 'var(--emerald)' : 'var(--rose)' }}>
                    {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}>
                    Completed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
