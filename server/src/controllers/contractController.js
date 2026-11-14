import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getContracts = async (req, res, next) => {
  try {
    const { buildingId, status } = req.query;
    const where = {};

    if (req.user.isSuperAdmin) {
      if (buildingId && buildingId !== '__all__') {
        where.office = { buildingId: String(buildingId) };
      }
    } else if (req.user.isOwner) {
      where.office = {
        building: { ownerId: req.user.id, isDeleted: false },
        ...(buildingId && buildingId !== '__all__' ? { buildingId: String(buildingId) } : {}),
      };
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      if (buildingId && buildingId !== '__all__') {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return successResponse(res, 'No contracts accessible', { contracts: [], expiringCount: 0, total: 0 });
        }
        where.office = { buildingId: String(buildingId) };
      } else {
        where.office = { buildingId: { in: req.user.buildingIds } };
      }
    } else if (req.user.role === 'TENANT') {
      where.tenant = { userId: req.user.id };
    } else {
      return successResponse(res, 'No contracts accessible', { contracts: [], expiringCount: 0, total: 0 });
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        tenant: true,
        office: { include: { building: true } },
        rentHistories: { orderBy: { effectiveFrom: 'desc' } },
      },
      orderBy: { endDate: 'asc' },
    });

    const now = new Date();
    const enriched = contracts.map((c) => {
      const end = new Date(c.endDate);
      const daysLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      let computedStatus = 'active';
      if (c.status === 'ENDED' || daysLeft < 0) {
        computedStatus = 'expired';
      } else if (daysLeft < 45) {
        computedStatus = 'expiring';
      }

      return {
        id: c.id,
        tenantId: c.tenantId,
        tenantName: c.tenant.fullName,
        tenantPhone: c.tenant.phone,
        officeId: c.officeId,
        officeNumber: c.office.number,
        buildingId: c.office.buildingId,
        buildingName: c.office.building.name,
        rent: Number(c.rent),
        frequency: c.frequency,
        startDate: c.startDate,
        endDate: c.endDate,
        dueDay: c.dueDay,
        status: computedStatus,
        dbStatus: c.status,
        daysLeft: Math.round(daysLeft),
        rentHistory: c.rentHistories.map((rh) => ({
          rent: Number(rh.rent),
          effectiveFrom: rh.effectiveFrom,
          effectiveTo: rh.effectiveTo,
        })),
      };
    });

    // Optional status filter
    let filtered = enriched;
    if (status && status !== 'all') {
      filtered = enriched.filter((c) => c.status === status);
    }

    const expiringCount = enriched.filter((c) => c.status === 'expiring').length;

    return successResponse(res, 'Contracts retrieved', {
      contracts: filtered,
      expiringCount,
      total: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

export const renewContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newEndDate, newRent } = req.body;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        office: { include: { building: true } },
        tenant: true,
      },
    });

    if (!contract) {
      return errorResponse(res, 'Contract not found', 404);
    }

    // Multi-tenant authorization check
    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        if (contract.office.building.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property contract.', 403);
        }
      } else if (!req.user.buildingIds || !req.user.buildingIds.includes(contract.office.buildingId)) {
        return errorResponse(res, 'Access denied: You are not assigned to manage this building.', 403);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data = {
        endDate: new Date(newEndDate),
        status: 'ACTIVE',
        endedAt: null,
      };

      if (newRent && Number(newRent) !== Number(contract.rent)) {
        data.rent = Number(newRent);
        await tx.rentHistory.create({
          data: {
            contractId: contract.id,
            rent: Number(newRent),
            effectiveFrom: new Date(),
          },
        });
      }

      const resContract = await tx.contract.update({
        where: { id },
        data,
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'RENEW_CONTRACT',
          entityType: 'Contract',
          entityId: id,
          officeId: contract.officeId,
          meta: `Renewed contract for Office ${contract.office.number} (${contract.tenant.fullName}) until ${new Date(newEndDate).toLocaleDateString()}`,
        },
      });

      return resContract;
    });

    return successResponse(res, 'Contract renewed successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const changeRent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rent, effectiveFrom } = req.body;

    if (!rent || Number(rent) <= 0) {
      return errorResponse(res, 'Valid rent amount required', 400);
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        office: { include: { building: true } },
        tenant: true,
      },
    });

    if (!contract) {
      return errorResponse(res, 'Contract not found', 404);
    }

    // Multi-tenant authorization check
    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        if (contract.office.building.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property contract.', 403);
        }
      } else if (!req.user.buildingIds || !req.user.buildingIds.includes(contract.office.buildingId)) {
        return errorResponse(res, 'Access denied: You are not assigned to manage this building.', 403);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contract.update({
        where: { id },
        data: { rent: Number(rent) },
      });

      await tx.rentHistory.create({
        data: {
          contractId: contract.id,
          rent: Number(rent),
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'UPDATE_RENT',
          entityType: 'Contract',
          entityId: id,
          officeId: contract.officeId,
          meta: `Updated rent for Office ${contract.office.number} from ETB ${Number(contract.rent).toLocaleString()} to ETB ${Number(rent).toLocaleString()}`,
        },
      });

      return updatedContract;
    });

    return successResponse(res, 'Rent updated successfully', result);
  } catch (error) {
    next(error);
  }
};

