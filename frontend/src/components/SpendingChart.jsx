import React, { useState } from 'react';
import { PieChart as PieIcon, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

export const SpendingChart = ({ categoryBreakdown = [], spendingTimeline = [], currency = '₹' }) => {
  const [activeView, setActiveView] = useState('categories'); // 'categories' | 'timeline'

  // Colors for categories
  const categoryColors = [
    { bg: '#6366F1', glow: 'rgba(99, 102, 241, 0.3)' },
    { bg: '#10B981', glow: 'rgba(16, 185, 129, 0.3)' },
    { bg: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)' },
    { bg: '#EC4899', glow: 'rgba(236, 72, 153, 0.3)' },
    { bg: '#38BDF8', glow: 'rgba(56, 189, 248, 0.3)' },
    { bg: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.3)' },
    { bg: '#14B8A6', glow: 'rgba(20, 184, 166, 0.3)' },
    { bg: '#F43F5E', glow: 'rgba(244, 63, 94, 0.3)' },
  ];

  const totalDebits = categoryBreakdown.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart Header & Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Spending Overview & Breakdown
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Simulated spending distribution across current ledger cycle
          </p>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 21, 35, 0.8)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => setActiveView('categories')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeView === 'categories' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: activeView === 'categories' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              color: activeView === 'categories' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <PieIcon size={14} color={activeView === 'categories' ? '#818CF8' : 'currentColor'} />
            <span>By Category</span>
          </button>

          <button
            onClick={() => setActiveView('timeline')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeView === 'timeline' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: activeView === 'timeline' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              color: activeView === 'timeline' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <BarChart3 size={14} color={activeView === 'timeline' ? '#818CF8' : 'currentColor'} />
            <span>Cashflow Activity</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'categories' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {/* Top Multi-Segment Progress Bar */}
          <div style={{
            height: '14px',
            width: '100%',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}>
            {categoryBreakdown.map((cat, idx) => {
              const color = categoryColors[idx % categoryColors.length];
              return (
                <div
                  key={cat.category}
                  title={`${cat.category}: ${cat.percentage}% (${currency} ${cat.amount.toLocaleString('en-IN')})`}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: color.bg,
                    transition: 'width 0.4s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Category List */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
            marginTop: '8px',
          }}>
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((cat, idx) => {
                const color = categoryColors[idx % categoryColors.length];
                return (
                  <div
                    key={cat.category}
                    style={{
                      background: 'rgba(15, 21, 35, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '3px',
                          backgroundColor: color.bg,
                          boxShadow: `0 0 8px ${color.glow}`,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#FFFFFF' }}>
                          {cat.category}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {cat.percentage}% of debits
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {currency} {cat.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No category data available.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Cashflow Activity View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '12px',
            background: 'rgba(15, 21, 35, 0.6)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Inflow / Credits</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F43F5E' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Outflow / Debits</span>
            </div>
          </div>

          {/* Simple Timeline Bar Visualizer */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}>
            {spendingTimeline.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 21, 35, 0.4)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ width: '65px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {item.date}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {item.credits > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: '#10B981',
                          width: `${Math.min(100, Math.max(12, (item.credits / (item.credits + item.debits)) * 100))}%`,
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                        +{currency} {item.credits.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {item.debits > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: '#F43F5E',
                          width: `${Math.min(100, Math.max(12, (item.debits / (item.credits + item.debits)) * 100))}%`,
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#FB7185', fontWeight: 600 }}>
                        -{currency} {item.debits.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
