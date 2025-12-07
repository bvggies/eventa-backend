"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const database_1 = require("../config/database");
const requireAdmin = async (req, res, next) => {
    try {
        // First check if user is authenticated (userId should be set by auth middleware)
        if (!req.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Check if user is admin
        const result = await database_1.pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        if (!user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.isAdmin = true;
        next();
    }
    catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requireAdmin = requireAdmin;
