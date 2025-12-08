import express from 'express';
import { authenticate } from '../middleware/auth';
import * as groupController from '../controllers/eventGroupController';

const router = express.Router();

// Get event groups (public)
router.get('/events/:eventId/groups', groupController.getEventGroups);

// All other routes require authentication
router.use(authenticate);

// Create event group
router.post('/', groupController.createEventGroup);

// Join event group by invite code
router.post('/join', groupController.joinEventGroup);

// Get group details
router.get('/:groupId', groupController.getGroupDetails);

// Leave event group
router.delete('/:groupId/leave', groupController.leaveEventGroup);

// Group chat
router.post('/:groupId/messages', groupController.sendGroupMessage);
router.get('/:groupId/messages', groupController.getGroupMessages);

export default router;

