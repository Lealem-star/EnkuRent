import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getSubscriptions = async (req, res, next) => {
  try {
    const { status, search, cycle } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (cycle && cycle !== 'ALL') {
      where.billingCycle = cycle;
    }

    if (search) {
      where.owner = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { companyName: { contains: search } },
        ],
      };
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            _count: { select: { ownedBuildings: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = subscriptions.map((s) => ({
      ...s,
      ownerBuildingsCount: s.owner?._count?.ownedBuildings || 0,
    }));

    return successResponse(res, 'Subscriptions retrieved', enriched);
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        owner: {
          include: {
            ownedBuildings: {
              include: { _count: { select: { offices: true } } },
            },
            teamMembers: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sub) return errorResponse(res, 'Subscription not found', 404);

    return successResponse(res, 'Subscription details retrieved', sub);
  } catch (error) {
    next(error);
  }
};

export const assignSubscription = async (req, res, next) => {
  try {
    const { ownerId, planId, billingCycle = 'YEARLY', trialDays, notes } = req.body;

    if (!ownerId || !planId) {
      return errorResponse(res, 'ownerId and planId are required', 400);
    }

    const [owner, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: ownerId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!owner || owner.role !== 'OWNER') {
      return errorResponse(res, 'Valid building owner not found', 404);
    }

    if (!plan) {
      return errorResponse(res, 'Subscription plan not found', 404);
    }

    const now = new Date();
    let endDate = new Date(now);
    let status = 'ACTIVE';

    if (trialDays && Number(trialDays) > 0) {
      status = 'TRIAL';
      endDate.setDate(now.getDate() + Number(trialDays));
    } else if (billingCycle === 'YEARLY') {
      endDate.setFullYear(now.getFullYear() + 1);
    } else {
      endDate.setMonth(now.getMonth() + 1);
    }

    const amount = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

    // Deactivate previous active subscriptions for this owner
    await prisma.subscription.updateMany({
      where: { ownerId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
      data: { status: 'CANCELLED' },
    });

    const subscription = await prisma.subscription.create({
      data: {
        ownerId,
        planId,
        billingCycle,
        status,
        amount,
        currency: plan.currency || 'ETB',
        startDate: now,
        endDate,
        renewsAt: endDate,
        notes: notes || `Assigned ${plan.name} (${billingCycle}) by administrator.`,
      },
      include: { plan: true, owner: true },
    });

    // Create an invoice record
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        ownerId,
        invoiceNumber: invoiceNum,
        amount,
        currency: plan.currency || 'ETB',
        billingCycle,
        period: `${billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'} Subscription`,
        status: status === 'TRIAL' ? 'PENDING' : 'APPROVED',
        paymentMethod: 'BANK_TRANSFER',
        paidAt: status === 'ACTIVE' ? now : null,
      },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUBSCRIPTION_ASSIGNED',
      entityType: 'Subscription',
      entityId: subscription.id,
      meta: {
        ownerEmail: owner.email,
        planName: plan.name,
        billingCycle,
        status,
      },
    });

    return successResponse(res, `Assigned ${plan.name} to ${owner.name}`, subscription, 201);
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, extendDays, notes } = req.body;

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { owner: true, plan: true },
    });

    if (!sub) return errorResponse(res, 'Subscription not found', 404);

    const data = {};
    if (status) data.status = status;
    if (notes) data.notes = notes;

    if (extendDays && Number(extendDays) > 0) {
      const currentEnd = new Date(sub.endDate);
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      baseDate.setDate(baseDate.getDate() + Number(extendDays));
      data.endDate = baseDate;
      data.renewsAt = baseDate;
      if (sub.status === 'EXPIRED' || sub.status === 'PAST_DUE') {
        data.status = 'ACTIVE';
      }
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data,
      include: { plan: true, owner: true },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUBSCRIPTION_STATUS_UPDATED',
      entityType: 'Subscription',
      entityId: updated.id,
      meta: {
        newStatus: updated.status,
        ownerEmail: sub.owner?.email,
        extendDays: extendDays || 0,
      },
    });

    return successResponse(res, 'Subscription updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Logged-in Owner - Check their current subscription & plan entitlements
 */
export const getMySubscription = async (req, res, next) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;
    if (!ownerId) {
      return errorResponse(res, 'No owner profile associated with this account', 400);
    }

    const sub = await prisma.subscription.findFirst({
      where: {
        ownerId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    const [buildingsCount, officesCount, staffCount] = await Promise.all([
      prisma.building.count({ where: { ownerId } }),
      prisma.office.count({ where: { building: { ownerId } } }),
      prisma.user.count({ where: { ownerId } }),
    ]);

    let parsedFeatures = [];
    if (sub?.plan?.features) {
      try {
        parsedFeatures = JSON.parse(sub.plan.features);
      } catch {
        parsedFeatures = [sub.plan.features];
      }
    }

    return successResponse(res, 'Subscription details retrieved', {
      subscription: sub,
      plan: sub?.plan ? { ...sub.plan, features: parsedFeatures } : null,
      usage: {
        buildings: { current: buildingsCount, max: sub?.plan?.maxProperties || 2 },
        offices: { current: officesCount, max: sub?.plan?.maxOffices || 15 },
        staff: { current: staffCount, max: sub?.plan?.maxStaff || 2 },
      },
    });
  } catch (error) {
    next(error);
  }
};
