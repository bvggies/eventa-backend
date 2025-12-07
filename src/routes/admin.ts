import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAnalytics,
  getNotifications,
  getRecentActivity,
  getFinancialData,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User management
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/notifications', getNotifications);
router.get('/activity', getRecentActivity);
router.get('/financial', getFinancialData);

export default router;

