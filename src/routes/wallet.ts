import express from 'express';
import { authenticate } from '../middleware/auth';
import * as walletController from '../controllers/walletController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user wallet
router.get('/wallet', walletController.getUserWallet);

// Get points transactions history
router.get('/wallet/transactions', walletController.getPointsTransactions);

// Get available rewards
router.get('/wallet/rewards', walletController.getAvailableRewards);

// Redeem points for rewards
router.post('/wallet/redeem', walletController.redeemPoints);

export default router;

