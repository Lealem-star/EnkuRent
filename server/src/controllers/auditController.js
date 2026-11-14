import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { officeId, limit = 100 } = req.query;
    const where = {};

    // Multi-tenant audit log scoping
    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        // Owner only sees logs for their owned offices or actions performed by themselves
        where.OR = [
          { office: { building: { ownerId: req.user.id } } },
          { actorId: req.user.id },
        ];
      } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
        // Manager only sees logs for offices in their assigned buildings or their own actions
        where.OR = [
          { office: { buildingId: { in: req.user.buildingIds } } },
          { actorId: req.user.id },
        ];
      } else {
        where.actorId = req.user.id;
      }
    }

    if (officeId) {
      // Validate that the requester has access to this officeId
      if (!req.user.isSuperAdmin) {
        const office = await prisma.office.findUnique({
          where: { id: String(officeId) },
          include: { building: true },
        });
        if (!office) {
          return errorResponse(res, 'Office not found', 404);
        }
        if (req.user.isOwner && office.building?.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own the property for this office.', 403);
        }
        if (!req.user.isOwner && (!req.user.buildingIds || !req.user.buildingIds.includes(office.buildingId))) {
          return errorResponse(res, 'Access denied: You are not assigned to this property.', 403);
        }
      }
      where.officeId = String(officeId);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
    });

    return successResponse(res, 'Audit logs retrieved', logs);
  } catch (error) {
    next(error);
  }
};

