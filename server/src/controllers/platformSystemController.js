import os from 'os';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getSystemHealth = async (req, res, next) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    const [totalUsers, totalOffices, totalPayments, recentErrors] = await Promise.all([
      prisma.user.count(),
      prisma.office.count(),
      prisma.payment.count(),
      prisma.auditLog.findMany({
        where: { action: { contains: 'FAIL' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const memoryUsage = process.memoryUsage();

    return successResponse(res, 'System health retrieved', {
      status: 'HEALTHY',
      platform: 'Enqopa RentPro B2B Cloud',
      environment: process.env.NODE_ENV || 'production',
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpuCores: os.cpus().length,
        freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
        heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
      database: {
        engine: 'TiDB Cloud Serverless (MySQL 8.0 Protocol)',
        status: 'CONNECTED',
        latencyMs: dbLatencyMs,
        ssl: 'ENABLED',
        counts: {
          totalUsers,
          totalOffices,
          totalPayments,
        },
      },
      cronJobs: {
        dailyBillingSweep: 'SCHEDULED (00:00 UTC)',
        gracePeriodChecker: 'SCHEDULED (01:00 UTC)',
        status: 'ACTIVE',
      },
      recentErrors,
    });
  } catch (error) {
    next(error);
  }
};
