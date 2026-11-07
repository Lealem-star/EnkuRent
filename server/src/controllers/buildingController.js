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
    const where = {};
    if (!req.user.isOwner && req.user.buildingIds) {
      where.id = { in: req.user.buildingIds };
    }

    const buildings = await prisma.building.findMany({
      where,
      include: {
        offices: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
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

    if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(id)) {
      return errorResponse(res, 'Access denied for this building', 403);
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
    const { name, address, floors, officesPerFloor = 6 } = req.body;

    const building = await prisma.$transaction(async (tx) => {
      const b = await tx.building.create({
        data: {
          name,
          address,
          floors,
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

    await prisma.building.delete({
      where: { id },
    });

    return successResponse(res, 'Building deleted successfully');
  } catch (error) {
    next(error);
  }
};
