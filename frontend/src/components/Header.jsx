import React, { useState } from 'react';
import {
  Send,
  ArrowDownLeft,
  Plus,
  RotateCcw,
  RefreshCw,
  User,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';

export const Header = ({
  user,
  account,
  allAccounts = [],
  activeUserId,
  onSwitchAccount,
  onReset,
  onRefresh,
  onOpenCheckBalance,
  onOpenPayment,
  onOpenReceive,
  onOpenAddEMI,
  isLoading,
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const activeName = user?.name || 'Siddhartha';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '24px',
      paddingBottom: '18px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Left: User Title & Account Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Hello, {activeName}
            </h1>
            <span className="badge badge-emerald">UPI Active</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            {user?.mobile || '+91 9876543210'} • {user?.upiId || `${activeName.toLowerCase()}@fin`}
          </p>
        </div>

        {/* Demo Account Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={15} color="#818CF8" />
            <span>Switch Account: <strong style={{ color: '#A5B4FC' }}>{activeName}</strong></span>
            <ChevronDown size={14} color="#818CF8" />
          </button>

          {isSwitcherOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                width: '260px',
                background: '#111726',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                zIndex: 100,
                padding: '6px',
                animation: 'slideUp 0.15s ease-out',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', padding: '6px 8px 4px' }}>
                Simulated Demo Accounts
              </div>

              {allAccounts.map((acc) => {
                const isSelected = acc.id === activeUserId || acc.name === activeName;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onSwitchAccount(acc.id);
                      setIsSwitcherOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      border: 'none',
                      color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  >
                    <div>
                      <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                        {acc.mobile} • ₹{Number(acc.currentBalance).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#10B981" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {onOpenPayment && (
          <button
            onClick={onOpenPayment}
            className="btn btn-primary"
            style={{
              padding: '9px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Send size={16} />
            <span>Pay Money</span>
          </button>
        )}

        {onOpenCheckBalance && (
          <button
            onClick={onOpenCheckBalance}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', borderColor: 'rgba(99, 102, 241, 0.4)' }}
          >
            <Sparkles size={15} color="#818CF8" />
            <span>Check Balance</span>
          </button>
        )}

        {onOpenReceive && (
          <button
            onClick={onOpenReceive}
            className="btn btn-emerald"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <ArrowDownLeft size={15} />
            <span>Receive Money</span>
          </button>
        )}

        {onOpenAddEMI && (
          <button
            onClick={onOpenAddEMI}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Plus size={15} />
            <span>Add EMI</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-secondary"
          title="Refresh Data"
          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={onReset}
          className="btn btn-ghost"
          title="Reset Demo Dataset"
          style={{
            padding: '8px 12px',
            fontSize: '0.85rem',
            color: '#FB7185',
            border: '1px solid rgba(244, 63, 94, 0.25)',
          }}
        >
          <RotateCcw size={14} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
