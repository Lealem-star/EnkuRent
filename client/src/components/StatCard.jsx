import React from 'react';

export const StatCard = ({ label, value, subtext, flag, valueStyle, icon: Icon }) => {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="stat-label">{label}</span>
        {Icon && (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--line-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-soft)',
              flexShrink: 0,
            }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>

      <div className="stat-value" style={valueStyle}>
        {value}
      </div>

      {subtext && (
        <div className="stat-sub">
          {subtext}
        </div>
      )}

      {flag && (
        <div style={{ marginTop: '10px' }}>
          <span
            className="stat-flag"
            style={flag.style || { background: 'var(--green-soft)', color: 'var(--green)' }}
          >
            {flag.text}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
