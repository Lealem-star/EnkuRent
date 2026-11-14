import { prisma } from '../config/prisma.js';

/**
 * Standardized, fault-tolerant audit log event writer
 * Safely persists administrative, security, and operational events to the database
 */
export const logAuditEvent = async ({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  officeId = null,
  meta = null,
}) => {
  try {
    let metaString = null;
    if (meta) {
      metaString = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
    }

    return await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorName: actorName || 'System',
        action: action || 'GENERAL_ACTIVITY',
        entityType: entityType || 'Platform',
        entityId: String(entityId || '0'),
        officeId: officeId || null,
        meta: metaString,
      },
    });
  } catch (err) {
    console.error('[AuditLog Error] Failed to persist audit entry:', err.message);
    return null;
  }
};

export default logAuditEvent;
