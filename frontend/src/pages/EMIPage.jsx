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
  const activeUnpaidEMIs = emis.filter((e) => e.status !== 'paid_this_cycle');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Card */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(18, 24, 38, 0.9) 0%, rgba(67, 40, 16, 0.3) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={20} color="#F59E0B" />
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0 }}>
              EMI Obligations Manager
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0, maxWidth: '520px' }}>
            Track and simulate upcoming loan installments. FinCopilot uses these obligations to safeguard your funds and calculate Safe-to-Spend limits.
          </p>
        </div>

        {/* Total Monthly Burden */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Total Monthly EMI Burden
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FCD34D' }}>
              {currency} {totalMonthlyEMIBurden.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={onOpenAddEMI}
            className="btn btn-primary"
            style={{ padding: '10px 16px', fontSize: '0.88rem' }}
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
          background: 'rgba(15, 21, 35, 0.6)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <ShieldCheck size={26} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
            How FinCopilot Protects Your EMI Payments
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Unlike traditional banking apps that only show your gross balance, FinCopilot calculates your daily spending burn rate and reserves necessary funds before your EMI due date. If an unexpected expense threatens your ability to pay, FinCopilot raises an instant High-Risk warning.
          </p>
        </div>
      </div>
    </div>
  );
};
