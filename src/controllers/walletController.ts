import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Get user wallet
export const getUserWallet = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_wallets WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create wallet if it doesn't exist
      const newWallet = await pool.query(
        `INSERT INTO user_wallets (user_id, points_balance, coins_balance, total_earned, total_redeemed)
         VALUES ($1, 0, 0, 0, 0)
         RETURNING *`,
        [req.userId]
      );
      return res.json({ wallet: newWallet.rows[0] });
    }

    res.json({ wallet: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get points transactions history
export const getPointsTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    let query = `
      SELECT * FROM points_transactions
      WHERE user_id = $1
    `;
    const params: any[] = [req.userId];

    if (type) {
      query += ` AND transaction_type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching points transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Redeem points for rewards
export const redeemPoints = async (req: AuthRequest, res: Response) => {
  try {
    const { rewardType, rewardId, pointsCost, coinsCost } = req.body;

    // Get user wallet
    const walletResult = await pool.query(
      `SELECT * FROM user_wallets WHERE user_id = $1`,
      [req.userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const wallet = walletResult.rows[0];

    // Check if user has enough points/coins
    if (wallet.points_balance < pointsCost || wallet.coins_balance < coinsCost) {
      return res.status(400).json({ error: 'Insufficient points or coins' });
    }

    // Create transaction
    const transactionResult = await pool.query(
      `INSERT INTO points_transactions (
        user_id, transaction_type, points_amount, coins_amount, 
        source_type, source_id, description
      )
      VALUES ($1, 'redeem', $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        req.userId,
        pointsCost,
        coinsCost,
        rewardType, // discount, free_ticket, vip_upgrade
        rewardId || null,
        `Redeemed ${rewardType}`,
      ]
    );

    // Update wallet
    await pool.query(
      `UPDATE user_wallets 
       SET 
         points_balance = points_balance - $1,
         coins_balance = coins_balance - $2,
         total_redeemed = total_redeemed + $1 + $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [pointsCost, coinsCost, req.userId]
    );

    res.json({ 
      transaction: transactionResult.rows[0],
      message: 'Points redeemed successfully',
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Award points (internal function, can be called by other controllers)
export const awardPoints = async (
  userId: string,
  points: number,
  coins: number,
  sourceType: string,
  sourceId: string | null,
  description: string
) => {
  try {
    // Create transaction
    await pool.query(
      `INSERT INTO points_transactions (
        user_id, transaction_type, points_amount, coins_amount, 
        source_type, source_id, description
      )
      VALUES ($1, 'earn', $2, $3, $4, $5, $6)`,
      [userId, points, coins, sourceType, sourceId, description]
    );

    // Update wallet
    await pool.query(
      `INSERT INTO user_wallets (user_id, points_balance, coins_balance, total_earned)
       VALUES ($1, $2, $3, $2 + $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         points_balance = user_wallets.points_balance + $2,
         coins_balance = user_wallets.coins_balance + $3,
         total_earned = user_wallets.total_earned + $2 + $3,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, points, coins]
    );
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
};

// Get available rewards
export const getAvailableRewards = async (req: AuthRequest, res: Response) => {
  try {
    // Get user wallet to show what they can afford
    const walletResult = await pool.query(
      `SELECT * FROM user_wallets WHERE user_id = $1`,
      [req.userId]
    );

    const wallet = walletResult.rows[0] || { points_balance: 0, coins_balance: 0 };

    const rewards = [
      {
        id: 'discount_10',
        type: 'discount',
        name: '10% Discount',
        description: 'Get 10% off your next ticket purchase',
        pointsCost: 100,
        coinsCost: 100,
        available: wallet.points_balance >= 100 && wallet.coins_balance >= 100,
      },
      {
        id: 'discount_20',
        type: 'discount',
        name: '20% Discount',
        description: 'Get 20% off your next ticket purchase',
        pointsCost: 200,
        coinsCost: 200,
        available: wallet.points_balance >= 200 && wallet.coins_balance >= 200,
      },
      {
        id: 'free_ticket',
        type: 'free_ticket',
        name: 'Free Ticket',
        description: 'Get one free ticket (up to GHS 50 value)',
        pointsCost: 500,
        coinsCost: 500,
        available: wallet.points_balance >= 500 && wallet.coins_balance >= 500,
      },
      {
        id: 'vip_upgrade',
        type: 'vip_upgrade',
        name: 'VIP Upgrade',
        description: 'Upgrade to VIP access at your next event',
        pointsCost: 1000,
        coinsCost: 1000,
        available: wallet.points_balance >= 1000 && wallet.coins_balance >= 1000,
      },
    ];

    res.json({ rewards });
  } catch (error) {
    console.error('Error fetching available rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

