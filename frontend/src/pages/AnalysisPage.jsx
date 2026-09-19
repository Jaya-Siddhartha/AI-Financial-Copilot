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
  Calendar,
  TrendingDown,
  Activity,
  Layers,
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

  // Baseline prediction (BEFORE)
  const baseline = calculatePrediction({
    currentBalance: estimatedBalance,
    emis,
    transactions,
    extraHypotheticalExpense: 0,
  });

  // Simulated prediction (AFTER)
  const simulated = calculatePrediction({
    currentBalance: estimatedBalance,
    emis,
    transactions,
    extraHypotheticalExpense: Number(hypotheticalExpense) || 0,
  });

  const isSafe = simulated.status === 'SAFE';
  const isCaution = simulated.status === 'CAUTION';
  const isHighRisk = simulated.status === 'HIGH RISK';

  const statusColor = isSafe ? 'var(--emerald)' : isCaution ? 'var(--amber)' : 'var(--rose)';
  const statusBg = isSafe ? 'var(--emerald-light)' : isCaution ? 'var(--amber-light)' : 'var(--rose-light)';
  const statusBorder = isSafe ? 'var(--emerald-border)' : isCaution ? 'var(--amber-border)' : 'var(--rose-border)';
  const statusBadge = isSafe ? 'badge-emerald' : isCaution ? 'badge-amber' : 'badge-rose';

  // Projected 7-day outlook
  const projectedDays = simulated.projected7Days || baseline.projected7Days || [];
  // Forecast horizons (30, 60, 90)
  const horizons = simulated.forecastHorizons || baseline.forecastHorizons || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${statusBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
                AI Financial Status & Intelligence
              </h2>
              <span className={`badge ${statusBadge}`} style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                {simulated.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Know what you can safely spend before your upcoming EMI commitments are due
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Safe-To-Spend
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: isHighRisk ? 'var(--rose)' : 'var(--emerald)' }}>
              ₹{simulated.safeToSpend.toLocaleString('en-IN')}
            </div>
          </div>
          {onOpenPayment && (
            <button
              onClick={onOpenPayment}
              className="btn btn-primary"
              style={{ padding: '9px 20px', fontSize: '0.88rem', fontWeight: 700 }}
            >
              Pay Money
            </button>
          )}
        </div>
      </div>

      {/* Uncertainty & Bank Balance Verification Notice */}
      <div
        style={{
          background: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '680px' }}>
          <Info size={20} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-title)' }}>
              Balance Accuracy & Verification Baseline
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.5 }}>
              Estimated balance is calculated from transactions recorded since your last bank balance check.
              To reset the baseline to your exact bank balance, check balance with your UPI PIN.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Bank Check</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-title)' }}>{formattedLastCheck}</div>
          </div>
          {onOpenCheckBalance && (
            <button
              onClick={onOpenCheckBalance}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={13} color="var(--primary)" />
              <span>Verify Bank</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Plain-English Summary Box */}
      <div className="glass-card" style={{ border: `1px solid ${statusBorder}`, background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {isSafe ? <ShieldCheck size={22} color="var(--emerald)" /> : <AlertTriangle size={22} color={statusColor} />}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
            Financial Assessment & AI Recommendation
          </h3>
        </div>

        <p style={{ fontSize: '0.96rem', color: 'var(--text-main)', lineHeight: 1.6, margin: '0 0 14px 0', fontWeight: 500 }}>
          {simulated.summary}
        </p>

        <div
          style={{
            background: statusBg,
            border: `1px solid ${statusBorder}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.88rem',
            color: statusColor,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color={statusColor} style={{ flexShrink: 0 }} />
          <span>AI Guidance: {simulated.advice || simulated.recommendation}</span>
        </div>
      </div>

      {/* Step-by-Step Plain-English Formula Calculation */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-title)' }}>
          How FinCopilot Calculates "Safe to Spend"
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '14px',
            alignItems: 'center',
          }}
        >
          {/* Estimated Balance */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              1. Estimated Balance
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '4px' }}>
              ₹{estimatedBalance.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Current available funds
            </div>
          </div>

          {/* Minus Upcoming EMI */}
          <div
            style={{
              padding: '16px',
              background: 'var(--amber-light)',
              border: '1px solid var(--amber-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--amber-text)', textTransform: 'uppercase', fontWeight: 700 }}>
              - 2. Upcoming EMI
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--amber)', marginTop: '4px' }}>
              ₹{simulated.upcomingEMIAmount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--amber-text)', marginTop: '2px' }}>
              Due in {simulated.daysUntilEMI} days
            </div>
          </div>

          {/* Minus Expected Spending */}
          <div
            style={{
              padding: '16px',
              background: 'var(--rose-light)',
              border: '1px solid var(--rose-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--rose-text)', textTransform: 'uppercase', fontWeight: 700 }}>
              - 3. Expected Expenses
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--rose)', marginTop: '4px' }}>
              ₹{simulated.expectedNormalExpenses || simulated.estimatedExpenses || 0}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--rose-text)', marginTop: '2px' }}>
              ~₹{simulated.dailyBurnRate}/day burn
            </div>
          </div>

          {/* Minus Safety Buffer */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              - 4. Emergency Buffer
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '4px' }}>
              ₹{simulated.safetyReserve || simulated.safetyBuffer || 2000}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Protected cushion
            </div>
          </div>

          {/* Equals Safe-to-Spend */}
          <div
            style={{
              padding: '16px',
              background: isSafe ? 'var(--emerald-light)' : 'var(--rose-light)',
              border: `1px solid ${statusBorder}`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: isSafe ? 'var(--emerald-text)' : 'var(--rose-text)', textTransform: 'uppercase', fontWeight: 800 }}>
              = Safe To Spend
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isSafe ? 'var(--emerald)' : 'var(--rose)', marginTop: '4px' }}>
              ₹{simulated.safeToSpend.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: isSafe ? 'var(--emerald-text)' : 'var(--rose-text)', marginTop: '2px' }}>
              Protected against EMI risk
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Daily Projected Balance Outlook */}
      {projectedDays.length > 0 && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
                7-Day Balance Trajectory Outlook
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Day-by-day simulated balance progression considering daily velocity and obligations
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {projectedDays.map((p, idx) => {
              const isLow = p.projectedBalance < (simulated.safetyReserve || 2000);
              return (
                <div
                  key={idx}
                  style={{
                    background: isLow ? 'var(--rose-light)' : 'var(--bg-surface-subtle)',
                    border: `1px solid ${isLow ? 'var(--rose-border)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Day {p.day} ({p.date})
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isLow ? 'var(--rose)' : 'var(--text-title)', margin: '4px 0' }}>
                    ₹{Number(p.projectedBalance).toLocaleString('en-IN')}
                  </div>
                  {p.hasEMI && (
                    <span className="badge badge-amber" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                      EMI Due
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Horizon Cash Flow Forecasts (30, 60, 90 Days) */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-title)' }}>
          Multi-Horizon Cash Flow Forecasts
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            { key: 'd30', label: '30-Day Outlook', data: horizons.d30 || { projectedBalance: estimatedBalance - 15000, riskStatus: 'SAFE' } },
            { key: 'd60', label: '60-Day Horizon', data: horizons.d60 || { projectedBalance: estimatedBalance - 28000, riskStatus: 'SAFE' } },
            { key: 'd90', label: '90-Day Quarter', data: horizons.d90 || { projectedBalance: estimatedBalance - 42000, riskStatus: 'CAUTION' } },
          ].map((h) => {
            const hRisk = h.data.riskStatus || 'SAFE';
            const hBadge = hRisk === 'SAFE' ? 'badge-emerald' : hRisk === 'CAUTION' ? 'badge-amber' : 'badge-rose';
            return (
              <div
                key={h.key}
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-title)' }}>{h.label}</span>
                  <span className={`badge ${hBadge}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {hRisk}
                  </span>
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-title)' }}>
                  ₹{Number(h.data.projectedBalance || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Estimated projected liquidity
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive "What-If" Spending Simulator with Side-by-Side Comparison */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="var(--primary)" />
              <span>Interactive "What-If" Spending Simulator</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Simulate spending money today to see if your upcoming EMI remains protected (sandbox simulation — does not mutate ledger)
            </p>
          </div>

          {hypotheticalExpense > 0 && (
            <button
              onClick={() => setHypotheticalExpense(0)}
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '6px 12px', border: '1px solid var(--border-subtle)' }}
            >
              <RefreshCw size={13} />
              <span>Reset Simulator</span>
            </button>
          )}
        </div>

        {/* Preset Amount Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <input
              type="range"
              min="0"
              max={estimatedBalance}
              step="500"
              value={hypotheticalExpense}
              onChange={(e) => setHypotheticalExpense(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
            Simulated Spend: ₹{Number(hypotheticalExpense).toLocaleString('en-IN')}
          </div>
        </div>

        {/* BEFORE vs. AFTER Side-by-Side Comparison */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Financial Metric</th>
                <th style={{ padding: '12px 16px' }}>Current (Before)</th>
                <th style={{ padding: '12px 16px' }}>Simulated (After)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Impact ($\Delta$)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-title)' }}>Available Balance</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 600 }}>₹{baseline.currentBalance.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-title)', fontWeight: 700 }}>₹{simulated.currentBalance.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: hypotheticalExpense > 0 ? 'var(--rose)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {hypotheticalExpense > 0 ? `-₹${hypotheticalExpense.toLocaleString('en-IN')}` : '₹0'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-title)' }}>Safe-to-Spend Limit</td>
                <td style={{ padding: '12px 16px', color: 'var(--emerald)', fontWeight: 700 }}>₹{baseline.safeToSpend.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', color: simulated.safeToSpend > 0 ? 'var(--emerald)' : 'var(--rose)', fontWeight: 800 }}>
                  ₹{simulated.safeToSpend.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: hypotheticalExpense > 0 ? 'var(--rose)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {hypotheticalExpense > 0 ? `-₹${hypotheticalExpense.toLocaleString('en-IN')}` : '₹0'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-title)' }}>Risk Status Tier</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${baseline.status === 'SAFE' ? 'badge-emerald' : baseline.status === 'CAUTION' ? 'badge-amber' : 'badge-rose'}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {baseline.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${statusBadge}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {simulated.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: simulated.status !== baseline.status ? 'var(--rose)' : 'var(--emerald)' }}>
                  {simulated.status !== baseline.status ? `⚠️ Changed to ${simulated.status}` : '✓ No Status Shift'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-title)' }}>Upcoming EMI Protection</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>₹{baseline.upcomingEMIAmount.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>₹{simulated.upcomingEMIAmount.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: simulated.safeToSpend < 0 ? 'var(--rose)' : 'var(--emerald)' }}>
                  {simulated.safeToSpend < 0 ? '❌ Potential EMI Default' : '✓ Full EMI Reserved'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
