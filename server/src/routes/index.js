import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';
import systemRoutes from './systemRoutes.js';
import buildingRoutes from './buildingRoutes.js';
import officeRoutes from './officeRoutes.js';
import tenantRoutes from './tenantRoutes.js';
import contractRoutes from './contractRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import gatewayRoutes from './gatewayRoutes.js';
import reportRoutes from './reportRoutes.js';
import auditRoutes from './auditRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/system', systemRoutes);
router.use('/buildings', buildingRoutes);
router.use('/offices', officeRoutes);
router.use('/tenants', tenantRoutes);
router.use('/contracts', contractRoutes);
router.use('/payments', paymentRoutes);
router.use('/gateway', gatewayRoutes);
router.use('/reports', reportRoutes);
router.use('/audit', auditRoutes);
router.use('/users', userRoutes);

export default router;
