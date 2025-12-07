import express from 'express';
import {
  getAllEvents,
  getEventById,
  getFeaturedEvents,
  getTrendingEvents,
  getNearbyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/featured', getFeaturedEvents);
router.get('/trending', getTrendingEvents);
router.get('/nearby', getNearbyEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, createEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;

