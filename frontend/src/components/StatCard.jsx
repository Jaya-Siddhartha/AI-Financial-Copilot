import React from 'react';

export const StatCard = ({
  title,
  value,
  currency = '₹',
  subtitle,
  icon: Icon,
  accentColor = '#6366F1',
  badgeText,
  badgeType = 'neutral', // 'positive' | 'negative' | 'neutral' | 'indigo'
  isCount = false,
}) => {
  const formatAmount = (num) => {
    if (num === undefined || num === null) return '0';
    if (isCount) return Number(num).toLocaleString('en-IN');
    return `${currency} ${Number(num).toLocaleString('en-IN')}`;
  };

  const getBadgeStyle = () => {
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
      }}
    >
      {/* Top subtle glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.8,
        }}
      />

      {/* Header with Title and Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `rgba(${
                accentColor === '#10B981'
                  ? '16, 185, 129'
                  : accentColor === '#F43F5E'
                  ? '244, 63, 94'
                  : '99, 102, 241'
              }, 0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(${
                accentColor === '#10B981'
                  ? '16, 185, 129'
                  : accentColor === '#F43F5E'
                  ? '244, 63, 94'
                  : '99, 102, 241'
              }, 0.25)`,
            }}
          >
            <Icon size={18} color={accentColor} />
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
          {formatAmount(value)}
        </div>
      </div>

      {/* Footer / Subtitle & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {subtitle && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
            {subtitle}
          </span>
        )}
        {badgeText && (
          <span className={`badge ${getBadgeStyle()}`} style={{ fontSize: '0.72rem' }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
