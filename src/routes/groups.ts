import express from 'express';
import { authenticate } from '../middleware/auth';
import * as groupController from '../controllers/eventGroupController';

const router = express.Router();

// Get event groups (public)
router.get('/events/:eventId/groups', groupController.getEventGroups);

// All other routes require authentication
router.use(authenticate);

// Create event group
router.post('/groups', groupController.createEventGroup);

// Join event group by invite code
router.post('/groups/join', groupController.joinEventGroup);

// Get group details
router.get('/groups/:groupId', groupController.getGroupDetails);

// Leave event group
router.delete('/groups/:groupId/leave', groupController.leaveEventGroup);

// Group chat
router.post('/groups/:groupId/messages', groupController.sendGroupMessage);
router.get('/groups/:groupId/messages', groupController.getGroupMessages);

export default router;

