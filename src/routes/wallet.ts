import express from 'express';
import { authenticate } from '../middleware/auth';
import * as walletController from '../controllers/walletController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user wallet
router.get('/', walletController.getUserWallet);

// Get points transactions history
router.get('/transactions', walletController.getPointsTransactions);

// Get available rewards
router.get('/rewards', walletController.getAvailableRewards);

// Redeem points for rewards
router.post('/redeem', walletController.redeemPoints);

export default router;

