import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get event attendees (Who's Going)
export const getEventAttendees = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = (req as AuthRequest).userId || null; // Optional auth

    // Get attendees who RSVP'd as "going" or have tickets
    const result = await pool.query(
      `SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        r.status as rsvp_status,
        r.created_at as rsvp_date,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2 AND following_id = u.id)
        ELSE FALSE END as is_following,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = u.id AND following_id = $2)
        ELSE FALSE END as follows_you
      FROM users u
      INNER JOIN rsvps r ON r.user_id = u.id
      WHERE r.event_id = $1 AND r.status = 'going'
      UNION
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        'going' as rsvp_status,
        t.created_at as rsvp_date,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2 AND following_id = u.id)
        ELSE FALSE END as is_following,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = u.id AND following_id = $2)
        ELSE FALSE END as follows_you
      FROM users u
      INNER JOIN tickets t ON t.user_id = u.id
      WHERE t.event_id = $1 AND t.payment_status = 'completed'
      ORDER BY rsvp_date DESC
      LIMIT $3 OFFSET $4`,
      [eventId, userId, limit, offset]
    );

    res.json({
      attendees: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Follow a user
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;

    if (req.userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert follow relationship
    await pool.query(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [req.userId, targetUserId]
    );

    // Update follower count
    await pool.query(
      `UPDATE users SET following_count = following_count + 1 WHERE id = $1`,
      [req.userId]
    );

    // Update following count
    await pool.query(
      `UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`,
      [targetUserId]
    );

    res.json({ message: 'User followed successfully', following: true });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unfollow a user
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;

    // Delete follow relationship
    const result = await pool.query(
      `DELETE FROM user_follows
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [req.userId, targetUserId]
    );

    if (result.rows.length > 0) {
      // Update follower count
      await pool.query(
        `UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1`,
        [req.userId]
      );

      // Update following count
      await pool.query(
        `UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1`,
        [targetUserId]
      );
    }

    res.json({ message: 'User unfollowed successfully', following: false });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's followers
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as AuthRequest).userId || null;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        uf.created_at as followed_at,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2 AND following_id = u.id)
        ELSE FALSE END as is_following
      FROM users u
      INNER JOIN user_follows uf ON uf.follower_id = u.id
      WHERE uf.following_id = $1
      ORDER BY uf.created_at DESC`,
      [userId, currentUserId]
    );

    res.json({ followers: result.rows });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users that a user is following
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as AuthRequest).userId || null;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        uf.created_at as followed_at,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2 AND following_id = u.id)
        ELSE FALSE END as is_following
      FROM users u
      INNER JOIN user_follows uf ON uf.following_id = u.id
      WHERE uf.follower_id = $1
      ORDER BY uf.created_at DESC`,
      [userId, currentUserId]
    );

    res.json({ following: result.rows });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if current user follows a user
export const checkFollowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;

    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_follows 
        WHERE follower_id = $1 AND following_id = $2
      ) as is_following`,
      [req.userId, targetUserId]
    );

    res.json({ isFollowing: result.rows[0].is_following });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

