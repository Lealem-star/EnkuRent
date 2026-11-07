import { Router } from 'express';
import {
  initializeChapa,
  verifyChapa,
  webhookChapa,
  instantPay,
} from '../controllers/gatewayController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public webhook
router.post('/chapa/webhook', webhookChapa);

// Authenticated gateway endpoints
router.post('/chapa/initialize', authenticate, initializeChapa);
router.get('/chapa/verify/:txRef', verifyChapa);
router.post('/instant-pay', authenticate, instantPay);

export default router;

