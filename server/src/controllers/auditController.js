import { prisma } from '../config/prisma.js';
import { successResponse } from '../utils/response.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { officeId, limit = 100 } = req.query;
    const where = {};

    if (officeId) {
      where.officeId = String(officeId);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 100,
    });

    return successResponse(res, 'Audit logs retrieved', logs);
  } catch (error) {
    next(error);
  }
};

