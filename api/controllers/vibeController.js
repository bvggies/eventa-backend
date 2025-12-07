"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventRatings = exports.rateEvent = void 0;
const database_1 = require("../config/database");
const rateEvent = async (req, res) => {
    try {
        const { eventId, rating, comment } = req.body;
        if (!eventId || !rating) {
            return res.status(400).json({ error: 'Event ID and rating are required' });
        }
        await database_1.pool.query(`INSERT INTO vibe_ratings (user_id, event_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_id) 
       DO UPDATE SET rating = $3, comment = $4`, [req.userId, eventId, rating, comment || null]);
        // Calculate average vibe rating
        const avgResult = await database_1.pool.query(`SELECT AVG(CASE 
        WHEN rating = 'lit' THEN 4
        WHEN rating = 'cool' THEN 3
        WHEN rating = 'average' THEN 2
        WHEN rating = 'dead' THEN 1
        ELSE 0
       END) as avg_rating
       FROM vibe_ratings WHERE event_id = $1`, [eventId]);
        const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 0;
        await database_1.pool.query('UPDATE events SET vibe_rating = $1 WHERE id = $2', [
            avgRating,
            eventId,
        ]);
        res.json({ message: 'Rating submitted successfully' });
    }
    catch (error) {
        console.error('Error rating event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rateEvent = rateEvent;
const getEventRatings = async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await database_1.pool.query(`SELECT vr.*, u.name as user_name, u.avatar as user_avatar
       FROM vibe_ratings vr
       INNER JOIN users u ON vr.user_id = u.id
       WHERE vr.event_id = $1
       ORDER BY vr.created_at DESC`, [eventId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEventRatings = getEventRatings;
