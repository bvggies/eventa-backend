import express from 'express';
import { authenticate } from '../middleware/auth';
import * as icebreakerController from '../controllers/icebreakerController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Initiate icebreaker chat
router.post('/chats', icebreakerController.initiateIcebreakerChat);

// Get icebreaker chats for an event
router.get('/events/:eventId/chats', icebreakerController.getIcebreakerChats);

// Send message in icebreaker chat
router.post('/chats/:chatId/messages', icebreakerController.sendIcebreakerMessage);

// Get messages for an icebreaker chat
router.get('/chats/:chatId/messages', icebreakerController.getIcebreakerMessages);

export default router;

