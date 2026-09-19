import React, { useState, useRef, useEffect } from 'react';
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
  ShieldCheck,
  CreditCard,
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
  const switcherRef = useRef(null);

  const activeName = user?.name || 'Siddhartha';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
              Hello, {activeName}
            </h1>
            <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)' }}></span>
              UPI Active
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
            {user?.mobile || '+91 9876543210'} • {user?.upiId || `${activeName.toLowerCase()}@fin`} • {account?.bankName || 'HDFC Bank'}
          </p>
        </div>

        {/* Demo Account Switcher Dropdown */}
        <div style={{ position: 'relative' }} ref={switcherRef}>
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <User size={15} color="var(--primary)" />
            <span>Account: <strong>{activeName}</strong></span>
            <ChevronDown size={14} color="var(--primary)" />
          </button>

          {isSwitcherOpen && (
            <div
              style={{
                position: 'absolute',
                top: '115%',
                left: 0,
                width: '280px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                padding: '6px',
                animation: 'slideUp 0.15s ease-out',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', padding: '6px 10px 4px', fontWeight: 700 }}>
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
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ color: isSelected ? 'var(--primary)' : 'var(--text-title)', fontWeight: 700 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {acc.mobile} • ₹{Number(acc.currentBalance).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--emerald)" />}
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
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <Send size={15} />
            <span>Pay Money</span>
          </button>
        )}

        {onOpenCheckBalance && (
          <button
            onClick={onOpenCheckBalance}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Sparkles size={14} color="var(--primary)" />
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
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={onReset}
          className="btn btn-ghost"
          title="Reset Demo Dataset"
          style={{
            padding: '8px 12px',
            fontSize: '0.84rem',
            color: 'var(--rose)',
            border: '1px solid var(--rose-border)',
            background: 'var(--rose-light)',
          }}
        >
          <RotateCcw size={13} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
