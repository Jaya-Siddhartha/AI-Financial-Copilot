import React, { useState } from 'react';
import {
  BrainCircuit,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { calculatePrediction } from '../services/predictionEngine';

export const AnalysisPage = ({ dashboardData, onOpenPayment, onOpenCheckBalance }) => {
  const [hypotheticalExpense, setHypotheticalExpense] = useState(0);

  const account = dashboardData?.account;
  const metrics = dashboardData?.metrics;
  const rawPrediction = dashboardData?.aiPrediction;
  const emis = dashboardData?.emis || [];
  const transactions = dashboardData?.recentTransactions || [];

  const estimatedBalance = Number(metrics?.currentBalance ?? account?.currentBalance ?? 50000);
  const verifiedBalance = Number(metrics?.verifiedBalance ?? account?.verifiedBalance ?? estimatedBalance);
  const lastVerifiedDate = metrics?.lastBalanceCheckDate || account?.lastBalanceCheckDate;

  // Formatted date string
  const formattedLastCheck = lastVerifiedDate
    ? new Date(lastVerifiedDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not verified recently';

  // Recalculate with hypothetical simulation
  const simulated = calculatePrediction({
    currentBalance: estimatedBalance,
    emis,
    transactions,
    extraHypotheticalExpense: Number(hypotheticalExpense) || 0,
  });

  const isSafe = simulated.status === 'SAFE';
  const isCaution = simulated.status === 'CAUTION';
  const isHighRisk = simulated.status === 'HIGH RISK';

  const statusColor = isSafe ? '#10B981' : isCaution ? '#F59E0B' : '#F43F5E';
  const statusBg = isSafe ? 'rgba(16, 185, 129, 0.12)' : isCaution ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 63, 94, 0.15)';
  const statusBorder = isSafe ? 'rgba(16, 185, 129, 0.3)' : isCaution ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.4)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          background: `linear-gradient(135deg, ${statusBg} 0%, rgba(18, 24, 38, 0.95) 100%)`,
          border: `1px solid ${statusBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrainCircuit size={28} color={statusColor} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                AI Financial Status
              </h2>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: statusBg,
                  color: statusColor,
                  border: `1px solid ${statusBorder}`,
                }}
              >
                {simulated.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Answering the core question: "Can I safely spend without putting my upcoming EMI at risk?"
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Safe-To-Spend
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: isHighRisk ? '#FB7185' : '#34D399' }}>
              ₹{simulated.safeToSpend.toLocaleString('en-IN')}
            </div>
          </div>
          {onOpenPayment && (
            <button
              onClick={onOpenPayment}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.86rem' }}
            >
              Pay Money
            </button>
          )}
        </div>
      </div>

      {/* Uncertainty & Bank Balance Verification Notice */}
      <div
        className="glass-card"
        style={{
          background: 'rgba(15, 21, 35, 0.7)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '650px' }}>
          <Info size={20} color="#818CF8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFFFFF' }}>
              Balance Accuracy & Verification Baseline
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.5 }}>
              Estimated balance is calculated from transactions recorded since your last bank balance check.
              To reset the baseline to your exact bank balance, check balance with your UPI PIN.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Last Bank Check</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>{formattedLastCheck}</div>
          </div>
          {onOpenCheckBalance && (
            <button
              onClick={onOpenCheckBalance}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={13} color="#818CF8" />
              <span>Verify Bank</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Plain-English Summary Box */}
      <div className="glass-card" style={{ border: `1px solid ${statusBorder}`, background: 'rgba(15, 21, 35, 0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {isSafe ? <ShieldCheck size={22} color="#10B981" /> : <AlertTriangle size={22} color={statusColor} />}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
            Financial Assessment & AI Recommendation
          </h3>
        </div>

        <p style={{ fontSize: '0.96rem', color: '#FFFFFF', lineHeight: 1.6, margin: '0 0 14px 0' }}>
          {simulated.summary}
        </p>

        <div
          style={{
            background: statusBg,
            border: `1px solid ${statusBorder}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '0.88rem',
            color: statusColor,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color={statusColor} />
          <span>AI Guidance: {simulated.recommendation}</span>
        </div>
      </div>

      {/* Step-by-Step Plain-English Formula Calculation */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px 0', color: '#FFFFFF' }}>
          How FinCopilot Calculates "Safe to Spend"
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Estimated Balance */}
          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              1. Estimated Balance
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              ₹{estimatedBalance.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Current available funds
            </div>
          </div>

          {/* Minus Upcoming EMI */}
          <div
            style={{
              padding: '14px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#FCD34D', textTransform: 'uppercase' }}>
              - 2. Upcoming EMI
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FCD34D', marginTop: '4px' }}>
              ₹{simulated.upcomingEMIAmount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Due in {simulated.daysUntilEMI} days
            </div>
          </div>

          {/* Minus Expected Spending */}
          <div
            style={{
              padding: '14px',
              background: 'rgba(244, 63, 94, 0.05)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#FB7185', textTransform: 'uppercase' }}>
              - 3. Expected Expenses
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FB7185', marginTop: '4px' }}>
              ₹{simulated.estimatedExpenses.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              ~₹{simulated.dailyBurnRate}/day spending
            </div>
          </div>

          {/* Minus Safety Buffer */}
          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              - 4. Emergency Buffer
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '4px' }}>
              ₹{simulated.safetyBuffer.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Emergency cushion
            </div>
          </div>

          {/* Equals Safe-to-Spend */}
          <div
            style={{
              padding: '14px',
              background: isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${statusBorder}`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: isSafe ? '#34D399' : '#FB7185', textTransform: 'uppercase', fontWeight: 700 }}>
              = Safe To Spend
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isSafe ? '#34D399' : '#FB7185', marginTop: '4px' }}>
              ₹{simulated.safeToSpend.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Protected against EMI risk
            </div>
          </div>
        </div>
      </div>

      {/* Interactive "What-If" Spending Simulator */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#818CF8" />
              <span>Interactive "What-If" Spending Simulator</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Simulate spending money today to see if your upcoming EMI remains protected (does not modify your real account)
            </p>
          </div>

          {hypotheticalExpense > 0 && (
            <button
              onClick={() => setHypotheticalExpense(0)}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              <RefreshCw size={13} />
              <span>Reset Simulator</span>
            </button>
          )}
        </div>

        {/* Preset Amount Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Quick Test:
          </span>
          {[2000, 5000, 10000, 15000, 25000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setHypotheticalExpense(amt)}
              className={`btn ${hypotheticalExpense === amt ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              ₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        {/* Custom Slider / Input */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <input
              type="range"
              min="0"
              max={estimatedBalance}
              step="500"
              value={hypotheticalExpense}
              onChange={(e) => setHypotheticalExpense(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#6366F1' }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
            Simulated Spend: ₹{Number(hypotheticalExpense).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Live Simulator Results Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: 'rgba(15, 21, 35, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Simulated New Balance</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
              ₹{simulated.currentBalance.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Upcoming EMI Obligation</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FCD34D', marginTop: '2px' }}>
              ₹{simulated.upcomingEMIAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Safe-to-Spend After Purchase</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: simulated.safeToSpend > 0 ? '#34D399' : '#FB7185', marginTop: '2px' }}>
              ₹{simulated.safeToSpend.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Simulated Status</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: statusColor, marginTop: '2px' }}>
              {simulated.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

