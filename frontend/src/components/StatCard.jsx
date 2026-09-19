import React from 'react';

export const StatCard = ({
  title,
  value,
  currency = '₹',
  subtitle,
  icon: Icon,
  accentColor = '#4F46E5',
  badgeText,
  badgeType = 'neutral', // 'positive' | 'negative' | 'neutral' | 'indigo' | 'amber'
  isCount = false,
}) => {
  const formatAmount = (num) => {
    if (num === undefined || num === null) return '0';
    if (isCount) return Number(num).toLocaleString('en-IN');
    return `${currency} ${Number(num).toLocaleString('en-IN')}`;
  };

  const getBadgeClass = () => {
    switch (badgeType) {
      case 'positive':
        return 'badge-emerald';
      case 'negative':
        return 'badge-rose';
      case 'indigo':
        return 'badge-indigo';
      case 'amber':
        return 'badge-amber';
      default:
        return 'badge-blue';
    }
  };

  return (
    <div
      className="glass-card glass-card-interactive"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 22px',
      }}
    >
      {/* Top subtle glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accentColor,
        }}
      />

      {/* Header with Title and Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Icon size={19} color={accentColor} />
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {formatAmount(value)}
        </div>
      </div>

      {/* Footer / Subtitle & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
        {subtitle && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {subtitle}
          </span>
        )}
        {badgeText && (
          <span className={`badge ${getBadgeClass()}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
