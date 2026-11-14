import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Shield, Building, CheckCircle2, User as UserIcon } from 'lucide-react';

export const TopNavUserProfile = ({
  user,
  roleLabel,
  subText,
  badgeColor,
  avatarGradient,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const name = user?.name || 'Authorized User';
  const email = user?.email || 'user@enqoparentpro.et';
  const initials = getInitials(name);

  // Resolve styling based on role if not provided
  const role = (roleLabel || user?.role || 'USER').toUpperCase();
  const isSuperAdmin = role.includes('SUPER') || role.includes('ADMIN');
  const isAccountant = role.includes('ACCOUNTANT');
  const isOwner = role.includes('OWNER');

  const resolvedBadge = roleLabel || (
    isSuperAdmin ? 'SUPER ADMIN' :
    isAccountant ? 'ACCOUNTANT' :
    isOwner ? 'OWNER' : 'PROPERTY MANAGER'
  );

  const resolvedSubText = subText || (
    isSuperAdmin ? 'Root Platform Control' :
    isOwner ? 'Portfolio Oversight' :
    isAccountant ? 'Financial Operations' : 'Estate Management'
  );

  const resolvedAvatarGradient = avatarGradient || (
    isSuperAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
    isAccountant ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
    isOwner ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' :
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
  );

  const resolvedBadgeBg = isSuperAdmin ? 'rgba(245, 158, 11, 0.12)' :
    isAccountant ? 'rgba(16, 185, 129, 0.12)' :
    isOwner ? 'rgba(245, 158, 11, 0.12)' :
    'rgba(59, 130, 246, 0.12)';

  const resolvedBadgeText = isSuperAdmin ? '#b45309' :
    isAccountant ? '#047857' :
    isOwner ? '#b45309' :
    '#1d4ed8';

  const resolvedBadgeBorder = isSuperAdmin ? 'rgba(245, 158, 11, 0.28)' :
    isAccountant ? 'rgba(16, 185, 129, 0.28)' :
    isOwner ? 'rgba(245, 158, 11, 0.28)' :
    'rgba(59, 130, 246, 0.28)';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger Button / Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: isOpen ? '#f8fafc' : '#ffffff',
          border: '1px solid',
          borderColor: isOpen ? '#cbd5e1' : '#e2e8f0',
          borderRadius: '9999px',
          padding: '4px 12px 4px 5px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
          }
        }}
        aria-label="User profile and menu"
        aria-expanded={isOpen}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: resolvedAvatarGradient,
            color: isSuperAdmin || isOwner ? '#0b2239' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.02em',
            flexShrink: 0,
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
          }}
        >
          {initials}
        </div>

        {/* User Info Stack */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                lineHeight: 1.2,
                maxWidth: '150px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: resolvedBadgeBg,
                color: resolvedBadgeText,
                border: `1px solid ${resolvedBadgeBorder}`,
                padding: '1px 6px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}
            >
              {resolvedBadge}
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              lineHeight: 1.2,
              marginTop: '1px',
              maxWidth: '180px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {email}
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          size={14}
          style={{
            color: '#64748b',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: '2px',
          }}
        />
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(11, 34, 57, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header Card Inside Dropdown */}
          <div
            style={{
              padding: '16px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: resolvedAvatarGradient,
                  color: isSuperAdmin || isOwner ? '#0b2239' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '15px',
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
                }}
              >
                {initials}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '1px',
                  }}
                >
                  {email}
                </div>
              </div>
            </div>

            {/* Badge & Scope */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Shield size={12} style={{ color: resolvedBadgeText }} />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: resolvedBadgeText,
                  }}
                >
                  {resolvedBadge}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {resolvedSubText}
              </span>
            </div>
          </div>

          {/* Account Status Indicator */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
              System Account
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
          </div>

          {/* Actions / Sign Out */}
          <div style={{ padding: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onSignOut) onSignOut();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '9px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#ef4444',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={15} style={{ color: '#ef4444' }} />
              <span>Sign Out of RentPro</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopNavUserProfile;
