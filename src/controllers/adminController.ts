import { Response } from 'express';
import { AdminRequest } from '../middleware/adminAuth';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

// Get all users (admin only)
export const getAllUsers = async (req: AdminRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search = '', role = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT id, name, email, phone, avatar, is_organizer, is_admin, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (role === 'admin') {
      query += ' AND is_admin = true';
    } else if (role === 'organizer') {
      query += ' AND is_organizer = true AND is_admin = false';
    } else if (role === 'user') {
      query += ' AND is_organizer = false AND is_admin = false';
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user (admin only)
export const createUser = async (req: AdminRequest, res: Response) => {
  try {
    const { name, email, password, phone, is_organizer, is_admin } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, is_organizer, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, avatar, is_organizer, is_admin, created_at`,
      [name, email, hashedPassword, phone || null, is_organizer || false, is_admin || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user (admin only)
export const updateUser = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, is_organizer, is_admin, password } = req.body;

    const updates: any = {};
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.name = name;
      values.push(name);
      paramCount++;
    }
    if (email) {
      updates.email = email;
      values.push(email);
      paramCount++;
    }
    if (phone !== undefined) {
      updates.phone = phone;
      values.push(phone);
      paramCount++;
    }
    if (is_organizer !== undefined) {
      updates.is_organizer = is_organizer;
      values.push(is_organizer);
      paramCount++;
    }
    if (is_admin !== undefined) {
      updates.is_admin = is_admin;
      values.push(is_admin);
      paramCount++;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.password = hashedPassword;
      values.push(hashedPassword);
      paramCount++;
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await pool.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1
       RETURNING id, name, email, phone, avatar, is_organizer, is_admin, created_at`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get analytics data
export const getAnalytics = async (req: AdminRequest, res: Response) => {
  try {
    const { timeRange = 'alltime' } = req.query;

    // Calculate date range
    let dateFilter = '';
    if (timeRange === 'today') {
      dateFilter = "AND created_at >= CURRENT_DATE";
    } else if (timeRange === '7days') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (timeRange === '30days') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get stats
    const [eventsResult, usersResult, ticketsResult, revenueResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM events WHERE 1=1 ${dateFilter}`),
      pool.query(`SELECT COUNT(*) as count FROM users WHERE 1=1 ${dateFilter}`),
      pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total FROM tickets WHERE 1=1 ${dateFilter}`),
      pool.query(`SELECT COALESCE(SUM(total), 0) as total FROM tickets WHERE payment_status = 'completed' ${dateFilter}`),
    ]);

    // Get trending events
    const trendingEvents = await pool.query(`
      SELECT id, name, views, rsvps, likes, saves, created_at
      FROM events
      ORDER BY (views + rsvps * 2 + likes + saves) DESC
      LIMIT 5
    `);

    // Get category distribution
    const categoryData = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM events
      GROUP BY category
      ORDER BY count DESC
    `);

    // Get time series data (last 7 days) - simplified version
    const timeSeriesData = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as events
      FROM events
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    res.json({
      stats: {
        totalEvents: parseInt(eventsResult.rows[0].count),
        totalUsers: parseInt(usersResult.rows[0].count),
        totalTickets: parseInt(ticketsResult.rows[0].total || 0),
        totalRevenue: parseFloat(revenueResult.rows[0].total || 0),
      },
      trendingEvents: trendingEvents.rows,
      categoryData: categoryData.rows,
      timeSeriesData: timeSeriesData.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get notifications
export const getNotifications = async (req: AdminRequest, res: Response) => {
  try {
    // Get pending events (events awaiting approval)
    const pendingEvents = await pool.query(`
      SELECT COUNT(*) as count FROM events WHERE is_featured = false AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // Get low sales events (events with low RSVP/ticket ratio)
    const lowSalesEvents = await pool.query(`
      SELECT name, id, views, rsvps
      FROM events
      WHERE views > 100 AND rsvps < views * 0.1
      ORDER BY (rsvps::float / NULLIF(views, 0)) ASC
      LIMIT 5
    `);

    // Get today's RSVPs
    const todayRSVPs = await pool.query(`
      SELECT COUNT(*) as count FROM rsvps WHERE DATE(created_at) = CURRENT_DATE
    `);

    const notifications = [];

    if (parseInt(pendingEvents.rows[0].count) > 0) {
      notifications.push({
        type: 'info',
        message: `${pendingEvents.rows[0].count} events awaiting approval`,
        icon: '🔔',
      });
    }

    if (lowSalesEvents.rows.length > 0) {
      notifications.push({
        type: 'warning',
        message: `Low sales on "${lowSalesEvents.rows[0].name}"`,
        icon: '⚠️',
      });
    }

    if (parseInt(todayRSVPs.rows[0].count) > 0) {
      notifications.push({
        type: 'success',
        message: `${todayRSVPs.rows[0].count} RSVPs today`,
        icon: '🔥',
      });
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recent activity
export const getRecentActivity = async (req: AdminRequest, res: Response) => {
  try {
    // Get recent tickets
    const recentTickets = await pool.query(`
      SELECT 
        t.id,
        t.created_at,
        u.name as user_name,
        e.name as event_name,
        'ticket' as type,
        '💳' as icon
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN events e ON t.event_id = e.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    // Get recent RSVPs
    const recentRSVPs = await pool.query(`
      SELECT 
        r.id,
        r.created_at,
        u.name as user_name,
        e.name as event_name,
        'rsvp' as type,
        '✋' as icon
      FROM rsvps r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    // Combine and sort
    const activities = [
      ...recentTickets.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        icon: row.icon,
        message: `${row.user_name} bought ticket for ${row.event_name}`,
        time: row.created_at,
      })),
      ...recentRSVPs.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        icon: row.icon,
        message: `${row.user_name} RSVPed to ${row.event_name}`,
        time: row.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)
      .map((activity) => ({
        ...activity,
        time: formatRelativeTime(new Date(activity.time)),
      }));

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function for relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get financial data
export const getFinancialData = async (req: AdminRequest, res: Response) => {
  try {
    const { timeRange = 'alltime' } = req.query;

    let dateFilter = '';
    if (timeRange === 'today') {
      dateFilter = "AND created_at >= CURRENT_DATE";
    } else if (timeRange === '7days') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (timeRange === '30days') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Get revenue stats
    const revenueStats = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_transactions,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'completed'), 0) as completed_revenue,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'pending'), 0) as pending_revenue
      FROM tickets
      WHERE 1=1 ${dateFilter}
    `);

    // Get revenue by event
    const revenueByEvent = await pool.query(`
      SELECT 
        e.id,
        e.name,
        COALESCE(SUM(t.total), 0) as revenue,
        COUNT(t.id) as ticket_count
      FROM events e
      LEFT JOIN tickets t ON e.id = t.event_id AND t.payment_status = 'completed' ${dateFilter}
      GROUP BY e.id, e.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    // Get revenue over time
    const revenueOverTime = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as revenue
      FROM tickets
      WHERE payment_status = 'completed' ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    res.json({
      stats: revenueStats.rows[0],
      revenueByEvent: revenueByEvent.rows,
      revenueOverTime: revenueOverTime.rows,
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all badges (admin only)
export const getAllBadges = async (req: AdminRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM badges ORDER BY category, name`
    );
    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user badges (admin only)
export const getUserBadges = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;

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
      [userId]
    );

    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Award badge to user (admin only)
export const awardBadgeToUser = async (req: AdminRequest, res: Response) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ error: 'User ID and Badge ID are required' });
    }

    // Verify user exists
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify badge exists
    const badgeCheck = await pool.query('SELECT id, display_name FROM badges WHERE id = $1', [badgeId]);
    if (badgeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    // Check if user already has this badge
    const existing = await pool.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already has this badge' });
    }

    // Award the badge
    const result = await pool.query(
      `INSERT INTO user_badges (user_id, badge_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, badgeId]
    );

    console.log(`✅ Admin ${req.userId} awarded badge ${badgeCheck.rows[0].display_name} to user ${userCheck.rows[0].name}`);

    res.json({
      message: 'Badge awarded successfully',
      userBadge: result.rows[0],
      badge: badgeCheck.rows[0],
      user: userCheck.rows[0],
    });
  } catch (error: any) {
    console.error('Error awarding badge:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'User already has this badge' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove badge from user (admin only)
export const removeBadgeFromUser = async (req: AdminRequest, res: Response) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ error: 'User ID and Badge ID are required' });
    }

    // Verify user exists
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify badge exists
    const badgeCheck = await pool.query('SELECT id, display_name FROM badges WHERE id = $1', [badgeId]);
    if (badgeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    // Remove the badge
    const result = await pool.query(
      'DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2 RETURNING *',
      [userId, badgeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User does not have this badge' });
    }

    console.log(`✅ Admin ${req.userId} removed badge ${badgeCheck.rows[0].display_name} from user ${userCheck.rows[0].name}`);

    res.json({
      message: 'Badge removed successfully',
      badge: badgeCheck.rows[0],
      user: userCheck.rows[0],
    });
  } catch (error) {
    console.error('Error removing badge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

