import express from 'express';
import { rsvp, getMyRsvps, cancelRsvp } from '../controllers/rsvpController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, rsvp);
router.get('/', authenticate, getMyRsvps);
router.delete('/:eventId', authenticate, cancelRsvp);

export default router;

