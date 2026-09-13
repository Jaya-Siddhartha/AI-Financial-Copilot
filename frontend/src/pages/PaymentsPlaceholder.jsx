import React from 'react';
import { CreditCard, Send, Clock, ShieldCheck, ArrowRight, Layers } from 'lucide-react';

export const PaymentsPlaceholder = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            marginBottom: '20px',
          }}
        >
          <CreditCard size={32} color="#FFFFFF" />
        </div>

        <span className="badge badge-indigo" style={{ marginBottom: '12px' }}>
          Step 2 Module Preview
        </span>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '10px' }}>
          Payments & Transfers Hub
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 28px', fontSize: '0.92rem', lineHeight: 1.6 }}>
          The foundation of the ledger is active in Step 1. In subsequent stages, this hub will orchestrate automated scheduled payments, direct UPI disbursements, and recurring subscription management.
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
              <Send size={18} color="#818CF8" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Instant Payouts</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Simulated 1-click vendor and peer-to-peer transfers with automated ledger updates.
            </div>
          </div>

          <div style={{ background: 'rgba(15, 21, 35, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Clock size={18} color="#34D399" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Recurring AutoPay</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Scheduled rules tied to income dates to prevent late utility and credit fees.
            </div>
          </div>

          <div style={{ background: 'rgba(15, 21, 35, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="#F59E0B" />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#FFFFFF' }}>Zero-Risk Sandbox</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Safe simulated execution environment designed for hackathon demonstration.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
