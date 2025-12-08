import express from 'express';
import { authenticate } from '../middleware/auth';
import * as reviewController from '../controllers/reviewController';

const router = express.Router();

// Get event reviews (public)
router.get('/events/:eventId/reviews', reviewController.getEventReviews);

// All other routes require authentication
router.use(authenticate);

// Submit event review
router.post('/', reviewController.submitEventReview);

// Get user's review for an event
router.get('/events/:eventId/reviews/me', reviewController.getUserReview);

export default router;

