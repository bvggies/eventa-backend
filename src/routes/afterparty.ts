import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAfterPartyVenues,
  addVenue,
  getAllVenues,
  deleteVenue,
} from '../controllers/afterpartyController';

const router = express.Router();

// Public routes
router.get('/nearby', getAfterPartyVenues);

// Admin routes
router.post('/venues', authenticate, addVenue);
router.get('/venues', authenticate, getAllVenues);
router.delete('/venues/:id', authenticate, deleteVenue);

export default router;

