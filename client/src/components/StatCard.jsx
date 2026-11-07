import React from 'react';

export const StatCard = ({ label, value, subtext, flag, valueStyle }) => {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={valueStyle}>
        {value}
        {subtext && <small>{subtext}</small>}
      </div>
      {flag && (
        <span
          className="stat-flag"
          style={flag.style || { background: 'var(--green-soft)', color: 'var(--green)' }}
        >
          {flag.text}
        </span>
      )}
    </div>
  );
};

export default StatCard;
