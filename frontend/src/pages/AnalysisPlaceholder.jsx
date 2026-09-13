import React from 'react';
import { PieChart, Sparkles, BrainCircuit, Activity, LineChart, Shield } from 'lucide-react';

export const AnalysisPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10B981 0%, #6366F1 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            marginBottom: '20px',
          }}
        >
          <BrainCircuit size={32} color="#FFFFFF" />
        </div>

        <span className="badge badge-amber" style={{ marginBottom: '12px' }}>
          Intelligence Engine Preview
        </span>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '10px' }}>
          AI Financial Decision Analysis
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 28px', fontSize: '0.92rem', lineHeight: 1.6 }}>
          Step 1 establishes the foundational ledger and category data. In upcoming steps, this module will activate deep financial intelligence algorithms.
        </p>

        {/* Feature roadmap preview cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            maxWidth: '780px',
            margin: '0 auto',
            textAlign: 'left',
          }}
        >
          <div style={{ background: 'rgba(15, 21, 35, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <LineChart size={18} color="#34D399" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Predictive Cashflow</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Project month-end balances and anticipate upcoming liquidity pinches.
            </div>
          </div>

          <div style={{ background: 'rgba(15, 21, 35, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sparkles size={18} color="#818CF8" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Safe-to-Spend AI</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Real-time calculations considering fixed bills, EMIs, and essential reserves.
            </div>
          </div>

          <div style={{ background: 'rgba(15, 21, 35, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Shield size={18} color="#F43F5E" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Risk Detection</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Automated anomaly and overdraft risk alert signals.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
