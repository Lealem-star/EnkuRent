import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';
import { errorResponse } from '../utils/response.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return errorResponse(res, 'Invalid token payload.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        buildings: {
          select: { buildingId: true },
        },
        tenantProfile: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    if (!user) {
      return errorResponse(res, 'User no longer exists.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated. Contact administration.', 403);
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isOwner = user.role === 'OWNER';
    const isManager = user.role === 'MANAGER' || user.role === 'ACCOUNTANT';
    const buildingIds = isSuperAdmin ? null : (isOwner ? null : user.buildings.map((b) => b.buildingId));

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      title: user.title,
      companyName: user.companyName,
      ownerId: user.ownerId || (isOwner ? user.id : null),
      isSuperAdmin,
      isOwner,
      isManager,
      isTenant: user.role === 'TENANT',
      buildingIds, // null for super admin and owner; manager has assigned buildings
      tenantId: user.tenantProfile?.id || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please sign in again.', 401);
    }
    return errorResponse(res, 'Invalid authorization token.', 401);
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthenticated user.', 401);
    }

    if (req.user.role === 'SUPER_ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return errorResponse(
      res,
      `Forbidden: Role '${req.user.role}' does not have access to this resource.`,
      403
    );
  };
};

/**
 * Ensures owners only access buildings they own, and managers only access buildings assigned to them
 */
export const checkBuildingAccess = (buildingIdParam = 'buildingId') => {
  return async (req, res, next) => {
    if (req.user.isSuperAdmin) return next();

    const targetBuildingId = req.params[buildingIdParam] || req.body[buildingIdParam] || req.query[buildingIdParam];
    if (!targetBuildingId || targetBuildingId === '__all__') return next();

    try {
      if (req.user.isOwner) {
        const building = await prisma.building.findUnique({
          where: { id: String(targetBuildingId) },
          select: { ownerId: true },
        });
        if (!building || building.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property.', 403);
        }
        return next();
      }

      if (req.user.buildingIds && !req.user.buildingIds.includes(String(targetBuildingId))) {
        return errorResponse(res, 'Access denied: You are not assigned to this property.', 403);
      }

      next();
    } catch (err) {
      return errorResponse(res, 'Authorization check failed.', 500);
    }
  };
};
