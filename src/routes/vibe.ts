import express from 'express';
import { rateEvent, getEventRatings } from '../controllers/vibeController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, rateEvent);
router.get('/event/:eventId', getEventRatings);

export default router;

