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
  const lastVerifiedDate = metrics?.lastBalanceCheckDate || account?.lastBalanceCheckDate;

  const quickContacts = [
    { name: 'Rahul Sharma', phone: '9123456780', upiId: 'rahul@fin', initial: 'R', color: '#6366F1' },
    { name: 'Priya Patel', phone: '9823456781', upiId: 'priya@okhdfc', initial: 'P', color: '#10B981' },
    { name: 'Amit Kumar (Landlord)', phone: '9988776655', upiId: 'amit@paytm', initial: 'A', color: '#F59E0B' },
    { name: 'Vikram Mehta', phone: '9012345678', upiId: 'vikram@icici', initial: 'V', color: '#EC4899' },
    { name: 'Ananya Roy', phone: '9345678901', upiId: 'ananya@fin', initial: 'A', color: '#38BDF8' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner Card */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(18, 24, 38, 0.9) 0%, rgba(30, 27, 75, 0.4) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Send size={20} color="#818CF8" />
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0 }}>
              UPI Payments Hub
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0, maxWidth: '480px' }}>
            Instant Indian UPI transfers using 10-digit mobile (+91) or UPI ID. Protected by 4-digit UPI PIN.
          </p>
        </div>

        {/* Current Balances & Actions */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Estimated Balance
            </div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#10B981' }}>
              ₹{estimatedBalance.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={onOpenPayment}
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700 }}
          >
            <Send size={15} />
            <span>Pay Now</span>
          </button>

          {onOpenCheckBalance && (
            <button
              onClick={onOpenCheckBalance}
              className="btn btn-secondary"
              style={{ padding: '9px 14px', fontSize: '0.84rem' }}
            >
              <Lock size={14} color="#818CF8" />
              <span>Check Balance</span>
            </button>
          )}
        </div>
      </div>

      {/* Send to Contacts (1-Click) */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              Send to Contacts
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Tap any contact to immediately start UPI payment
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
                minWidth: '85px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: `0 4px 14px ${c.color}40`,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {c.initial}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', textAlign: 'center' }}>
                {c.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          onClick={onOpenPayment}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smartphone size={22} color="#818CF8" />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>
              Pay to Mobile Number
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              +91 10-digit Indian numbers
            </div>
          </div>
        </div>

        <div
          onClick={onOpenPayment}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AtSign size={22} color="#38BDF8" />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>
              Pay to UPI ID / VPA
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              e.g. rahul@fin, user@upi
            </div>
          </div>
        </div>

        <div
          onClick={onOpenCheckBalance}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} color="#F59E0B" />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>
              Check Bank Balance
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Verify with 4-digit UPI PIN
            </div>
          </div>
        </div>

        <div
          onClick={onOpenReceive}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowDownLeft size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>
              Receive Money
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Simulate cash inflow
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payment History */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
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
                  padding: '12px 16px',
                  background: 'rgba(15, 21, 35, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isCredit ? 'var(--emerald-subtle)' : 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isCredit ? <ArrowDownLeft size={16} color="#10B981" /> : <ArrowUpRight size={16} color="#FB7185" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
                      {tx.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {tx.paymentMethod || 'UPI'} • {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isCredit ? '#34D399' : '#FB7185' }}>
                    {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
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

