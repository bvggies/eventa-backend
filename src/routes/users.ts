import express from 'express';
import {
  getProfile,
  updateProfile,
  getSavedEvents,
  saveEvent,
  unsaveEvent,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/saved-events', authenticate, getSavedEvents);
router.post('/saved-events/:eventId', authenticate, saveEvent);
router.delete('/saved-events/:eventId', authenticate, unsaveEvent);

export default router;

