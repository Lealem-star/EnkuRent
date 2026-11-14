import { Router } from 'express';
import {
  getPayments,
  recordManualPayment,
  approvePayment,
  rejectPayment,
  submitReceipt,
  manualPaymentSchema,
  rejectPaymentSchema,
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadReceipt } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/manual', authorize('OWNER', 'MANAGER'), validate(manualPaymentSchema), recordManualPayment);
router.post('/:id/approve', authorize('OWNER', 'MANAGER'), approvePayment);
router.patch('/:id/approve', authorize('OWNER', 'MANAGER'), approvePayment);
router.post('/:id/reject', authorize('OWNER', 'MANAGER'), validate(rejectPaymentSchema), rejectPayment);
router.patch('/:id/reject', authorize('OWNER', 'MANAGER'), validate(rejectPaymentSchema), rejectPayment);
router.post('/receipt', uploadReceipt.single('receipt'), submitReceipt);

export default router;
