import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Get user's trusted contacts
export const getMyTrustedContacts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trusted_contacts WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [req.userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      relationship: row.relationship,
      isPrimary: row.is_primary,
      canReceiveSos: row.can_receive_sos,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching trusted contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add trusted contact
export const addTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, relationship, isPrimary, canReceiveSos } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await pool.query(
        'UPDATE trusted_contacts SET is_primary = FALSE WHERE user_id = $1',
        [req.userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO trusted_contacts (
        user_id, name, phone, email, relationship, is_primary, can_receive_sos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.userId,
        name,
        phone,
        email || null,
        relationship || null,
        isPrimary || false,
        canReceiveSos !== undefined ? canReceiveSos : true,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      phone: result.rows[0].phone,
      email: result.rows[0].email,
      relationship: result.rows[0].relationship,
      isPrimary: result.rows[0].is_primary,
      canReceiveSos: result.rows[0].can_receive_sos,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This contact already exists' });
    }
    console.error('Error adding trusted contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update trusted contact
export const updateTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, relationship, isPrimary, canReceiveSos } = req.body;

    // Verify ownership
    const existing = await pool.query(
      'SELECT * FROM trusted_contacts WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await pool.query(
        'UPDATE trusted_contacts SET is_primary = FALSE WHERE user_id = $1 AND id != $2',
        [req.userId, id]
      );
    }

    const result = await pool.query(
      `UPDATE trusted_contacts 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           relationship = COALESCE($4, relationship),
           is_primary = COALESCE($5, is_primary),
           can_receive_sos = COALESCE($6, can_receive_sos)
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, phone, email, relationship, isPrimary, canReceiveSos, id, req.userId]
    );

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      phone: result.rows[0].phone,
      email: result.rows[0].email,
      relationship: result.rows[0].relationship,
      isPrimary: result.rows[0].is_primary,
      canReceiveSos: result.rows[0].can_receive_sos,
    });
  } catch (error) {
    console.error('Error updating trusted contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete trusted contact
export const deleteTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM trusted_contacts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting trusted contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get primary trusted contact
export const getPrimaryTrustedContact = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trusted_contacts WHERE user_id = $1 AND is_primary = TRUE LIMIT 1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json(null);
    }

    res.status(200).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      phone: result.rows[0].phone,
      email: result.rows[0].email,
      relationship: result.rows[0].relationship,
      isPrimary: result.rows[0].is_primary,
      canReceiveSos: result.rows[0].can_receive_sos,
    });
  } catch (error) {
    console.error('Error fetching primary trusted contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

