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
        await database_1.pool.query(`INSERT INTO rsvps (user_id, event_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id) 
       DO UPDATE SET status = $3`, [req.userId, eventId, status]);
        // Update event RSVP count
        await database_1.pool.query('UPDATE events SET rsvps = rsvps + 1 WHERE id = $1', [eventId]);
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
        await database_1.pool.query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2', [
            req.userId,
            eventId,
        ]);
        // Update event RSVP count
        await database_1.pool.query('UPDATE events SET rsvps = rsvps - 1 WHERE id = $1', [eventId]);
        res.json({ message: 'RSVP cancelled successfully' });
    }
    catch (error) {
        console.error('Error cancelling RSVP:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelRsvp = cancelRsvp;
