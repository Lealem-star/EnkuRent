import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getNotifications = async (req, res, next) => {
  try {
    const where = {};
    if (!req.user.isSuperAdmin) {
      where.targetRole = { in: ['ALL', req.user.role] };
      where.isActive = true;
    }

    const notifications = await prisma.platformNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, 'Notifications retrieved', notifications);
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type = 'INFO', targetRole = 'ALL', expiresAt } = req.body;

    if (!title || !message) {
      return errorResponse(res, 'Title and message are required', 400);
    }

    const notification = await prisma.platformNotification.create({
      data: {
        title,
        message,
        type,
        targetRole,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'PLATFORM_ANNOUNCEMENT_CREATED',
      entityType: 'Notification',
      entityId: notification.id,
      meta: { title: notification.title, targetRole: notification.targetRole, type: notification.type },
    });

    return successResponse(res, 'Announcement broadcasted successfully', notification, 201);
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.platformNotification.delete({ where: { id } });
    return successResponse(res, 'Notification removed successfully');
  } catch (error) {
    next(error);
  }
};
