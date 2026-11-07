import { Router } from 'express';
import {
  getOffices,
  getOfficeById,
  updateOfficeStatus,
  getOfficeQrCode,
} from '../controllers/officeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public endpoint for QR code SVG (used for printing or downloading)
router.get('/:id/qr', getOfficeQrCode);

router.use(authenticate);
router.get('/', getOffices);
router.get('/:id', getOfficeById);
router.patch('/:id/status', updateOfficeStatus);

export default router;

