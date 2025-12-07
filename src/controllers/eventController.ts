import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { transformEvent, transformEvents } from '../utils/eventTransform';

export const getAllEvents = async (req: any, res: Response) => {
  try {
    const { category, city, date, search } = req.query;
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (city) {
      query += ` AND location ILIKE $${paramCount}`;
      params.push(`%${city}%`);
      paramCount++;
    }

    if (date) {
      query += ` AND date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    // Transform to camelCase for consistent API response
    res.json(transformEvents(result.rows));
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Increment views
    await pool.query('UPDATE events SET views = views + 1 WHERE id = $1', [id]);

    res.json(transformEvent(result.rows[0]));
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFeaturedEvents = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 10'
    );
    res.json(transformEvents(result.rows));
  } catch (error) {
    console.error('Error fetching featured events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrendingEvents = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE is_trending = TRUE ORDER BY views DESC, likes DESC LIMIT 10'
    );
    res.json(transformEvents(result.rows));
  } catch (error) {
    console.error('Error fetching trending events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNearbyEvents = async (req: any, res: Response) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      return res.status(400).json({ error: 'Invalid coordinates or radius' });
    }

    // Simple distance calculation using subquery to avoid HAVING without GROUP BY
    const result = await pool.query(
      `SELECT *, 
       (6371 * acos(
         LEAST(1.0, 
           cos(radians($1)) * cos(radians(latitude)) * 
           cos(radians(longitude) - radians($2)) + 
           sin(radians($1)) * sin(radians(latitude))
         )
       )) AS distance
       FROM events 
       WHERE latitude IS NOT NULL 
         AND longitude IS NOT NULL
         AND (6371 * acos(
           LEAST(1.0,
             cos(radians($1)) * cos(radians(latitude)) * 
             cos(radians(longitude) - radians($2)) + 
             sin(radians($1)) * sin(radians(latitude))
           )
         )) < $3
       ORDER BY distance
       LIMIT 20`,
      [latNum, lngNum, radiusNum]
    );
    res.json(transformEvents(result.rows));
  } catch (error) {
    console.error('Error fetching nearby events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      location,
      address,
      latitude,
      longitude,
      date,
      time,
      endDate,
      endTime,
      category,
      banner,
      ticketPrice,
      currency,
      isFree,
      promoCode,
      promoDiscount,
      organizerName,
      ticketOptions,
      gallery,
      ticketLink,
    } = req.body;

    // Get organizer info
    const userResult = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [
      req.userId,
    ]);
    const organizer = userResult.rows[0];

    const result = await pool.query(
      `INSERT INTO events (
        name, description, location, address, latitude, longitude,
        date, time, end_date, end_time, category, banner,
        ticket_price, currency, is_free, organizer_id, organizer_name,
        organizer_avatar, promo_code, promo_discount, ticket_options, gallery, ticket_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        name,
        description,
        location,
        address,
        latitude,
        longitude,
        date,
        time,
        endDate,
        endTime,
        category,
        banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        ticketPrice || 0,
        currency || 'GHS',
        isFree || false,
        req.userId,
        organizerName || organizer.name,
        organizer.avatar,
        promoCode,
        promoDiscount,
        ticketOptions ? JSON.stringify(ticketOptions) : '[]',
        gallery || [],
        ticketLink || null,
      ]
    );

    res.status(201).json(transformEvent(result.rows[0]));
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify event exists
    const eventResult = await pool.query(
      'SELECT organizer_id FROM events WHERE id = $1',
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Verify ownership (unless admin)
    if (!isAdmin && eventResult.rows[0].organizer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Map camelCase to snake_case for database
    const fieldMapping: Record<string, string> = {
      endDate: 'end_date',
      endTime: 'end_time',
      ticketPrice: 'ticket_price',
      isFree: 'is_free',
      isFeatured: 'is_featured',
      isTrending: 'is_trending',
      promoCode: 'promo_code',
      promoDiscount: 'promo_discount',
      organizerName: 'organizer_name',
      ticketOptions: 'ticket_options',
      ticketLink: 'ticket_link',
    };

    // Build update query dynamically with proper field mapping
    const fields = Object.keys(updates).filter(f => updates[f] !== undefined);
    const values: any[] = [];
    const setClause = fields
      .map((field, index) => {
        const dbField = fieldMapping[field] || field;
        let value = updates[field];
        
        // Handle JSON fields
        if (field === 'ticketOptions' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        
        values.push(value);
        return `${dbField} = $${index + 2}`;
      })
      .join(', ');

    const result = await pool.query(
      `UPDATE events SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json(transformEvent(result.rows[0]));
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const eventResult = await pool.query(
      'SELECT organizer_id FROM events WHERE id = $1',
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Verify ownership (unless admin)
    if (!isAdmin && eventResult.rows[0].organizer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

