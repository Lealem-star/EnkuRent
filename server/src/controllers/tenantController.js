import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createTenantSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    phone: z.string().min(8, 'Phone number is required'),
    email: z.string().email().optional().or(z.literal('')),
    idNumber: z.string().optional(),
    officeId: z.string().min(1, 'Office is required'),
    rent: z.number().positive('Rent amount must be greater than 0'),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    dueDay: z.number().int().min(1).max(28).default(5),
  }),
});

export const updateTenantSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().min(8).optional(),
    email: z.string().email().optional().or(z.literal('')),
    idNumber: z.string().optional(),
  }),
});

export const getTenants = async (req, res, next) => {
  try {
    const { buildingId, search } = req.query;
    const where = {};

    if (req.user.isSuperAdmin) {
      if (buildingId && buildingId !== '__all__') {
        where.contracts = {
          some: {
            status: 'ACTIVE',
            office: { buildingId: String(buildingId) },
          },
        };
      }
    } else if (req.user.isOwner) {
      if (buildingId && buildingId !== '__all__') {
        where.contracts = {
          some: {
            status: 'ACTIVE',
            office: { buildingId: String(buildingId), building: { ownerId: req.user.id } },
          },
        };
      } else {
        where.contracts = {
          some: {
            status: 'ACTIVE',
            office: { building: { ownerId: req.user.id } },
          },
        };
      }
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      if (buildingId && buildingId !== '__all__') {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return successResponse(res, 'No tenants accessible', []);
        }
        where.contracts = {
          some: {
            status: 'ACTIVE',
            office: { buildingId: String(buildingId) },
          },
        };
      } else {
        where.contracts = {
          some: {
            status: 'ACTIVE',
            office: { buildingId: { in: req.user.buildingIds } },
          },
        };
      }
    } else {
      return successResponse(res, 'No tenants accessible', []);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            office: {
              include: { building: true },
            },
            payments: {
              where: { period: 'September 2026' },
              orderBy: { submittedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const now = new Date();
    const enriched = tenants.map((t) => {
      const activeContract = t.contracts[0] || null;
      const office = activeContract?.office || null;
      const currentPay = activeContract?.payments?.[0] || null;

      let cycleStatus = 'unpaid';
      if (currentPay) {
        if (currentPay.status === 'APPROVED') cycleStatus = 'paid';
        else if (currentPay.status === 'PENDING') cycleStatus = 'pending';
        else if (currentPay.status === 'REJECTED') cycleStatus = 'rejected';
      } else if (activeContract) {
        // Due on 5th of current month
        const dueDay = activeContract.dueDay || 5;
        const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (now > dueDate) {
          cycleStatus = 'overdue';
        }
      }

      return {
        id: t.id,
        fullName: t.fullName,
        name: t.fullName,
        phone: t.phone,
        email: t.email,
        idNumber: t.idNumber,
        office: office
          ? {
              id: office.id,
              number: office.number,
              floor: office.floor,
              buildingId: office.buildingId,
              buildingName: office.building.name,
            }
          : null,
        contract: activeContract
          ? {
              id: activeContract.id,
              rent: Number(activeContract.rent),
              frequency: activeContract.frequency,
              startDate: activeContract.startDate,
              endDate: activeContract.endDate,
              dueDay: activeContract.dueDay,
              status: activeContract.status,
            }
          : null,
        currentPayment: currentPay
          ? {
              id: currentPay.id,
              amount: Number(currentPay.amount),
              status: currentPay.status,
              method: currentPay.method,
              period: currentPay.period,
            }
          : null,
        cycleStatus,
      };
    });

    return successResponse(res, 'Tenants retrieved', enriched);
  } catch (error) {
    next(error);
  }
};

export const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            office: { include: { building: true } },
            rentHistories: { orderBy: { effectiveFrom: 'desc' } },
            payments: { orderBy: { submittedAt: 'desc' } },
            documents: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    // Multi-tenant authorization check
    if (!req.user.isSuperAdmin) {
      const isSelf = req.user.tenantId === tenant.id || req.user.id === tenant.userId;
      const ownsTenantContract = tenant.contracts.some((c) => c.office?.building?.ownerId === req.user.id);
      const managesTenantContract = req.user.buildingIds && tenant.contracts.some((c) => req.user.buildingIds.includes(c.office?.buildingId));

      if (!isSelf && !ownsTenantContract && !managesTenantContract) {
        return errorResponse(res, 'Access denied: You do not have authorization to view this tenant.', 403);
      }
    }

    return successResponse(res, 'Tenant details retrieved', tenant);
  } catch (error) {
    next(error);
  }
};

