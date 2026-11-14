import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getPlatformSettings = async (req, res, next) => {
  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const grouped = {};
    settings.forEach((s) => {
      const cat = s.category || 'GENERAL';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });

    return successResponse(res, 'Platform settings retrieved', {
      settings,
      grouped,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlatformSettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // array of { key, value }

    if (!Array.isArray(settings)) {
      return errorResponse(res, 'Settings must be provided as an array of { key, value }', 400);
    }

    const updates = [];
    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        updates.push(
          prisma.platformSetting.upsert({
            where: { key: item.key },
            update: { value: String(item.value) },
            create: {
              key: item.key,
              value: String(item.value),
              category: item.category || 'GENERAL',
              description: item.description || '',
            },
          })
        );
      }
    }

    await Promise.all(updates);

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'PLATFORM_SETTINGS_UPDATED',
      entityType: 'PlatformSetting',
      entityId: 'SETTINGS',
      meta: { updatedCount: settings.length },
    });

    return successResponse(res, 'Platform settings updated successfully');
  } catch (error) {
    next(error);
  }
};
