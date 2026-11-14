import { Router } from 'express';
import {
  getPlatformFinanceOverview,
  getSubscriptionInvoices,
  exportFinanceExcel,
  exportFinancePDF,
} from '../controllers/platformFinanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Only Super Admin can access platform finance
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/overview', getPlatformFinanceOverview);
router.get('/invoices', getSubscriptionInvoices);
router.get('/export/excel', exportFinanceExcel);
router.get('/export/pdf', exportFinancePDF);

export default router;
