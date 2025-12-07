"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRsvp = exports.getMyRsvps = exports.rsvp = void 0;
const database_1 = require("../config/database");
const rsvp = async (req, res) => {
    try {
        const { eventId, status } = req.body;
        if (!eventId || !status) {
            return res.status(400).json({ error: 'Event ID and status are required' });
        }
        // Check if user already has an RSVP for this event
        const existingRSVP = await database_1.pool.query('SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.userId, eventId]);
        const oldStatus = existingRSVP.rows[0]?.status;
        const isNewRSVP = existingRSVP.rows.length === 0;
        // Update or insert RSVP
        await database_1.pool.query(`INSERT INTO rsvps (user_id, event_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id) 
       DO UPDATE SET status = $3`, [req.userId, eventId, status]);
        // Count "interested" and "going" as "people going"
        const shouldCountAsGoing = status === 'interested' || status === 'going';
        const oldStatusCountedAsGoing = oldStatus === 'interested' || oldStatus === 'going';
        // Update event RSVP count
        if (isNewRSVP && shouldCountAsGoing) {
            // New RSVP that counts as going
            await database_1.pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
        }
        else if (!isNewRSVP) {
            // Existing RSVP - update count based on status change
            if (oldStatusCountedAsGoing && !shouldCountAsGoing) {
                // Was counting, now not counting (e.g., changed to "not-going")
                await database_1.pool.query('UPDATE events SET rsvps = GREATEST(rsvps - 1, 0) WHERE id = $1', [eventId]);
            }
            else if (!oldStatusCountedAsGoing && shouldCountAsGoing) {
                // Was not counting, now counting (e.g., changed from "not-going" to "interested")
                await database_1.pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
            }
            // If both old and new status count as going (e.g., "interested" to "going"), no change needed
        }
        res.json({ message: 'RSVP updated successfully' });
    }
    catch (error) {
        console.error('Error updating RSVP:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rsvp = rsvp;
const getMyRsvps = async (req, res) => {
    try {
        const result = await database_1.pool.query(`SELECT r.*, e.* FROM rsvps r
       INNER JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`, [req.userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching RSVPs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyRsvps = getMyRsvps;
const cancelRsvp = async (req, res) => {
    try {
        const { eventId } = req.params;
        // Check the status before deleting
        const existingRSVP = await database_1.pool.query('SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.userId, eventId]);
        const oldStatus = existingRSVP.rows[0]?.status;
        const oldStatusCountedAsGoing = oldStatus === 'interested' || oldStatus === 'going';
        await database_1.pool.query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2', [
            req.userId,
            eventId,
        ]);
        // Only decrement if the old status counted as going
        if (oldStatusCountedAsGoing) {
            await database_1.pool.query('UPDATE events SET rsvps = GREATEST(rsvps - 1, 0) WHERE id = $1', [eventId]);
        }
        res.json({ message: 'RSVP cancelled successfully' });
    }
    catch (error) {
        console.error('Error cancelling RSVP:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelRsvp = cancelRsvp;
