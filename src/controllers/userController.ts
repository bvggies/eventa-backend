import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone, avatar, is_organizer, is_admin, created_at FROM users WHERE id = $1', [
      req.userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, avatar } = req.body;
    const updates: any = {};
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.name = name;
      values.push(name);
      paramCount++;
    }
    if (phone) {
      updates.phone = phone;
      values.push(phone);
      paramCount++;
    }
    if (avatar) {
      updates.avatar = avatar;
      values.push(avatar);
      paramCount++;
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await pool.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, email, phone, avatar, is_organizer, is_admin, created_at`,
      [req.userId, ...values]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSavedEvents = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT e.* FROM events e
       INNER JOIN saved_events se ON e.id = se.event_id
       WHERE se.user_id = $1
       ORDER BY se.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if already saved
    const existingSave = await pool.query(
      'SELECT id FROM saved_events WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );

    const isNewSave = existingSave.rows.length === 0;

    // Check if user already has an RSVP
    const existingRSVP = await pool.query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );

    const hasRSVP = existingRSVP.rows.length > 0;
    const rsvpStatus = existingRSVP.rows[0]?.status;
    const alreadyCountsAsGoing = rsvpStatus === 'interested' || rsvpStatus === 'going';

    await pool.query(
      'INSERT INTO saved_events (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, eventId]
    );

    // Update event saves count
    if (isNewSave) {
      await pool.query('UPDATE events SET saves = saves + 1 WHERE id = $1', [eventId]);
      
      // Also count as "going" (love emoji = people going)
      // Only increment if user doesn't already have an RSVP that counts as going
      if (!hasRSVP || !alreadyCountsAsGoing) {
        await pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
        
        // Create an RSVP as "interested" if one doesn't exist
        await pool.query(
          `INSERT INTO rsvps (user_id, event_id, status)
           VALUES ($1, $2, 'interested')
           ON CONFLICT (user_id, event_id) DO NOTHING`,
          [req.userId, eventId]
        );
      }
    }

    res.json({ message: 'Event saved successfully' });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unsaveEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if it was saved before deleting
    const existingSave = await pool.query(
      'SELECT id FROM saved_events WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );

    const wasSaved = existingSave.rows.length > 0;

    await pool.query('DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2', [
      req.userId,
      eventId,
    ]);

    // Update event saves count
    if (wasSaved) {
      await pool.query('UPDATE events SET saves = GREATEST(saves - 1, 0) WHERE id = $1', [eventId]);
      
      // Also decrement "going" count (unsaving = not going anymore)
      // Check if user has an RSVP that counts as going
      const rsvp = await pool.query(
        'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
        [req.userId, eventId]
      );
      
      const rsvpStatus = rsvp.rows[0]?.status;
      const countsAsGoing = rsvpStatus === 'interested' || rsvpStatus === 'going';
      
      // Only decrement if the RSVP was created by the save action (status is "interested")
      // If user manually changed to "going", don't decrement
      if (rsvpStatus === 'interested') {
        await pool.query('UPDATE events SET rsvps = GREATEST(rsvps - 1, 0) WHERE id = $1', [eventId]);
        // Remove the auto-created RSVP
        await pool.query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2 AND status = $3', [
          req.userId,
          eventId,
          'interested',
        ]);
      }
    }

    res.json({ message: 'Event unsaved successfully' });
  } catch (error) {
    console.error('Error unsaving event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

