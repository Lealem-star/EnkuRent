import React from 'react';

import React from 'react';

export const Logo = ({
  className = '',
  height = 36,
  variant = 'full', // 'full' (official logo) | 'mark' (icon emblem) | 'compact'
  onDark = false,
  showTagline = false,
}) => {
  if (variant === 'full') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 ${onDark ? 'bg-white rounded-lg px-2.5 py-1 shadow-sm' : ''} ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <img
          src="/logo.jpg"
          alt="Enqopa RentPro"
          style={{
            height: `${height}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {showTagline && (
          <span style={{ fontSize: '11px', color: onDark ? '#0B2239' : '#64748B', fontWeight: 500 }}>
            Smart Rental Management, Made Easy
          </span>
        )}
      </div>
    );
  }

  // Official Brand Mark (SVG Emblem: Deep Navy & Gold stylized building + swoop)
  const size = height;
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg shadow-sm ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: '#ffffff',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        padding: '3px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      title="Enqopa RentPro"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Gold swoop */}
        <path
          d="M12 78C12 78 18 86 38 86C60 86 85 70 88 45C89 36 85 28 85 28C85 28 89 40 76 56C62 73 38 78 20 74L12 78Z"
          fill="#F59E0B"
        />
        {/* Navy Building Left */}
        <path
          d="M20 72V38L38 28V72H20Z"
          fill="#0B2239"
        />
        <rect x="25" y="42" width="4" height="6" rx="1" fill="#FFFFFF" />
        <rect x="25" y="52" width="4" height="6" rx="1" fill="#FFFFFF" />
        <rect x="25" y="62" width="4" height="6" rx="1" fill="#FFFFFF" />
        {/* Navy Highrise Right */}
        <path
          d="M38 72V22L68 12V72H38Z"
          fill="#07192A"
        />
        <rect x="44" y="22" width="5" height="7" rx="1" fill="#FFFFFF" />
        <rect x="54" y="19" width="5" height="7" rx="1" fill="#FFFFFF" />
        <rect x="44" y="34" width="5" height="7" rx="1" fill="#FFFFFF" />
        <rect x="54" y="31" width="5" height="7" rx="1" fill="#FFFFFF" />
        <rect x="44" y="46" width="5" height="7" rx="1" fill="#FFFFFF" />
        <rect x="54" y="43" width="5" height="7" rx="1" fill="#FFFFFF" />
        {/* Roof Gable Front (Gold & Navy) */}
        <path
          d="M28 72L50 54L72 72H64L50 60L36 72H28Z"
          fill="#F59E0B"
        />
      </svg>
    </div>
  );
};

export default Logo;

export default Logo;
