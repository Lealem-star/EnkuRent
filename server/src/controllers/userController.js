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
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['OWNER', 'MANAGER'] },
      },
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

