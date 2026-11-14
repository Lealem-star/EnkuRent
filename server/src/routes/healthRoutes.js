import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Check database connection by executing a lightweight query
    await prisma.$queryRaw`SELECT 1`;

    return successResponse(res, 'Enqopa RentPro API is healthy', {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: 'CONNECTED',
        provider: 'mysql',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health Check DB Connection Error:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Service Unavailable: Database connection failed',
      status: 'ERROR',
      database: {
        status: 'DISCONNECTED',
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

