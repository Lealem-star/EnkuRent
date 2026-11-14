import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../config/prisma.js';
import { errorResponse } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, '../../uploads');

export const getSecureDocument = async (req, res, next) => {
  try {
    const rawFilename = req.params.filename || req.params[0] || req.params['0'] || '';
    const filename = decodeURIComponent(rawFilename);

    // 1. Prevent Path Traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename || safeFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return errorResponse(res, 'Invalid document identifier.', 400);
    }

    const filePath = path.resolve(uploadDirectory, safeFilename);

    // Verify file resides strictly within the uploads directory
    if (!filePath.startsWith(uploadDirectory)) {
      return errorResponse(res, 'Access denied.', 403);
    }

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 'Document not found.', 404);
    }

    // 2. Multi-Tenant Authorization Check
    if (!req.user.isSuperAdmin) {
      // Find corresponding payment or contract record
      const payment = await prisma.payment.findFirst({
        where: {
          receiptUrl: { contains: safeFilename },
        },
        include: {
          building: true,
          tenant: true,
        },
      });

      const document = !payment
        ? await prisma.document.findFirst({
            where: {
              fileUrl: { contains: safeFilename },
            },
            include: {
              contract: {
                include: { office: { include: { building: true } } },
              },
              tenant: true,
            },
          })
        : null;

      if (!payment && !document) {
        // Document exists on disk but is not linked to any authorized database record
        return errorResponse(res, 'Access denied: Unlinked document.', 403);
      }

      if (payment) {
        if (req.user.role === 'TENANT') {
          const isTenantOwner = payment.tenantId === req.user.tenantId || payment.tenant?.userId === req.user.id;
          if (!isTenantOwner) {
            return errorResponse(res, 'Access denied: You do not own this document.', 403);
          }
        } else if (req.user.role === 'OWNER') {
          if (payment.building?.ownerId !== req.user.id) {
            return errorResponse(res, 'Access denied: You do not own this property document.', 403);
          }
        } else if (req.user.role === 'MANAGER' || req.user.role === 'ACCOUNTANT') {
          if (!req.user.buildingIds || !req.user.buildingIds.includes(payment.buildingId)) {
            return errorResponse(res, 'Access denied: You are not assigned to this property.', 403);
          }
        } else {
          return errorResponse(res, 'Access denied.', 403);
        }
      } else if (document) {
        const buildingOwnerId = document.contract?.office?.building?.ownerId;
        const buildingId = document.contract?.office?.buildingId;

        if (req.user.role === 'TENANT') {
          if (document.tenantId !== req.user.tenantId && document.tenant?.userId !== req.user.id) {
            return errorResponse(res, 'Access denied: You do not own this document.', 403);
          }
        } else if (req.user.role === 'OWNER') {
          if (buildingOwnerId !== req.user.id) {
            return errorResponse(res, 'Access denied: You do not own this property document.', 403);
          }
        } else if (req.user.role === 'MANAGER' || req.user.role === 'ACCOUNTANT') {
          if (!buildingId || !req.user.buildingIds || !req.user.buildingIds.includes(buildingId)) {
            return errorResponse(res, 'Access denied: You are not assigned to this property.', 403);
          }
        } else {
          return errorResponse(res, 'Access denied.', 403);
        }
      }
    }

    // 3. Set Secure Private Headers
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
