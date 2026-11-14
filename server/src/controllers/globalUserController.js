import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getGlobalUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'SUSPENDED') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, companyName: true } },
          ownedBuildings: { select: { id: true, name: true } },
          buildings: { include: { building: { select: { id: true, name: true } } } },
          tenantProfile: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
    ]);

    const enriched = users.map((u) => {
      const assignedProps = u.role === 'OWNER'
        ? u.ownedBuildings.map((b) => b.name)
        : u.buildings.map((ub) => ub.building.name);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '—',
        role: u.role,
        title: u.title || '—',
        companyName: u.companyName || u.owner?.companyName || '—',
        ownerName: u.owner?.name || null,
        approvalStatus: u.approvalStatus,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        assignedProperties: assignedProps,
      };
    });

    return successResponse(res, 'Global users retrieved', {
      total,
      page: Number(page),
      limit: Number(limit),
      users: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return errorResponse(res, 'Cannot suspend your own account', 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse(res, 'User not found', 404);

    const newStatus = !user.isActive;
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: newStatus ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_SUSPENDED',
      entityType: 'User',
      entityId: user.id,
      meta: {
        email: user.email,
        role: user.role,
        newStatus: newStatus ? 'ACTIVE' : 'SUSPENDED',
      },
    });

    return successResponse(res, `User ${user.name} ${newStatus ? 'activated' : 'suspended'} successfully`, updated);
  } catch (error) {
    next(error);
  }
};

export const forcePasswordReset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return errorResponse(res, 'Password must be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse(res, 'User not found', 404);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'ADMIN_FORCE_PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      meta: { email: user.email, resetBy: req.user.name },
    });

    return successResponse(res, `Password reset successfully for ${user.name}`);
  } catch (error) {
    next(error);
  }
};
