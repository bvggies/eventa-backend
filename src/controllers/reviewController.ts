import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Submit event review
export const submitEventReview = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      eventId, 
      overallRating, 
      crowdRating, 
      musicRating, 
      securityRating, 
      drinksRating, 
      comment 
    } = req.body;

    // Verify user attended the event
    const attendeeCheck = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $2 AND status = 'going') as has_rsvp,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND payment_status = 'completed') as has_ticket
      `,
      [req.userId, eventId]
    );

    const { has_rsvp, has_ticket } = attendeeCheck.rows[0];
    if (!has_rsvp && !has_ticket) {
      return res.status(400).json({ error: 'You must have attended the event to review it' });
    }

    // Check if event date has passed
    const eventCheck = await pool.query(
      `SELECT date, end_date FROM events WHERE id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventCheck.rows[0];
    const eventEndDate = event.end_date || event.date;
    const today = new Date();
    const endDate = new Date(eventEndDate);

    if (endDate > today) {
      return res.status(400).json({ error: 'Cannot review event before it ends' });
    }

    // Insert or update review
    const result = await pool.query(
      `INSERT INTO event_reviews (
        event_id, user_id, overall_rating, crowd_rating, music_rating, 
        security_rating, drinks_rating, comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET
        overall_rating = EXCLUDED.overall_rating,
        crowd_rating = EXCLUDED.crowd_rating,
        music_rating = EXCLUDED.music_rating,
        security_rating = EXCLUDED.security_rating,
        drinks_rating = EXCLUDED.drinks_rating,
        comment = EXCLUDED.comment,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [eventId, req.userId, overallRating, crowdRating, musicRating, securityRating, drinksRating, comment]
    );

    // Update event average rating
    await updateEventRating(eventId);

    // Award points for review submission
    try {
      await pool.query(
        `INSERT INTO points_transactions (user_id, transaction_type, points_amount, coins_amount, source_type, source_id, description)
         VALUES ($1, 'earn', 20, 20, 'review_submission', $2, 'Submitted event review')`,
        [req.userId, result.rows[0].id]
      );

      // Update wallet
      await pool.query(
        `INSERT INTO user_wallets (user_id, points_balance, coins_balance, total_earned)
         VALUES ($1, 20, 20, 20)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           points_balance = user_wallets.points_balance + 20,
           coins_balance = user_wallets.coins_balance + 20,
           total_earned = user_wallets.total_earned + 20,
           updated_at = CURRENT_TIMESTAMP`,
        [req.userId]
      );
    } catch (pointsError) {
      console.error('Error awarding points for review:', pointsError);
      // Don't fail the review if points fail
    }

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get event reviews
export const getEventReviews = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        er.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM event_reviews er
      INNER JOIN users u ON u.id = er.user_id
      WHERE er.event_id = $1
      ORDER BY er.created_at DESC
      LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );

    // Get average ratings
    const avgResult = await pool.query(
      `SELECT 
        AVG(overall_rating) as avg_overall,
        AVG(crowd_rating) as avg_crowd,
        AVG(music_rating) as avg_music,
        AVG(security_rating) as avg_security,
        AVG(drinks_rating) as avg_drinks,
        COUNT(*) as total_reviews
      FROM event_reviews
      WHERE event_id = $1`,
      [eventId]
    );

    res.json({
      reviews: result.rows,
      averageRatings: avgResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching event reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's review for an event
export const getUserReview = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT * FROM event_reviews
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to update event average rating
const updateEventRating = async (eventId: string) => {
  try {
    const avgResult = await pool.query(
      `SELECT AVG(overall_rating) as avg_rating
       FROM event_reviews
       WHERE event_id = $1`,
      [eventId]
    );

    const avgRating = parseFloat(avgResult.rows[0]?.avg_rating || 0);

    await pool.query(
      `UPDATE events SET vibe_rating = $1 WHERE id = $2`,
      [avgRating, eventId]
    );
  } catch (error) {
    console.error('Error updating event rating:', error);
  }
};

