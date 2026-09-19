import React from 'react';
import {
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Lock,
  Wallet,
  Shield,
  ArrowRight,
} from 'lucide-react';

export const AIPredictionCard = ({ aiPrediction, onOpenPayments }) => {
  if (!aiPrediction) return null;

  const {
    status = 'SAFE',
    summary = '',
    advice = '',
    currentBalance = 50000,
    upcomingEMIAmount = 20000,
    daysUntilEMI = 10,
    expectedNormalExpenses = 11430,
    safetyReserve = 2000,
    safeToSpend = 16570,
    balanceAfterObligations = 30000,
    reasons = [],
    nextEMI,
  } = aiPrediction;

  const isSafe = status === 'SAFE';
  const isCaution = status === 'CAUTION';
  const isHighRisk = status === 'HIGH RISK';

  const statusColor = isSafe ? 'var(--emerald)' : isCaution ? 'var(--amber)' : 'var(--rose)';
  const statusBg = isSafe
    ? 'var(--emerald-light)'
    : isCaution
    ? 'var(--amber-light)'
    : 'var(--rose-light)';
  const statusBorder = isSafe
    ? 'var(--emerald-border)'
    : isCaution
    ? 'var(--amber-border)'
    : 'var(--rose-border)';
  const statusBadgeClass = isSafe ? 'badge-emerald' : isCaution ? 'badge-amber' : 'badge-rose';

  return (
    <div
      className="glass-card"
      style={{
        border: `1px solid ${statusBorder}`,
        background: 'var(--bg-surface)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSafe ? (
              <ShieldCheck size={24} color="var(--emerald)" />
            ) : isCaution ? (
              <AlertTriangle size={24} color="var(--amber)" />
            ) : (
              <AlertTriangle size={24} color="var(--rose)" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
                AI Financial Affordability & Outlook
              </h3>
              <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                {status}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Predictive cash flow defense before your upcoming EMI commitments
            </div>
          </div>
        </div>

        {/* Safe to Spend Highlight Box */}
        <div
          style={{
            background: isHighRisk ? 'var(--rose-light)' : 'var(--emerald-light)',
            border: `1px solid ${isHighRisk ? 'var(--rose-border)' : 'var(--emerald-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: isHighRisk ? 'var(--rose-text)' : 'var(--emerald-text)', textTransform: 'uppercase', fontWeight: 700 }}>
            Safe-To-Spend Right Now
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isHighRisk ? 'var(--rose)' : 'var(--emerald)' }}>
            ₹{safeToSpend.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Summary Message Banner */}
      <div
        style={{
          background: statusBg,
          border: `1px solid ${statusBorder}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '18px',
        }}
      >
        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-title)', lineHeight: 1.5 }}>
          {summary}
        </div>
        {advice && (
          <div style={{ fontSize: '0.86rem', color: statusColor, marginTop: '8px', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Sparkles size={16} color={statusColor} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span><strong>Copilot Recommendation:</strong> {advice}</span>
          </div>
        )}
      </div>

      {/* Simple Financial Breakdown Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 1. Current Balance */}
        <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Balance</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '4px' }}>
            ₹{currentBalance.toLocaleString('en-IN')}
          </div>
        </div>

        {/* 2. Upcoming EMI */}
        <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--amber-text)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={13} color="var(--amber)" />
            <span>Upcoming EMI</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--amber)', marginTop: '4px' }}>
            ₹{upcomingEMIAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Due in {daysUntilEMI} days
          </div>
        </div>

        {/* 3. Expected Normal Spending */}
        <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={13} color="var(--primary)" />
            <span>Expected Spending</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '4px' }}>
            ₹{expectedNormalExpenses.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Before EMI date
          </div>
        </div>

        {/* 4. Safety Reserve */}
        <div style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Safety Buffer</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '4px' }}>
            ₹{safetyReserve.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Protected cushion
          </div>
        </div>

        {/* 5. Safe to Spend */}
        <div style={{ background: isHighRisk ? 'var(--rose-light)' : 'var(--emerald-light)', border: `1px solid ${isHighRisk ? 'var(--rose-border)' : 'var(--emerald-border)'}`, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', color: isHighRisk ? 'var(--rose-text)' : 'var(--emerald-text)', textTransform: 'uppercase', fontWeight: 700 }}>
            Safe to Spend
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isHighRisk ? 'var(--rose)' : 'var(--emerald)', marginTop: '4px' }}>
            ₹{safeToSpend.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: isHighRisk ? 'var(--rose-text)' : 'var(--emerald-text)', marginTop: '2px' }}>
            Free spending margin
          </div>
        </div>
      </div>
    </div>
  );
};
