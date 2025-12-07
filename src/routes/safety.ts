import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import {
  shareLocation,
  reportEmergency,
  markSafe,
  checkIn,
  getMySafetyHistory,
  getAllSafetyAlerts,
  getUnacknowledgedEmergencies,
  acknowledgeSafetyAlert,
  getSafetyStatistics,
  getLiveSafetyFeed,
} from '../controllers/safetyController';

const router = express.Router();

// User routes
router.post('/location', authenticate, shareLocation);
router.post('/emergency', authenticate, reportEmergency);
router.post('/safe', authenticate, markSafe);
router.post('/check-in', authenticate, checkIn);
router.get('/history', authenticate, getMySafetyHistory);

// Admin routes
router.get('/admin/alerts', authenticate, requireAdmin, getAllSafetyAlerts);
router.get('/admin/feed', authenticate, requireAdmin, getLiveSafetyFeed);
router.get('/admin/emergencies', authenticate, requireAdmin, getUnacknowledgedEmergencies);
router.post('/admin/acknowledge/:id', authenticate, requireAdmin, acknowledgeSafetyAlert);
router.get('/admin/statistics', authenticate, requireAdmin, getSafetyStatistics);

export default router;

