"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTicketById = exports.getMyTickets = exports.buyTicket = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const buyTicket = async (req, res) => {
    try {
        const { eventId, ticketType, quantity, promoCode, paymentMethod } = req.body;
        if (!eventId || !ticketType || !quantity || !paymentMethod) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Get event details
        const eventResult = await database_1.pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const event = eventResult.rows[0];
        let price = event.ticket_price;
        let discount = 0;
        // Apply promo code if provided
        if (promoCode && event.promo_code === promoCode && event.promo_discount) {
            discount = (price * event.promo_discount) / 100;
            price = price - discount;
        }
        const total = price * quantity;
        const qrCode = (0, uuid_1.v4)();
        const result = await database_1.pool.query(`INSERT INTO tickets (
        event_id, user_id, ticket_type, quantity, price, total,
        promo_code, discount, payment_method, payment_status, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            eventId,
            req.userId,
            ticketType,
            quantity,
            price,
            total,
            promoCode || null,
            discount,
            paymentMethod,
            'completed', // In production, this would be 'pending' until payment is verified
            qrCode,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error buying ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.buyTicket = buyTicket;
const getMyTickets = async (req, res) => {
    try {
        const result = await database_1.pool.query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyTickets = getMyTickets;
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.pool.query('SELECT * FROM tickets WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTicketById = getTicketById;
