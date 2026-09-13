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
    metrics,
    aiPrediction,
    emis = [],
    recentTransactions = [],
  } = dashboardData;

  const isSafe = metrics.riskStatus === 'SAFE';
  const isCaution = metrics.riskStatus === 'CAUTION';
  const isHighRisk = metrics.riskStatus === 'HIGH RISK';

  const statusColor = isSafe ? '#10B981' : isCaution ? '#F59E0B' : '#F43F5E';

  const formatCheckDate = (dateStr) => {
    if (!dateStr) return 'Not yet checked';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 5 Core Top Metrics Cards */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* 1. Estimated Current Balance */}
        <StatCard
          title="Current Estimated Balance"
          value={metrics.currentBalance}
          currency="₹"
          subtitle={`From known transactions`}
          icon={Wallet}
          accentColor="#10B981"
          badgeText="Live UPI"
          badgeType="positive"
        />

        {/* 2. Last Verified Bank Balance */}
        <div
          onClick={onOpenCheckBalance}
          className="glass-card glass-card-interactive"
          style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          title="Click to verify with UPI PIN"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Last Verified Balance
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={16} color="#818CF8" />
            </div>
          </div>

          <div style={{ margin: '8px 0 4px 0' }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF' }}>
              ₹{Number(metrics.verifiedBalance || metrics.currentBalance).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-faint)' }}>
              {formatCheckDate(metrics.lastBalanceCheckDate)}
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
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
          accentColor="#6366F1"
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
          accentColor="#F59E0B"
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
            borderColor: isHighRisk ? 'rgba(244, 63, 94, 0.4)' : isCaution ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)',
            padding: '16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Financial Status
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isSafe ? 'rgba(16, 185, 129, 0.15)' : isCaution ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSafe ? <ShieldCheck size={18} color="#10B981" /> : <AlertTriangle size={18} color={statusColor} />}
            </div>
          </div>

          <div style={{ margin: '8px 0 4px 0' }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: statusColor, letterSpacing: '-0.02em' }}>
              {metrics.riskStatus}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
              {isHighRisk ? 'Shortfall Warning' : isCaution ? 'Tight Buffer' : 'Safe to Spend'}
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: isSafe ? 'rgba(16, 185, 129, 0.1)' : isCaution ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                color: statusColor,
              }}
            >
              {isSafe ? 'Affordable' : isCaution ? 'Monitor' : 'Risk'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Actions Bar (Pay Money with strong visual priority) */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(18, 24, 38, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#818CF8" />
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
            UPI Quick Actions:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenPayment}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 700,
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
            }}
          >
            <Send size={16} />
            <span>Pay Money</span>
          </button>

          <button
            onClick={onOpenCheckBalance}
            className="btn btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.86rem', borderColor: 'rgba(99, 102, 241, 0.4)' }}
          >
            <Building size={15} color="#818CF8" />
            <span>Check Bank Balance</span>
          </button>

          <button
            onClick={onOpenReceive}
            className="btn btn-emerald"
            style={{ padding: '9px 16px', fontSize: '0.86rem' }}
          >
            <ArrowDownLeft size={15} />
            <span>Receive Money</span>
          </button>

          <button
            onClick={onOpenAddEMI}
            className="btn btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.86rem' }}
          >
            <Plus size={15} />
            <span>Add EMI</span>
          </button>

          <button
            onClick={onNavigateToTransactions}
            className="btn btn-ghost"
            style={{ padding: '9px 14px', fontSize: '0.86rem', border: '1px solid var(--border-subtle)' }}
          >
            <ArrowLeftRight size={15} />
            <span>All Transactions</span>
          </button>
        </div>
      </div>

      {/* Verified vs Estimated Balance Explainer Note */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={18} color="#818CF8" style={{ flexShrink: 0 }} />
          <span>
            <strong>Balance Sync:</strong> Your estimated balance (₹{metrics.currentBalance.toLocaleString('en-IN')}) is calculated from verified balance + transactions recorded inside FinCopilot. Click <em>Check Bank Balance</em> anytime to refresh your bank baseline.
          </span>
        </div>
        <button
          onClick={onOpenCheckBalance}
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#818CF8' }}
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
