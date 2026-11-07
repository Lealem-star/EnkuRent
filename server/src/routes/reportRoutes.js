import { Router } from 'express';
import { getOverview, exportReport } from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('OWNER', 'MANAGER'));

router.get('/overview', getOverview);
router.get('/export/:type/:format', exportReport);

export default router;
