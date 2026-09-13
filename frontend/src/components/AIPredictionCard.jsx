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
    nextEMI,
  } = aiPrediction;

  const isSafe = status === 'SAFE';
  const isCaution = status === 'CAUTION';
  const isHighRisk = status === 'HIGH RISK';

  const statusColor = isSafe ? '#10B981' : isCaution ? '#F59E0B' : '#F43F5E';
  const statusBg = isSafe
    ? 'rgba(16, 185, 129, 0.1)'
    : isCaution
    ? 'rgba(245, 158, 11, 0.1)'
    : 'rgba(244, 63, 94, 0.12)';
  const statusBorder = isSafe
    ? 'rgba(16, 185, 129, 0.3)'
    : isCaution
    ? 'rgba(245, 158, 11, 0.3)'
    : 'rgba(244, 63, 94, 0.4)';

  return (
    <div
      className="glass-card"
      style={{
        border: `1px solid ${statusBorder}`,
        background: `linear-gradient(135deg, ${statusBg} 0%, rgba(18, 24, 38, 0.85) 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSafe ? (
              <ShieldCheck size={24} color="#10B981" />
            ) : isCaution ? (
              <AlertTriangle size={24} color="#F59E0B" />
            ) : (
              <AlertTriangle size={24} color="#F43F5E" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                AI Financial Affordability & Prediction
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: statusBg,
                  color: statusColor,
                  border: `1px solid ${statusBorder}`,
                  letterSpacing: '0.04em',
                }}
              >
                {status}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              How much you can safely spend before your next EMI
            </div>
          </div>
        </div>

        {/* Safe to Spend Highlight Box */}
        <div
          style={{
            background: 'rgba(15, 21, 35, 0.85)',
            border: `1px solid ${isHighRisk ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
            Safe-To-Spend Right Now
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isHighRisk ? '#FB7185' : '#34D399' }}>
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
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.5 }}>
          {summary}
        </div>
        {advice && (
          <div style={{ fontSize: '0.82rem', color: statusColor, marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color={statusColor} />
            <span>AI Advice: {advice}</span>
          </div>
        )}
      </div>

      {/* Simple Financial Breakdown Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
        }}
      >
        {/* 1. Current Balance */}
        <div style={{ background: 'rgba(15, 21, 35, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Current Balance</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
            ₹{currentBalance.toLocaleString('en-IN')}
          </div>
        </div>

        {/* 2. Upcoming EMI */}
        <div style={{ background: 'rgba(15, 21, 35, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} color="#F59E0B" />
            <span>Upcoming EMI</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FCD34D', marginTop: '2px' }}>
            ₹{upcomingEMIAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
            Due in {daysUntilEMI} days
          </div>
        </div>

        {/* 3. Expected Normal Spending */}
        <div style={{ background: 'rgba(15, 21, 35, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={12} color="#FB7185" />
            <span>Expected Spending</span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FB7185', marginTop: '2px' }}>
            ₹{expectedNormalExpenses.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
            Before EMI date
          </div>
        </div>

        {/* 4. Safety Reserve */}
        <div style={{ background: 'rgba(15, 21, 35, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Safety Reserve</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>
            ₹{safetyReserve.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
            Protected cushion
          </div>
        </div>

        {/* 5. Safe to Spend */}
        <div style={{ background: 'rgba(15, 21, 35, 0.6)', border: `1px solid ${isHighRisk ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: isHighRisk ? '#FB7185' : '#34D399', textTransform: 'uppercase', fontWeight: 700 }}>
            Safe to Spend
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: isHighRisk ? '#FB7185' : '#34D399', marginTop: '2px' }}>
            ₹{safeToSpend.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
            Available budget
          </div>
        </div>
      </div>
    </div>
  );
};
