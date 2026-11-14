import { Router } from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  replyToTicket,
  updateTicketStatus,
} from '../controllers/supportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/', createTicket);
router.post('/:id/reply', replyToTicket);
router.patch('/:id/status', authorize('SUPER_ADMIN', 'OWNER', 'MANAGER'), updateTicketStatus);

export default router;
