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

// SaaS Core routes
import planRoutes from './planRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import platformFinanceRoutes from './platformFinanceRoutes.js';
import gatewayAdminRoutes from './gatewayAdminRoutes.js';
import globalUserRoutes from './globalUserRoutes.js';
import supportRoutes from './supportRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import platformSettingsRoutes from './platformSettingsRoutes.js';
import platformSystemRoutes from './platformSystemRoutes.js';

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

// SaaS platform expansion routes
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/admin/finance', platformFinanceRoutes);
router.use('/admin/gateways', gatewayAdminRoutes);
router.use('/admin/users', globalUserRoutes);
router.use('/support', supportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin/settings', platformSettingsRoutes);
router.use('/admin/system', platformSystemRoutes);

export default router;
