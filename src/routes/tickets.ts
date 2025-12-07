import express from 'express';
import { buyTicket, getMyTickets, getTicketById } from '../controllers/ticketController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, buyTicket);
router.get('/', authenticate, getMyTickets);
router.get('/:id', authenticate, getTicketById);

export default router;

