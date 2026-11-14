import QRCode from 'qrcode';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getOffices = async (req, res, next) => {
  try {
    const { buildingId, floor, status } = req.query;
    const where = { isDeleted: false };

    if (req.user.isSuperAdmin) {
      if (buildingId && buildingId !== '__all__') {
        where.buildingId = String(buildingId);
      }
    } else if (req.user.isOwner) {
      where.building = { ownerId: req.user.id, isDeleted: false };
      if (buildingId && buildingId !== '__all__') {
        where.buildingId = String(buildingId);
      }
    } else if (req.user.buildingIds && req.user.buildingIds.length > 0) {
      if (buildingId && buildingId !== '__all__') {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return successResponse(res, 'No offices accessible', []);
        }
        where.buildingId = String(buildingId);
      } else {
        where.buildingId = { in: req.user.buildingIds };
      }
    } else {
      return successResponse(res, 'No offices accessible', []);
    }

    if (floor) where.floor = parseInt(floor, 10);
    if (status) where.status = String(status);

    const offices = await prisma.office.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, address: true } },
        contracts: {
          where: { status: 'ACTIVE', isDeleted: false },
          include: {
            tenant: true,
            payments: {
              where: { period: 'September 2026' },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });

    const enriched = offices.map((o) => {
      const activeContract = o.contracts[0] || null;
      const tenant = activeContract?.tenant || null;
      const currentPayment = activeContract?.payments?.[0] || null;

      let cycleStatus = 'available';
      if (o.status === 'MAINTENANCE') {
        cycleStatus = 'maintenance';
      } else if (o.status === 'OCCUPIED' && tenant) {
        if (currentPayment) {
          if (currentPayment.status === 'APPROVED') cycleStatus = 'paid';
          else if (currentPayment.status === 'PENDING') cycleStatus = 'pending';
          else if (currentPayment.status === 'REJECTED') cycleStatus = 'rejected';
        } else {
          cycleStatus = 'overdue';
        }
      }

      return {
        id: o.id,
        buildingId: o.buildingId,
        buildingName: o.building.name,
        floor: o.floor,
        number: o.number,
        status: o.status,
        tenantId: tenant ? tenant.id : null,
        tenantName: tenant ? tenant.fullName : null,
        rent: activeContract ? Number(activeContract.rent) : 0,
        cycleStatus,
      };
    });

    return successResponse(res, 'Offices retrieved', enriched);
  } catch (error) {
    next(error);
  }
};

export const getOfficeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const office = await prisma.office.findUnique({
      where: { id },
      include: {
        building: true,
        contracts: {
          include: {
            tenant: true,
            rentHistories: { orderBy: { effectiveFrom: 'desc' } },
            documents: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          include: { tenant: true },
          orderBy: [{ submittedAt: 'desc' }, { paymentDate: 'desc' }],
        },
        auditEntries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!office) {
      return errorResponse(res, 'Office not found', 404);
    }

    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner && office.building?.ownerId !== req.user.id) {
        return errorResponse(res, 'Access denied: You do not own this office property', 403);
      }
      if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(office.buildingId)) {
        return errorResponse(res, 'Access denied for this office', 403);
      }
    }

    if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(office.buildingId)) {
      return errorResponse(res, 'Access denied for this office', 403);
    }

    const activeContract = office.contracts.find((c) => c.status === 'ACTIVE') || null;
    const currentPayment = office.payments.find((p) => p.period === 'September 2026') || null;

    let cycleStatus = 'unpaid';
    if (office.status === 'AVAILABLE') {
      cycleStatus = 'available';
    } else if (office.status === 'MAINTENANCE') {
      cycleStatus = 'maintenance';
    } else if (currentPayment) {
      if (currentPayment.status === 'APPROVED') cycleStatus = 'paid';
      else if (currentPayment.status === 'PENDING') cycleStatus = 'pending';
      else if (currentPayment.status === 'REJECTED') cycleStatus = 'rejected';
    } else {
      cycleStatus = 'overdue';
    }

    return successResponse(res, 'Office detail retrieved', {
      ...office,
      activeContract,
      currentPayment,
      cycleStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOfficeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingOffice = await prisma.office.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!existingOffice) {
      return errorResponse(res, 'Office not found', 404);
    }

    // Multi-tenant authorization check
    if (!req.user.isSuperAdmin) {
      if (req.user.isOwner) {
        if (existingOffice.building?.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property office.', 403);
        }
      } else if (!req.user.buildingIds || !req.user.buildingIds.includes(existingOffice.buildingId)) {
        return errorResponse(res, 'Access denied: You are not assigned to manage this building.', 403);
      }
    }

    const office = await prisma.office.update({
      where: { id },
      data: { status },
      include: { building: true },
    });

    await prisma.auditLog.create({
      data: {
        actorName: req.user.name,
        actorId: req.user.id,
        action: 'OFFICE_STATUS_UPDATED',
        entityType: 'Office',
        entityId: office.id,
        officeId: office.id,
        meta: `Office ${office.number} status changed to ${status}`,
      },
    });

    return successResponse(res, 'Office status updated', office);
  } catch (error) {
    next(error);
  }
};

export const getOfficeQrCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const portalUrl = `${req.protocol}://${req.get('host')}/#/portal/o/${id}`;
    const svg = await QRCode.toString(portalUrl, { type: 'svg', margin: 1, width: 200 });
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  } catch (error) {
    next(error);
  }
};
