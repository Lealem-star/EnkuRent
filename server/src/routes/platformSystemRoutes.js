import { Router } from 'express';
import { getSystemHealth } from '../controllers/platformSystemController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/health', getSystemHealth);

export default router;
