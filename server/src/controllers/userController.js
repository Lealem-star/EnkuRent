import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const inviteUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    role: z.enum(['MANAGER', 'OWNER', 'TENANT']).default('MANAGER'),
    title: z.string().default('Manager'), // e.g. "Accountant", "Manager"
    buildingIds: z.array(z.string()).optional(),
  }),
});

export const getUsers = async (req, res, next) => {
  try {
    const where = {};
    if (!req.user.isSuperAdmin) {
      where.OR = [
        { id: req.user.id },
        { ownerId: req.user.id },
      ];
    } else {
      where.role = { in: ['OWNER', 'MANAGER'] };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        buildings: {
          include: { building: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      title: u.title || (u.role === 'OWNER' ? 'Owner' : 'Manager'),
      isActive: u.isActive,
      buildings: u.buildings.map((b) => ({
        id: b.building.id,
        name: b.building.name,
      })),
      buildingIds: u.buildings.map((b) => b.buildingId),
    }));

    return successResponse(res, 'Users retrieved', formatted);
  } catch (error) {
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const { name, email, phone, role = 'MANAGER', title = 'Manager', buildingIds = [] } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return errorResponse(res, 'A user with this email already exists', 400);
    }

    // Enforce subscription plan staff quota
    if (!req.user.isSuperAdmin) {
      const activeSub = await prisma.subscription.findFirst({
        where: {
          ownerId: req.user.id,
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
        include: { plan: true },
      });

      if (activeSub) {
        const staffCount = await prisma.user.count({
          where: { ownerId: req.user.id, role: { in: ['MANAGER', 'OWNER'] } },
        });

        if (staffCount >= activeSub.plan.maxStaff) {
          return errorResponse(
            res,
            `Staff account quota exceeded. Your ${activeSub.plan.name} plan allows up to ${activeSub.plan.maxStaff} staff members. Please upgrade your plan.`,
            403
          );
        }
      }
    }

    const defaultPassword = await bcrypt.hash('password123', 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          passwordHash: defaultPassword,
          role,
          title,
          isActive: true,
          ownerId: req.user.id,
        },
      });

      if (buildingIds.length > 0) {
        await tx.userBuilding.createMany({
          data: buildingIds.map((bId) => ({
            userId: u.id,
            buildingId: bId,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'INVITE_USER',
          entityType: 'User',
          entityId: u.id,
          meta: `Invited ${name} as ${title} (${role}) with access to ${buildingIds.length} properties`,
        },
      });

      return u;
    });

    return successResponse(res, 'User created and invited successfully', newUser, 201);
  } catch (error) {
    next(error);
  }
};

export const updateUserBuildings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buildingIds = [], isActive, title } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (!req.user.isSuperAdmin && user.ownerId !== req.user.id && user.id !== req.user.id) {
      return errorResponse(res, 'Access denied: You do not manage this staff account', 403);
    }

    await prisma.$transaction(async (tx) => {
      if (isActive !== undefined || title !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(isActive !== undefined && { isActive }),
            ...(title !== undefined && { title }),
          },
        });
      }

      if (buildingIds !== undefined) {
        await tx.userBuilding.deleteMany({ where: { userId: id } });
        if (buildingIds.length > 0) {
          await tx.userBuilding.createMany({
            data: buildingIds.map((bId) => ({
              userId: id,
              buildingId: bId,
            })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'UPDATE_USER_PERMISSIONS',
          entityType: 'User',
          entityId: id,
          meta: `Updated permissions for ${user.name}`,
        },
      });
    });

    return successResponse(res, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

