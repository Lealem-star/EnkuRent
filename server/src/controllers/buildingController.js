import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createBuildingSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Building name is required'),
    address: z.string().min(3, 'Address is required'),
    floors: z.number().int().min(1, 'At least 1 floor required'),
    officesPerFloor: z.number().int().min(1).default(6),
  }),
});

export const getBuildings = async (req, res, next) => {
  try {
    const where = { isDeleted: false };
    if (req.user.isSuperAdmin) {
      if (req.query.ownerId) {
        where.ownerId = String(req.query.ownerId);
      }
    } else if (req.user.isOwner) {
      where.ownerId = req.user.id;
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      where.id = { in: req.user.buildingIds };
    } else {
      return successResponse(res, 'Buildings retrieved', []);
    }

    const buildings = await prisma.building.findMany({
      where,
      include: {
        offices: {
          where: { isDeleted: false },
          include: {
            contracts: {
              where: { status: 'ACTIVE', isDeleted: false },
              include: { tenant: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = buildings.map((b) => {
      const total = b.offices.length;
      const occupied = b.offices.filter((o) => o.status === 'OCCUPIED').length;
      const available = b.offices.filter((o) => o.status === 'AVAILABLE').length;
      const maintenance = b.offices.filter((o) => o.status === 'MAINTENANCE').length;

      let expected = 0;
      b.offices.forEach((o) => {
        const c = o.contracts[0];
        if (c && c.status === 'ACTIVE') {
          expected += Number(c.rent);
        }
      });

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        floors: b.floors,
        stats: {
          total,
          occupied,
          available,
          maintenance,
          expectedRent: expected,
        },
      };
    });

    return successResponse(res, 'Buildings retrieved', enriched);
  } catch (error) {
    next(error);
  }
};

export const getBuildingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        const check = await prisma.building.findFirst({
          where: { id, ownerId: req.user.id },
          select: { id: true },
        });
        if (!check) {
          return errorResponse(res, 'Access denied: You do not own this property', 403);
        }
      } else if (!req.user.buildingIds || !req.user.buildingIds.includes(id)) {
        return errorResponse(res, 'Access denied for this building', 403);
      }
    }

    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        offices: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: { tenant: true },
            },
          },
          orderBy: [{ floor: 'asc' }, { number: 'asc' }],
        },
      },
    });

    if (!building) {
      return errorResponse(res, 'Building not found', 404);
    }

    const total = building.offices.length;
    const occupied = building.offices.filter((o) => o.status === 'OCCUPIED').length;
    const available = building.offices.filter((o) => o.status === 'AVAILABLE').length;
    const maintenance = building.offices.filter((o) => o.status === 'MAINTENANCE').length;

    let expectedRent = 0;
    building.offices.forEach((o) => {
      const c = o.contracts[0];
      if (c && c.status === 'ACTIVE') {
        expectedRent += Number(c.rent);
      }
    });

    return successResponse(res, 'Building retrieved', {
      ...building,
      stats: {
        total,
        occupied,
        available,
        maintenance,
        expectedRent,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createBuilding = async (req, res, next) => {
  try {
    const { name, address, floors, officesPerFloor = 6, ownerId: requestedOwnerId } = req.body;
    const targetOwnerId = req.user.isSuperAdmin ? (requestedOwnerId || req.user.id) : req.user.id;

    // Enforce subscription plan entitlements for non-superadmin
    if (!req.user.isSuperAdmin) {
      const activeSub = await prisma.subscription.findFirst({
        where: {
          ownerId: targetOwnerId,
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        },
        include: { plan: true },
      });

      if (!activeSub) {
        return errorResponse(res, 'No active subscription found. Please subscribe to an Enqopa RentPro plan to add properties.', 403);
      }

      // 1. Check maxProperties limit
      const existingBuildingCount = await prisma.building.count({
        where: { ownerId: targetOwnerId, isDeleted: false },
      });

      if (existingBuildingCount >= activeSub.plan.maxProperties) {
        return errorResponse(
          res,
          `Property limit reached. Your ${activeSub.plan.name} plan allows up to ${activeSub.plan.maxProperties} properties. Please upgrade your plan.`,
          403
        );
      }

      // 2. Check maxOffices limit
      const unitsToAdd = Number(floors) * Number(officesPerFloor);
      const existingUnitsCount = await prisma.office.count({
        where: {
          building: { ownerId: targetOwnerId, isDeleted: false },
          isDeleted: false,
        },
      });

      if (existingUnitsCount + unitsToAdd > activeSub.plan.maxOffices) {
        return errorResponse(
          res,
          `Unit quota exceeded. Your ${activeSub.plan.name} plan allows up to ${activeSub.plan.maxOffices} units (currently managing ${existingUnitsCount}). Adding ${unitsToAdd} units would exceed your quota. Please upgrade your plan.`,
          403
        );
      }
    }

    const building = await prisma.$transaction(async (tx) => {
      const b = await tx.building.create({
        data: {
          name,
          address,
          floors: Number(floors),
          ownerId: targetOwnerId,
        },
      });

      // Auto-generate offices: floors x officesPerFloor
      const officeRecords = [];
      for (let f = 1; f <= floors; f++) {
        for (let n = 1; n <= officesPerFloor; n++) {
          officeRecords.push({
            id: `off_${b.id}_${f * 100 + n}`,
            buildingId: b.id,
            floor: f,
            number: f * 100 + n,
            status: 'AVAILABLE',
          });
        }
      }

      await tx.office.createMany({
        data: officeRecords,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'BUILDING_CREATED',
          entityType: 'BUILDING',
          entityId: b.id,
          meta: `Created ${name} (${floors} floors, ${officeRecords.length} offices)`,
        },
      });

      return b;
    });

    return successResponse(res, 'Building created with offices generated', building, 201);
  } catch (error) {
    next(error);
  }
};

export const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, floors } = req.body;

    if (!req.user.isSuperAdmin) {
      const exists = await prisma.building.findFirst({
        where: { id, ownerId: req.user.id, isDeleted: false },
      });
      if (!exists) {
        return errorResponse(res, 'Access denied: You do not own this property', 403);
      }
    }

    const building = await prisma.building.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(floors && { floors: Number(floors) }),
      },
    });

    return successResponse(res, 'Building updated', building);
  } catch (error) {
    next(error);
  }
};

export const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user.isSuperAdmin) {
      const exists = await prisma.building.findFirst({
        where: { id, ownerId: req.user.id, isDeleted: false },
      });
      if (!exists) {
        return errorResponse(res, 'Access denied: You do not own this property', 403);
      }
    }

    // Safe soft deletion preserving historical financial records and audit entries
    await prisma.$transaction(async (tx) => {
      await tx.office.updateMany({
        where: { buildingId: id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await tx.building.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'BUILDING_ARCHIVED',
          entityType: 'BUILDING',
          entityId: id,
          meta: `Soft-deleted building ${id} and archived unit inventory while preserving historical ledgers`,
        },
      });
    });

    return successResponse(res, 'Building archived successfully with data preserved');
  } catch (error) {
    next(error);
  }
};
