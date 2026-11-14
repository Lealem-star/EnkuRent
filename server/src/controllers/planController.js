import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { priceMonthly: 'asc' },
    });

    const enriched = plans.map((p) => {
      let parsedFeatures = [];
      try {
        parsedFeatures = p.features ? JSON.parse(p.features) : [];
      } catch {
        parsedFeatures = p.features ? [p.features] : [];
      }

      return {
        ...p,
        features: parsedFeatures,
        activeSubscriptionsCount: p._count?.subscriptions || 0,
      };
    });

    return successResponse(res, 'Subscription plans retrieved', enriched);
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            owner: { select: { id: true, name: true, companyName: true, email: true } },
          },
        },
      },
    });

    if (!plan) {
      return errorResponse(res, 'Plan not found', 404);
    }

    let parsedFeatures = [];
    try {
      parsedFeatures = plan.features ? JSON.parse(plan.features) : [];
    } catch {
      parsedFeatures = plan.features ? [plan.features] : [];
    }

    return successResponse(res, 'Plan retrieved', {
      ...plan,
      features: parsedFeatures,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const {
      slug,
      name,
      description,
      priceMonthly,
      priceYearly,
      currency = 'ETB',
      maxProperties = 2,
      maxOffices = 15,
      maxStaff = 2,
      trialDays = 14,
      gracePeriodDays = 7,
      isEnterprise = false,
      features = [],
    } = req.body;

    if (!slug || !name || priceMonthly === undefined || priceYearly === undefined) {
      return errorResponse(res, 'Slug, name, monthly price and yearly price are required', 400);
    }

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });
    if (existing) {
      return errorResponse(res, 'A plan with this slug already exists', 400);
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        slug: slug.toLowerCase().trim(),
        name,
        description,
        priceMonthly: Number(priceMonthly),
        priceYearly: Number(priceYearly),
        currency,
        maxProperties: Number(maxProperties),
        maxOffices: Number(maxOffices),
        maxStaff: Number(maxStaff),
        trialDays: Number(trialDays),
        gracePeriodDays: Number(gracePeriodDays),
        isEnterprise: Boolean(isEnterprise),
        features: Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([features]),
      },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUBSCRIPTION_PLAN_CREATED',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      meta: { name: plan.name, slug: plan.slug, priceMonthly: plan.priceMonthly },
    });

    return successResponse(res, 'Plan created successfully', plan, 201);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      maxProperties,
      maxOffices,
      maxStaff,
      trialDays,
      gracePeriodDays,
      isEnterprise,
      isActive,
      features,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (priceMonthly !== undefined) data.priceMonthly = Number(priceMonthly);
    if (priceYearly !== undefined) data.priceYearly = Number(priceYearly);
    if (maxProperties !== undefined) data.maxProperties = Number(maxProperties);
    if (maxOffices !== undefined) data.maxOffices = Number(maxOffices);
    if (maxStaff !== undefined) data.maxStaff = Number(maxStaff);
    if (trialDays !== undefined) data.trialDays = Number(trialDays);
    if (gracePeriodDays !== undefined) data.gracePeriodDays = Number(gracePeriodDays);
    if (isEnterprise !== undefined) data.isEnterprise = Boolean(isEnterprise);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (features !== undefined) {
      data.features = Array.isArray(features) ? JSON.stringify(features) : JSON.stringify([features]);
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: updated.id,
      meta: { name: updated.name, slug: updated.slug },
    });

    return successResponse(res, 'Plan updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const togglePlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) return errorResponse(res, 'Plan not found', 404);

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });

    return successResponse(
      res,
      `Plan '${plan.name}' ${updated.isActive ? 'activated' : 'archived'} successfully`,
      updated
    );
  } catch (error) {
    next(error);
  }
};
