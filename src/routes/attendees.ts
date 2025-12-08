import express from 'express';
import { authenticate } from '../middleware/auth';
import * as attendeeController from '../controllers/attendeeController';

const router = express.Router();

// Get event attendees (Who's Going)
router.get('/events/:eventId/attendees', attendeeController.getEventAttendees);

// Follow/unfollow users
router.post('/users/:userId/follow', authenticate, attendeeController.followUser);
router.delete('/users/:userId/follow', authenticate, attendeeController.unfollowUser);
router.get('/users/:userId/follow-status', authenticate, attendeeController.checkFollowStatus);

// Get followers and following
router.get('/users/:userId/followers', attendeeController.getFollowers);
router.get('/users/:userId/following', attendeeController.getFollowing);

export default router;

