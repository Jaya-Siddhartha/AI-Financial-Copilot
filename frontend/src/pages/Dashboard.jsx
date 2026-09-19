import React from 'react';
import {
  Wallet,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Send,
  ArrowDownLeft,
  Plus,
  ArrowLeftRight,
  Activity,
  CreditCard,
  Building,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { AIPredictionCard } from '../components/AIPredictionCard';
import { EMISection } from '../components/EMISection';
import { RecentTransactions } from '../components/RecentTransactions';

export const Dashboard = ({
  dashboardData,
  onNavigateToTransactions,
  onOpenCheckBalance,
  onOpenPayment,
  onOpenReceive,
  onOpenAddEMI,
  onEMIUpdated,
}) => {
  if (!dashboardData) return null;

  const {
    user,
    account,
    metrics = {},
    aiPrediction,
    emis = [],
    recentTransactions = [],
  } = dashboardData;

  const isSafe = metrics.riskStatus === 'SAFE';
  const isCaution = metrics.riskStatus === 'CAUTION';
  const isHighRisk = metrics.riskStatus === 'HIGH RISK';

  const statusColor = isSafe ? 'var(--emerald)' : isCaution ? 'var(--amber)' : 'var(--rose)';
  const statusBadge = isSafe ? 'badge-emerald' : isCaution ? 'badge-amber' : 'badge-rose';

  const formatCheckDate = (dateStr) => {
    if (!dateStr) return 'Not yet verified';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 5 Core Top Metrics Cards */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* 1. Estimated Current Balance */}
        <StatCard
          title="Current Estimated Balance"
          value={metrics.currentBalance}
          currency="₹"
          subtitle="From known transactions"
          icon={Wallet}
          accentColor="var(--emerald)"
          badgeText="Live UPI"
          badgeType="positive"
        />

        {/* 2. Last Verified Bank Balance */}
        <div
          onClick={onOpenCheckBalance}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}
          title="Click to verify with UPI PIN"
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'var(--primary)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Verified Bank Balance
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--primary-border)',
              }}
            >
              <Building size={18} color="var(--primary)" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              ₹{Number(metrics.verifiedBalance || metrics.currentBalance).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              {formatCheckDate(metrics.lastBalanceCheckDate)}
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              Verify PIN ➔
            </span>
          </div>
        </div>

        {/* 3. Available Safe-to-Spend */}
        <StatCard
          title="Available Safe-to-Spend"
          value={metrics.safeToSpend}
          currency="₹"
          subtitle="Protected after EMI"
          icon={Sparkles}
          accentColor="var(--primary)"
          badgeText="AI Calculated"
          badgeType="indigo"
        />

        {/* 4. Upcoming EMI */}
        <StatCard
          title="Upcoming EMI"
          value={metrics.totalUpcomingEMI}
          currency="₹"
          subtitle={metrics.nextEMI ? `${metrics.nextEMI.name}` : 'No active loan'}
          icon={Clock}
          accentColor="var(--amber)"
          badgeText={metrics.nextEMI ? `Due in ${metrics.nextEMI.daysRemaining || 10}d` : 'Clear'}
          badgeType="amber"
        />

        {/* 5. Financial Status */}
        <div
          className="glass-card glass-card-interactive"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderColor: isHighRisk ? 'var(--rose-border)' : isCaution ? 'var(--amber-border)' : 'var(--emerald-border)',
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: statusColor,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Financial Status
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: isSafe ? 'var(--emerald-light)' : isCaution ? 'var(--amber-light)' : 'var(--rose-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isSafe ? 'var(--emerald-border)' : isCaution ? 'var(--amber-border)' : 'var(--rose-border)'}`,
              }}
            >
              {isSafe ? <ShieldCheck size={19} color="var(--emerald)" /> : <AlertTriangle size={19} color={statusColor} />}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: statusColor, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {metrics.riskStatus}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {isHighRisk ? 'Shortfall Warning' : isCaution ? 'Tight Buffer' : 'Safe to Spend'}
            </span>
            <span className={`badge ${statusBadge}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {isSafe ? 'Affordable' : isCaution ? 'Monitor' : 'High Risk'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Quick Actions Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-title)' }}>
            UPI Quick Actions:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenPayment}
            className="btn btn-primary"
            style={{
              padding: '9px 20px',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <Send size={15} />
            <span>Pay Money</span>
          </button>

          <button
            onClick={onOpenCheckBalance}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Building size={14} color="var(--primary)" />
            <span>Check Bank Balance</span>
          </button>

          <button
            onClick={onOpenReceive}
            className="btn btn-emerald"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <ArrowDownLeft size={14} />
            <span>Receive Money</span>
          </button>

          <button
            onClick={onOpenAddEMI}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Plus size={14} />
            <span>Add EMI</span>
          </button>

          <button
            onClick={onNavigateToTransactions}
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.85rem', border: '1px solid var(--border-subtle)' }}
          >
            <ArrowLeftRight size={14} />
            <span>All Transactions</span>
          </button>
        </div>
      </div>

      {/* Verified vs Estimated Balance Explainer Note */}
      <div
        style={{
          background: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.84rem',
          color: 'var(--text-main)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Balance Synchronization:</strong> Your estimated balance (₹{Number(metrics.currentBalance || 0).toLocaleString('en-IN')}) is derived from your verified baseline plus all simulated UPI transactions. Click <em>Check Bank Balance</em> to enter PIN and refresh baseline.
          </span>
        </div>
        <button
          onClick={onOpenCheckBalance}
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}
        >
          Check Now ➔
        </button>
      </div>

      {/* AI Financial Prediction Card */}
      <AIPredictionCard
        aiPrediction={aiPrediction}
        onOpenPayments={onOpenPayment}
      />

      {/* Upcoming EMI Section */}
      <EMISection
        emis={emis}
        currency="₹"
        currentBalance={metrics.currentBalance}
        activeUserId={user?.id || 'user_siddhartha'}
        onOpenAddEMI={onOpenAddEMI}
        onEMIUpdated={onEMIUpdated}
      />

      {/* Recent Transactions List */}
      <RecentTransactions
        transactions={recentTransactions}
        currency="₹"
        onViewAll={onNavigateToTransactions}
      />
    </div>
  );
};