export const createTenant = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      email,
      idNumber,
      officeId,
      rent,
      frequency = 'MONTHLY',
      startDate,
      endDate,
      dueDay = 5,
    } = req.body;

    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: { building: true },
    });

    if (!office) {
      return errorResponse(res, 'Office not found', 404);
    }

    if (office.status === 'OCCUPIED') {
      return errorResponse(res, 'Office is already occupied.', 400);
    }

    // Multi-tenant building permission check
    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        if (office.building?.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property building.', 403);
        }
      } else if (!req.user.buildingIds || !req.user.buildingIds.includes(office.buildingId)) {
        return errorResponse(res, 'Access denied: You do not have permission to manage this building.', 403);
      }
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setFullYear(start.getFullYear() + 1));
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : `${fullName.toLowerCase().replace(/[\s\W]+/g, '.')}.${office.number}@enqoparentpro.et`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or link Tenant
      const tenant = await tx.tenant.create({
        data: {
          fullName,
          phone,
          email: cleanEmail,
          idNumber: idNumber || null,
        },
      });

      // 2. Create active contract
      const contract = await tx.contract.create({
        data: {
          officeId: office.id,
          tenantId: tenant.id,
          rent,
          frequency,
          startDate: start,
          endDate: end,
          dueDay: Number(dueDay) || 5,
          status: 'ACTIVE',
        },
      });

      // 3. Create initial rent history
      await tx.rentHistory.create({
        data: {
          contractId: contract.id,
          rent,
          effectiveFrom: start,
        },
      });

      // 4. Update office to OCCUPIED
      await tx.office.update({
        where: { id: office.id },
        data: { status: 'OCCUPIED' },
      });

      // 5. Append audit log
      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'ASSIGN_TENANT',
          entityType: 'Office',
          entityId: office.id,
          officeId: office.id,
          meta: `Added tenant ${fullName} to Office ${office.number} (Rent: ETB ${rent.toLocaleString()})`,
        },
      });

      return { tenant, contract };
    }, { maxWait: 15000, timeout: 30000 });

    return successResponse(res, 'Tenant assigned and portal link generated successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phone, email, idNumber } = req.body;

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!existingTenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    if (!req.user.isSuperAdmin) {
      const ownsTenantContract = existingTenant.contracts.some((c) => c.office?.building?.ownerId === req.user.id);
      const managesTenantContract = req.user.buildingIds && existingTenant.contracts.some((c) => req.user.buildingIds.includes(c.office?.buildingId));

      if (!ownsTenantContract && !managesTenantContract) {
        return errorResponse(res, 'Access denied: You do not have authorization to modify this tenant.', 403);
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(idNumber !== undefined && { idNumber }),
      },
    });

    return successResponse(res, 'Tenant details updated', tenant);
  } catch (error) {
    next(error);
  }
};

export const endTenancy = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only OWNER can end tenancy per business rules
    if (!req.user.isOwner) {
      return errorResponse(res, 'Only the property Owner can end tenancies.', 403);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    const activeContract = tenant.contracts[0];
    if (!activeContract) {
      return errorResponse(res, 'Tenant has no active contract to end.', 400);
    }

    const office = activeContract.office;

    // Multi-tenant IDOR check
    if (!req.user.isSuperAdmin && req.user.isOwner && office.building?.ownerId !== req.user.id) {
      return errorResponse(res, 'Access denied: You do not own this property', 403);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark contract as ENDED
      await tx.contract.update({
        where: { id: activeContract.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });

      // 2. Mark office as AVAILABLE
      await tx.office.update({
        where: { id: office.id },
        data: { status: 'AVAILABLE' },
      });

      // 3. Log audit entry
      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'END_TENANCY',
          entityType: 'Office',
          entityId: office.id,
          officeId: office.id,
          meta: `Ended tenancy for ${tenant.fullName} — Office ${office.number} now available`,
        },
      });
    }, { maxWait: 15000, timeout: 30000 });

    return successResponse(res, `Tenancy ended for ${tenant.fullName}. Office ${office.number} is now available.`);
  } catch (error) {
    next(error);
  }
};
