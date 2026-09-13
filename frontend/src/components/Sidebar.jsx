import React from 'react';
import {
  LayoutDashboard,
  Send,
  ArrowLeftRight,
  Clock,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, accountInfo, user }) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Home / Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'payments',
      label: 'Pay Money',
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
      label: 'AI Analysis',
      icon: BrainCircuit,
    },
  ];

  return (
    <aside style={{
      width: '250px',
      background: 'rgba(12, 17, 29, 0.95)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 8px 24px 8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366F1 0%, #10B981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
        }}>
          <Sparkles size={22} color="#FFFFFF" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            FinCopilot
          </h2>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
            Indian UPI & AI Copilot
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--text-faint)',
          letterSpacing: '0.08em',
          padding: '4px 12px 8px',
        }}>
          Menu
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
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={19} color={isActive ? '#818CF8' : 'currentColor'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Account Info Card */}
      <div style={{
        marginTop: 'auto',
        background: 'rgba(18, 24, 38, 0.8)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <ShieldCheck size={16} color="#10B981" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF' }}>
            {user?.name || 'Active Account'}
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
          {accountInfo?.bankName || 'Simulated Bank Account'}
        </p>
        <div style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Balance</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10B981' }}>
            ₹{Number(accountInfo?.currentBalance || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </aside>
  );
};
