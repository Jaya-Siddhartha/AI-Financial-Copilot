import React from 'react';
import { Clock, Building, Plus, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, DollarSign } from 'lucide-react';
import { EMISection } from '../components/EMISection';

export const EMIPage = ({
  dashboardData,
  activeUserId,
  onOpenAddEMI,
  onEMIUpdated,
}) => {
  const emis = dashboardData?.emis || [];
  const metrics = dashboardData?.metrics;
  const currency = dashboardData?.user?.currency || '₹';
  const currentBalance = Number(metrics?.currentBalance || 0);

  const totalMonthlyEMIBurden = emis.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Card */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
          border: '1px solid var(--amber-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '24px 28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Clock size={22} color="var(--amber)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', letterSpacing: '-0.02em' }}>
              EMI Obligations Manager
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
            Track and simulate loan commitments. FinCopilot uses these obligations to safeguard your funds and calculate Safe-to-Spend limits.
          </p>
        </div>

        {/* Total Monthly Burden */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Monthly EMI Burden
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--amber)' }}>
              {currency} {totalMonthlyEMIBurden.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={onOpenAddEMI}
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Add New EMI</span>
          </button>
        </div>
      </div>

      {/* EMI Section Card */}
      <EMISection
        emis={emis}
        currency={currency}
        currentBalance={currentBalance}
        activeUserId={activeUserId || dashboardData?.user?.id}
        onOpenAddEMI={onOpenAddEMI}
        onEMIUpdated={onEMIUpdated}
      />

      {/* Info & Education Card */}
      <div
        className="glass-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          padding: '20px 24px',
        }}
      >
        <ShieldCheck size={26} color="var(--emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-title)', marginBottom: '4px' }}>
            How FinCopilot Protects Your EMI Payments
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
            Unlike traditional banking apps that only show gross account balance, FinCopilot calculates your daily spending burn rate and reserves necessary funds before your EMI due date. If an unexpected expense threatens your ability to pay, FinCopilot raises an instant High-Risk warning.
          </p>
        </div>
      </div>
    </div>
  );
};
