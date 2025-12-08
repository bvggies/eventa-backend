import express from 'express';
import { authenticate } from '../middleware/auth';
import * as galleryController from '../controllers/galleryController';

const router = express.Router();

// Get event gallery (public)
router.get('/events/:eventId/gallery', galleryController.getEventGallery);

// All other routes require authentication
router.use(authenticate);

// Upload media to event gallery
router.post('/gallery', galleryController.uploadGalleryMedia);

// Tag user in gallery media
router.post('/gallery/:galleryId/tags', galleryController.tagUserInGallery);

// Remove tag from gallery media
router.delete('/gallery/:galleryId/tags/:tagId', galleryController.removeGalleryTag);

// Mark media as highlight (organizer only)
router.patch('/gallery/:galleryId/highlight', galleryController.markAsHighlight);

export default router;

