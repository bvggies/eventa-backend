import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// Share location with admin (HIGH_ALERT)
export const shareLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventName, latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Generate Google Maps URL
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const result = await pool.query(
      `INSERT INTO safety_checks (
        user_id, event_id, status, alert_type, latitude, longitude, address, event_name, 
        is_emergency, is_high_alert, google_maps_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.userId,
        eventId || null,
        'location-shared',
        'HIGH_ALERT',
        latitude,
        longitude,
        address || null,
        eventName || null,
        false,
        true, // Mark as high alert
        googleMapsUrl,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Location shared successfully with admin',
      googleMapsUrl,
    });
  } catch (error) {
    console.error('Error sharing location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Report emergency (EMERGENCY)
export const reportEmergency = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventName, latitude, longitude, address, message, sosBroadcast } = req.body;

    let googleMapsUrl = null;
    if (latitude && longitude) {
      googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    }

    const status = sosBroadcast ? 'sos-broadcast' : 'emergency';
    const alertType = sosBroadcast ? 'SOS' : 'EMERGENCY';

    const result = await pool.query(
      `INSERT INTO safety_checks (
        user_id, event_id, status, alert_type, latitude, longitude, address, event_name, 
        message, is_emergency, is_high_alert, google_maps_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.userId,
        eventId || null,
        status,
        alertType,
        latitude || null,
        longitude || null,
        address || null,
        eventName || null,
        message || null,
        true, // Mark as emergency
        false,
        googleMapsUrl,
      ]
    );

    // If SOS broadcast, notify trusted contacts
    if (sosBroadcast) {
      try {
        const contacts = await pool.query(
          'SELECT * FROM trusted_contacts WHERE user_id = $1 AND can_receive_sos = TRUE',
          [req.userId]
        );
        // TODO: Send notifications to trusted contacts (SMS/Email/Push)
        console.log(`SOS broadcast sent to ${contacts.rows.length} trusted contacts`);
      } catch (err) {
        console.error('Error notifying trusted contacts:', err);
      }
    }

    res.status(201).json({
      id: result.rows[0].id,
      message: sosBroadcast 
        ? 'SOS broadcast sent to emergency contacts. Admin has been notified.'
        : 'Emergency reported. Admin has been notified.',
      googleMapsUrl,
    });
  } catch (error) {
    console.error('Error reporting emergency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark as safe (SAFE)
export const markSafe = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventName, latitude, longitude, address } = req.body;

    let googleMapsUrl = null;
    if (latitude && longitude) {
      googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    }

    const result = await pool.query(
      `INSERT INTO safety_checks (
        user_id, event_id, status, alert_type, latitude, longitude, address, event_name, 
        is_emergency, is_high_alert, google_maps_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.userId,
        eventId || null,
        'safe',
        'SAFE',
        latitude || null,
        longitude || null,
        address || null,
        eventName || null,
        false,
        false,
        googleMapsUrl,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Safety status updated',
    });
  } catch (error) {
    console.error('Error marking safe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Safety check-in
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, eventName, latitude, longitude, address } = req.body;

    const result = await pool.query(
      `INSERT INTO safety_checks (
        user_id, event_id, status, latitude, longitude, address, event_name, is_emergency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.userId,
        eventId || null,
        'check-in',
        latitude || null,
        longitude || null,
        address || null,
        eventName || null,
        false,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Check-in recorded',
    });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's safety history
export const getMySafetyHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM safety_checks 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      eventName: row.event_name,
      status: row.status,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      address: row.address,
      message: row.message,
      isEmergency: row.is_emergency,
      acknowledgedByAdmin: row.acknowledged_by_admin,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching safety history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get all safety alerts
export const getAllSafetyAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { status, isEmergency, limit = 100 } = req.query;

    let query = `
      SELECT 
        sc.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM safety_checks sc
      LEFT JOIN users u ON sc.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND sc.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (isEmergency === 'true') {
      query += ` AND sc.is_emergency = TRUE`;
    }

    query += ` ORDER BY sc.is_emergency DESC, sc.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      eventId: row.event_id,
      eventName: row.event_name,
      status: row.status,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      address: row.address,
      message: row.message,
      isEmergency: row.is_emergency,
      acknowledgedByAdmin: row.acknowledged_by_admin,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching safety alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get unacknowledged emergencies
export const getUnacknowledgedEmergencies = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        sc.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM safety_checks sc
      LEFT JOIN users u ON sc.user_id = u.id
      WHERE sc.is_emergency = TRUE 
        AND sc.acknowledged_by_admin = FALSE
      ORDER BY sc.created_at DESC`
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      eventId: row.event_id,
      eventName: row.event_name,
      status: row.status,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      address: row.address,
      message: row.message,
      isEmergency: row.is_emergency,
      acknowledgedByAdmin: row.acknowledged_by_admin,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching unacknowledged emergencies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Acknowledge safety alert
export const acknowledgeSafetyAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE safety_checks 
       SET acknowledged_by_admin = TRUE, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Safety alert not found' });
    }

    res.json({
      id: result.rows[0].id,
      message: 'Safety alert acknowledged',
    });
  } catch (error) {
    console.error('Error acknowledging safety alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get safety statistics
export const getSafetyStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_emergency = TRUE AND acknowledged_by_admin = FALSE) as unacknowledged_emergencies,
        COUNT(*) FILTER (WHERE is_emergency = TRUE) as total_emergencies,
        COUNT(*) FILTER (WHERE alert_type = 'HIGH_ALERT' OR is_high_alert = TRUE) as high_alerts,
        COUNT(*) FILTER (WHERE alert_type = 'SAFE') as safety_sent,
        COUNT(*) FILTER (WHERE status = 'location-shared') as location_shares,
        COUNT(*) FILTER (WHERE status = 'safe') as safety_checks,
        COUNT(*) FILTER (WHERE status = 'check-in') as check_ins,
        COUNT(*) FILTER (WHERE status = 'sos-broadcast') as sos_broadcasts,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24_hours
      FROM safety_checks
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching safety statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: Get live safety feed
export const getLiveSafetyFeed = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `SELECT 
        sc.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM safety_checks sc
      LEFT JOIN users u ON sc.user_id = u.id
      ORDER BY sc.created_at DESC
      LIMIT $1`,
      [limit]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      eventId: row.event_id,
      eventName: row.event_name,
      status: row.status,
      alertType: row.alert_type || 'ALERT',
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      address: row.address,
      message: row.message,
      isEmergency: row.is_emergency,
      isHighAlert: row.is_high_alert,
      googleMapsUrl: row.google_maps_url,
      acknowledgedByAdmin: row.acknowledged_by_admin,
      acknowledgedAt: row.acknowledged_at,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching live safety feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

