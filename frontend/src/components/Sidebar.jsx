import React from 'react';
import {
  LayoutDashboard,
  Send,
  ArrowLeftRight,
  Clock,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Zap,
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, accountInfo, user }) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'payments',
      label: 'Pay & Transfer',
      icon: Send,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ArrowLeftRight,
    },
    {
      id: 'emis',
      label: 'EMI Obligations',
      icon: Clock,
    },
    {
      id: 'analysis',
      label: 'Financial Insights',
      icon: BrainCircuit,
    },
    {
      id: 'start',
      label: 'How It Works',
      icon: HelpCircle,
    },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
      minHeight: '100vh',
    }}>
      {/* Brand Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 8px 20px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          cursor: 'pointer',
        }}
        onClick={() => setActiveTab('dashboard')}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #4F46E5 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-primary)',
          color: '#FFFFFF',
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
            FinCopilot
          </h2>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)' }}></span>
            Indian UPI Guardian
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--text-faint)',
          letterSpacing: '0.08em',
          padding: '6px 12px 6px',
        }}>
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-surface-subtle)';
                  e.currentTarget.style.color = 'var(--text-title)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--emerald-light)',
                  color: 'var(--emerald-text)',
                  border: '1px solid var(--emerald-border)',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Account Info Card */}
      <div style={{
        marginTop: 'auto',
        background: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <ShieldCheck size={16} color="var(--emerald)" />
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-title)' }}>
            {user?.name || 'Active Account'}
          </span>
        </div>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
          {accountInfo?.bankName || 'Simulated Bank Account'}
        </p>
        <div style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Balance</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--emerald)' }}>
            ₹{Number(accountInfo?.currentBalance || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </aside>
  );
};
