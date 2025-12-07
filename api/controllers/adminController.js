"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinancialData = exports.getRecentActivity = exports.getNotifications = exports.getAnalytics = exports.deleteUser = exports.updateUser = exports.createUser = exports.getAllUsers = void 0;
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', role = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = 'SELECT id, name, email, phone, avatar, is_organizer, is_admin, created_at FROM users WHERE 1=1';
        const params = [];
        let paramCount = 1;
        if (search) {
            query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }
        if (role === 'admin') {
            query += ' AND is_admin = true';
        }
        else if (role === 'organizer') {
            query += ' AND is_organizer = true AND is_admin = false';
        }
        else if (role === 'user') {
            query += ' AND is_organizer = false AND is_admin = false';
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(Number(limit), offset);
        const result = await database_1.pool.query(query, params);
        const countResult = await database_1.pool.query('SELECT COUNT(*) FROM users');
        res.json({
            users: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: Number(page),
            limit: Number(limit),
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
// Create user (admin only)
const createUser = async (req, res) => {
    try {
        const { name, email, password, phone, is_organizer, is_admin } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        // Check if user exists
        const existing = await database_1.pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const result = await database_1.pool.query(`INSERT INTO users (name, email, password, phone, is_organizer, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, avatar, is_organizer, is_admin, created_at`, [name, email, hashedPassword, phone || null, is_organizer || false, is_admin || false]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createUser = createUser;
// Update user (admin only)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, is_organizer, is_admin, password } = req.body;
        const updates = {};
        const values = [];
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
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
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
        const result = await database_1.pool.query(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1
       RETURNING id, name, email, phone, avatar, is_organizer, is_admin, created_at`, [id, ...values]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateUser = updateUser;
// Delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent deleting yourself
        if (id === req.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        const result = await database_1.pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
// Get analytics data
const getAnalytics = async (req, res) => {
    try {
        const { timeRange = 'alltime' } = req.query;
        // Calculate date range
        let dateFilter = '';
        if (timeRange === 'today') {
            dateFilter = "AND created_at >= CURRENT_DATE";
        }
        else if (timeRange === '7days') {
            dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        }
        else if (timeRange === '30days') {
            dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
        }
        // Get stats
        const [eventsResult, usersResult, ticketsResult, revenueResult] = await Promise.all([
            database_1.pool.query(`SELECT COUNT(*) as count FROM events WHERE 1=1 ${dateFilter}`),
            database_1.pool.query(`SELECT COUNT(*) as count FROM users WHERE 1=1 ${dateFilter}`),
            database_1.pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total FROM tickets WHERE 1=1 ${dateFilter}`),
            database_1.pool.query(`SELECT COALESCE(SUM(total), 0) as total FROM tickets WHERE payment_status = 'completed' ${dateFilter}`),
        ]);
        // Get trending events
        const trendingEvents = await database_1.pool.query(`
      SELECT id, name, views, rsvps, likes, saves, created_at
      FROM events
      ORDER BY (views + rsvps * 2 + likes + saves) DESC
      LIMIT 5
    `);
        // Get category distribution
        const categoryData = await database_1.pool.query(`
      SELECT category, COUNT(*) as count
      FROM events
      GROUP BY category
      ORDER BY count DESC
    `);
        // Get time series data (last 7 days) - simplified version
        const timeSeriesData = await database_1.pool.query(`
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
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAnalytics = getAnalytics;
// Get notifications
const getNotifications = async (req, res) => {
    try {
        // Get pending events (events awaiting approval)
        const pendingEvents = await database_1.pool.query(`
      SELECT COUNT(*) as count FROM events WHERE is_featured = false AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
        // Get low sales events (events with low RSVP/ticket ratio)
        const lowSalesEvents = await database_1.pool.query(`
      SELECT name, id, views, rsvps
      FROM events
      WHERE views > 100 AND rsvps < views * 0.1
      ORDER BY (rsvps::float / NULLIF(views, 0)) ASC
      LIMIT 5
    `);
        // Get today's RSVPs
        const todayRSVPs = await database_1.pool.query(`
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
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getNotifications = getNotifications;
// Get recent activity
const getRecentActivity = async (req, res) => {
    try {
        // Get recent tickets
        const recentTickets = await database_1.pool.query(`
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
        const recentRSVPs = await database_1.pool.query(`
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
            ...recentTickets.rows.map((row) => ({
                id: row.id,
                type: row.type,
                icon: row.icon,
                message: `${row.user_name} bought ticket for ${row.event_name}`,
                time: row.created_at,
            })),
            ...recentRSVPs.rows.map((row) => ({
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
    }
    catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRecentActivity = getRecentActivity;
// Helper function for relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
// Get financial data
const getFinancialData = async (req, res) => {
    try {
        const { timeRange = 'alltime' } = req.query;
        let dateFilter = '';
        if (timeRange === 'today') {
            dateFilter = "AND created_at >= CURRENT_DATE";
        }
        else if (timeRange === '7days') {
            dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        }
        else if (timeRange === '30days') {
            dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
        }
        // Get revenue stats
        const revenueStats = await database_1.pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_transactions,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'completed'), 0) as completed_revenue,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'pending'), 0) as pending_revenue
      FROM tickets
      WHERE 1=1 ${dateFilter}
    `);
        // Get revenue by event
        const revenueByEvent = await database_1.pool.query(`
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
        const revenueOverTime = await database_1.pool.query(`
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
    }
    catch (error) {
        console.error('Error fetching financial data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getFinancialData = getFinancialData;
