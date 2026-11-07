import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * System Owner - Get platform-wide overview metrics
 */
export const getSystemOverview = async (req, res, next) => {
  try {
    const [
      totalOwners,
      pendingOwners,
      approvedOwners,
      totalBuildings,
      totalOffices,
      occupiedOffices,
      totalTenants,
      paymentsSummary,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'OWNER' } }),
      prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'PENDING' } }),
      prisma.user.count({ where: { role: 'OWNER', approvalStatus: 'APPROVED' } }),
      prisma.building.count(),
      prisma.office.count(),
      prisma.office.count({ where: { status: 'OCCUPIED' } }),
      prisma.tenant.count(),
      prisma.payment.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    const totalCollected = Number(paymentsSummary._sum.amount || 0);
    const occupancyRate = totalOffices > 0 ? Math.round((occupiedOffices / totalOffices) * 100) : 0;

    return successResponse(res, 'System overview retrieved', {
      totalOwners,
      pendingOwners,
      approvedOwners,
      totalBuildings,
      totalOffices,
      occupiedOffices,
      occupancyRate,
      totalTenants,
      totalCollected,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System Owner - Get list of building owners with approval filter
 */
export const getOwnersList = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const where = {
      role: 'OWNER',
    };

    if (status && status !== 'ALL') {
      where.approvalStatus = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const owners = await prisma.user.findMany({
      where,
      include: {
        ownedBuildings: {
          select: { id: true, name: true },
        },
        teamMembers: {
          select: { id: true, name: true, role: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = owners.map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      companyName: o.companyName || '—',
      notes: o.notes || '',
      role: o.role,
      approvalStatus: o.approvalStatus,
      isActive: o.isActive,
      createdAt: o.createdAt,
      buildingsCount: o.ownedBuildings ? o.ownedBuildings.length : 0,
      teamCount: o.teamMembers ? o.teamMembers.length : 0,
      buildings: o.ownedBuildings || [],
    }));

    return successResponse(res, 'Building owners retrieved', data);
  } catch (error) {
    next(error);
  }
};

/**
 * System Owner - Approve a pending building owner
 */
export const approveOwner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const owner = await prisma.user.findUnique({
      where: { id },
    });

    if (!owner) {
      return errorResponse(res, 'Owner record not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          id: 'aud_' + Math.random().toString(36).slice(2, 9),
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'OWNER_APPLICATION_APPROVED',
          entityType: 'User',
          entityId: owner.id,
          details: `Approved owner application for ${owner.name} (${owner.email})`,
        },
      });
    } catch {}

    return successResponse(res, `Owner '${owner.name}' has been approved and activated.`, {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      approvalStatus: updated.approvalStatus,
      isActive: updated.isActive,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System Owner - Reject a building owner registration
 */
export const rejectOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const owner = await prisma.user.findUnique({
      where: { id },
    });

    if (!owner) {
      return errorResponse(res, 'Owner record not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        isActive: false,
        notes: reason ? `Rejected: ${reason}` : owner.notes,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          id: 'aud_' + Math.random().toString(36).slice(2, 9),
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'OWNER_APPLICATION_REJECTED',
          entityType: 'User',
          entityId: owner.id,
          details: `Rejected owner registration for ${owner.name} (${owner.email}). Reason: ${reason || 'None'}`,
        },
      });
    } catch {}

    return successResponse(res, `Owner registration for '${owner.name}' has been rejected.`, {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      approvalStatus: updated.approvalStatus,
      isActive: updated.isActive,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System Owner - Toggle active status (suspend/activate)
 */
export const toggleOwnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const owner = await prisma.user.findUnique({
      where: { id },
    });

    if (!owner) {
      return errorResponse(res, 'Owner not found', 404);
    }

    const newStatus = !owner.isActive;
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus },
    });

    try {
      await prisma.auditLog.create({
        data: {
          id: 'aud_' + Math.random().toString(36).slice(2, 9),
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: newStatus ? 'OWNER_ACCOUNT_ACTIVATED' : 'OWNER_ACCOUNT_SUSPENDED',
          entityType: 'User',
          entityId: owner.id,
          details: `${newStatus ? 'Activated' : 'Suspended'} owner account ${owner.name}`,
        },
      });
    } catch {}

    return successResponse(
      res,
      `Owner '${owner.name}' account ${newStatus ? 'activated' : 'suspended'}.`,
      {
        id: updated.id,
        isActive: updated.isActive,
      }
    );
  } catch (error) {
    next(error);
  }
};

