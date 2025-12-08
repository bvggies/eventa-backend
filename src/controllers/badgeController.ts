import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Get all badges
export const getAllBadges = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId || null;

    const result = await pool.query(
      `SELECT 
        b.*,
        CASE WHEN $1::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_id = b.id)
        ELSE FALSE END as is_earned,
        CASE WHEN $1::uuid IS NOT NULL THEN 
          (SELECT earned_at FROM user_badges WHERE user_id = $1 AND badge_id = b.id)
        ELSE NULL END as earned_at
      FROM badges b
      ORDER BY b.category, b.name`,
      [userId]
    );

    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user badges
export const getUserBadges = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        ub.*,
        b.name,
        b.display_name,
        b.description,
        b.icon,
        b.category
      FROM user_badges ub
      INNER JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC`,
      [req.userId]
    );

    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check and award badges (called after user actions)
export const checkAndAwardBadges = async (userId: string) => {
  try {
    // Get all badges with requirements
    const badgesResult = await pool.query(
      `SELECT * FROM badges WHERE requirement_type IS NOT NULL`
    );

    const badges = badgesResult.rows;

    for (const badge of badges) {
      // Check if user already has this badge
      const existingBadge = await pool.query(
        `SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
        [userId, badge.id]
      );

      if (existingBadge.rows.length > 0) {
        continue; // User already has this badge
      }

      let shouldAward = false;

      switch (badge.requirement_type) {
        case 'events_attended':
          const eventsCount = await pool.query(
            `SELECT COUNT(DISTINCT event_id) as count
             FROM tickets
             WHERE user_id = $1 AND payment_status = 'completed'
             UNION
             SELECT COUNT(DISTINCT event_id) as count
             FROM rsvps
             WHERE user_id = $1 AND status = 'going'`,
            [userId]
          );
          const totalEvents = eventsCount.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
          shouldAward = totalEvents >= badge.requirement_value;
          break;

        case 'buzz_posts':
          const buzzCount = await pool.query(
            `SELECT COUNT(*) as count FROM buzz_posts WHERE user_id = $1`,
            [userId]
          );
          shouldAward = parseInt(buzzCount.rows[0].count) >= badge.requirement_value;
          break;

        case 'following_count':
          const followingCount = await pool.query(
            `SELECT following_count FROM users WHERE id = $1`,
            [userId]
          );
          shouldAward = (followingCount.rows[0]?.following_count || 0) >= badge.requirement_value;
          break;

        case 'reviews_submitted':
          const reviewsCount = await pool.query(
            `SELECT COUNT(*) as count FROM event_reviews WHERE user_id = $1`,
            [userId]
          );
          shouldAward = parseInt(reviewsCount.rows[0].count) >= badge.requirement_value;
          break;

        case 'gallery_uploads':
          const galleryCount = await pool.query(
            `SELECT COUNT(*) as count FROM event_gallery WHERE user_id = $1`,
            [userId]
          );
          shouldAward = parseInt(galleryCount.rows[0].count) >= badge.requirement_value;
          break;

        case 'groups_created':
          const groupsCount = await pool.query(
            `SELECT COUNT(*) as count FROM event_groups WHERE creator_id = $1`,
            [userId]
          );
          shouldAward = parseInt(groupsCount.rows[0].count) >= badge.requirement_value;
          break;

        case 'vip_upgrade':
          const vipCount = await pool.query(
            `SELECT COUNT(*) as count 
             FROM points_transactions 
             WHERE user_id = $1 AND source_type = 'vip_upgrade'`,
            [userId]
          );
          shouldAward = parseInt(vipCount.rows[0].count) >= badge.requirement_value;
          break;
      }

      if (shouldAward) {
        // Award the badge
        await pool.query(
          `INSERT INTO user_badges (user_id, badge_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, badge_id) DO NOTHING`,
          [userId, badge.id]
        );
      }
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
    // Don't throw - badge checking shouldn't break other operations
  }
};

// Get badge progress for user
export const getBadgeProgress = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        b.*,
        CASE WHEN ub.id IS NOT NULL THEN TRUE ELSE FALSE END as is_earned,
        ub.earned_at,
        CASE 
          WHEN b.requirement_type = 'events_attended' THEN
            (SELECT COUNT(DISTINCT event_id) FROM tickets WHERE user_id = $1 AND payment_status = 'completed') +
            (SELECT COUNT(DISTINCT event_id) FROM rsvps WHERE user_id = $1 AND status = 'going')
          WHEN b.requirement_type = 'buzz_posts' THEN
            (SELECT COUNT(*) FROM buzz_posts WHERE user_id = $1)
          WHEN b.requirement_type = 'following_count' THEN
            (SELECT following_count FROM users WHERE id = $1)
          WHEN b.requirement_type = 'reviews_submitted' THEN
            (SELECT COUNT(*) FROM event_reviews WHERE user_id = $1)
          WHEN b.requirement_type = 'gallery_uploads' THEN
            (SELECT COUNT(*) FROM event_gallery WHERE user_id = $1)
          WHEN b.requirement_type = 'groups_created' THEN
            (SELECT COUNT(*) FROM event_groups WHERE creator_id = $1)
          ELSE 0
        END as current_progress
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
      WHERE b.requirement_type IS NOT NULL
      ORDER BY b.category, b.name`,
      [req.userId]
    );

    const badgesWithProgress = result.rows.map((badge) => ({
      ...badge,
      progress: badge.current_progress || 0,
      requirement: badge.requirement_value || 0,
      percentage: badge.requirement_value 
        ? Math.min((badge.current_progress / badge.requirement_value) * 100, 100)
        : 0,
    }));

    res.json({ badges: badgesWithProgress });
  } catch (error) {
    console.error('Error fetching badge progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

