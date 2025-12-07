import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { transformTicket, transformTickets } from '../utils/ticketTransform';

export const buyTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventName, ticketType, quantity, promoCode, paymentMethod, price: providedPrice, ticketNumber } = req.body;

    if ((!eventId && !eventName) || !ticketType || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: eventId or eventName, ticketType, and quantity are required' });
    }

    let event: any = null;
    let actualEventId: string | null = null;

    if (eventId) {
      // Get event details if eventId is provided
      const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }
      event = eventResult.rows[0];
      actualEventId = eventId;
    } else {
      // For manual event name, eventId will be null
      actualEventId = null;
    }

    // Use provided price if available (for manual ticket entry), otherwise use event price
    let price = providedPrice ? parseFloat(providedPrice) : (event ? parseFloat(event.ticket_price) : 0);
    let discount = 0;

    // Apply promo code if provided and event exists
    if (promoCode && event && event.promo_code === promoCode && event.promo_discount) {
      discount = (price * event.promo_discount) / 100;
      price = price - discount;
    }

    const total = price * quantity;
    const qrCode = uuidv4();
    const defaultPaymentMethod = paymentMethod || 'cash'; // Default to cash if not provided

    const result = await pool.query(
      `INSERT INTO tickets (
        event_id, user_id, ticket_type, quantity, price, total,
        promo_code, discount, payment_method, payment_status, qr_code, ticket_number, event_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        actualEventId, // Can be null for manual event names
        req.userId,
        ticketType,
        quantity,
        price,
        total,
        promoCode || null,
        discount,
        defaultPaymentMethod,
        'completed', // User-added tickets are immediately completed (no approval needed)
        qrCode,
        ticketNumber || null, // Private ticket number/code
        eventName || (event ? event.name : null), // Store event name for display
      ]
    );

    // Automatically RSVP user to the event when they add a ticket (only if eventId exists)
    if (actualEventId) {
      try {
        await pool.query(
          `INSERT INTO rsvps (user_id, event_id, status, created_by_save)
           VALUES ($1, $2, 'going', false)
           ON CONFLICT (user_id, event_id) 
           DO UPDATE SET status = 'going'`,
          [req.userId, actualEventId]
        );
      } catch (rsvpError) {
        console.error('Error creating RSVP for ticket:', rsvpError);
        // Don't fail the ticket creation if RSVP fails
      }
    }

    res.status(201).json(transformTicket(result.rows[0]));
  } catch (error) {
    console.error('Error buying ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    // Join with events table to get event name if event_id exists, otherwise use event_name from ticket
    // All tickets are displayed immediately - no approval needed for user-added tickets
    const result = await pool.query(
      `SELECT 
        t.*,
        COALESCE(e.name, t.event_name) as event_name
      FROM tickets t
      LEFT JOIN events e ON t.event_id = e.id
      WHERE t.user_id = $1 
      ORDER BY t.created_at DESC`,
      [req.userId]
    );
    // Transform to camelCase and ensure ticket_number is included (private to user)
    res.json(transformTickets(result.rows));
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(transformTicket(result.rows[0]));
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

