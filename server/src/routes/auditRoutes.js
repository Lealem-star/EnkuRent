import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('OWNER', 'MANAGER'));

router.get('/', getAuditLogs);

export default router;

