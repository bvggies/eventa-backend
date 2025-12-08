import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

export const rsvp = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, status } = req.body;

    if (!eventId || !status) {
      return res.status(400).json({ error: 'Event ID and status are required' });
    }

    // Check if user already has an RSVP for this event
    const existingRSVP = await pool.query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );

    const oldStatus = existingRSVP.rows[0]?.status;
    const isNewRSVP = existingRSVP.rows.length === 0;

    // Prevent duplicate "interested" selection - if already "interested", don't allow changing to "interested" again
    if (status === 'interested' && oldStatus === 'interested') {
      return res.status(400).json({ error: 'You have already marked yourself as interested in this event' });
    }

    // Update or insert RSVP
    await pool.query(
      `INSERT INTO rsvps (user_id, event_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id) 
       DO UPDATE SET status = $3`,
      [req.userId, eventId, status]
    );

    // Count "interested" and "going" as "people going"
    const shouldCountAsGoing = status === 'interested' || status === 'going';
    const oldStatusCountedAsGoing = oldStatus === 'interested' || oldStatus === 'going';

    // Update event RSVP count
    if (isNewRSVP && shouldCountAsGoing) {
      // New RSVP that counts as going
      await pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
    } else if (!isNewRSVP) {
      // Existing RSVP - update count based on status change
      if (oldStatusCountedAsGoing && !shouldCountAsGoing) {
        // Was counting, now not counting (e.g., changed to "not-going")
        await pool.query('UPDATE events SET rsvps = GREATEST(rsvps - 1, 0) WHERE id = $1', [eventId]);
      } else if (!oldStatusCountedAsGoing && shouldCountAsGoing) {
        // Was not counting, now counting (e.g., changed from "not-going" to "interested")
        await pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
      }
      // If both old and new status count as going (e.g., "interested" to "going"), no change needed
    }

    // Award points for attending event (only if status is 'going' and it's a new RSVP)
    if (status === 'going' && isNewRSVP) {
      try {
        const { awardPoints } = await import('./walletController');
        await awardPoints(
          req.userId,
          30, // 30 points for attending an event
          30, // 30 coins for attending an event
          'event_attendance',
          eventId,
          'Attending event'
        );

        // Check and award badges
        const { checkAndAwardBadges } = await import('./badgeController');
        await checkAndAwardBadges(req.userId);
      } catch (pointsError) {
        console.error('Error awarding points for event attendance:', pointsError);
        // Don't fail the RSVP if points fail
      }
    }

    res.json({ message: 'RSVP updated successfully' });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyRsvps = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.*, e.* FROM rsvps r
       INNER JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelRsvp = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check the status before deleting
    const existingRSVP = await pool.query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );

    const oldStatus = existingRSVP.rows[0]?.status;
    const oldStatusCountedAsGoing = oldStatus === 'interested' || oldStatus === 'going';

    await pool.query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2', [
      req.userId,
      eventId,
    ]);

    // Only decrement if the old status counted as going
    if (oldStatusCountedAsGoing) {
      await pool.query('UPDATE events SET rsvps = GREATEST(rsvps - 1, 0) WHERE id = $1', [eventId]);
    }

    res.json({ message: 'RSVP cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

