import React from 'react';

const BADGE_CONFIG = {
  paid: { className: 'badge-paid', label: '✓ Paid' },
  APPROVED: { className: 'badge-paid', label: '✓ Paid' },
  pending: { className: 'badge-pending', label: '⏳ Pending Verification' },
  PENDING: { className: 'badge-pending', label: '⏳ Pending Verification' },
  unpaid: { className: 'badge-unpaid', label: '○ Unpaid' },
  overdue: { className: 'badge-overdue', label: '! Overdue' },
  rejected: { className: 'badge-rejected', label: '× Rejected' },
  REJECTED: { className: 'badge-rejected', label: '× Rejected' },
  available: { className: 'badge-available', label: 'Available' },
  AVAILABLE: { className: 'badge-available', label: 'Available' },
  occupied: { className: 'badge-occupied', label: 'Occupied' },
  OCCUPIED: { className: 'badge-occupied', label: 'Occupied' },
  maintenance: { className: 'badge-maintenance', label: 'Maintenance' },
  MAINTENANCE: { className: 'badge-maintenance', label: 'Maintenance' },
  active: { className: 'badge-active', label: '✓ Active' },
  ACTIVE: { className: 'badge-active', label: '✓ Active' },
  expiring: { className: 'badge-expiring', label: '! Expiring Soon' },
  expired: { className: 'badge-expired', label: '× Expired' },
  ENDED: { className: 'badge-expired', label: '× Expired' },
  manual: { className: 'badge-manual', label: 'Manual' },
};

export const StatusBadge = ({ status }) => {
  if (!status) return null;
  const config = BADGE_CONFIG[status] || { className: 'badge-unpaid', label: status };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
};

export default StatusBadge;
