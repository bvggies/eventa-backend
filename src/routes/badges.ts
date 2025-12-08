import express from 'express';
import { authenticate } from '../middleware/auth';
import * as badgeController from '../controllers/badgeController';

const router = express.Router();

// Get all badges (public, but shows earned status if authenticated)
router.get('/', badgeController.getAllBadges);

// All other routes require authentication
router.use(authenticate);

// Get user badges
router.get('/me', badgeController.getUserBadges);

// Get badge progress for user
router.get('/progress', badgeController.getBadgeProgress);

export default router;

