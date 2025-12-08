import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Create an event group
export const createEventGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, name, description, maxMembers = 50 } = req.body;

    // Verify user is attending the event
    const attendeeCheck = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $2 AND status = 'going') as has_rsvp,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND payment_status = 'completed') as has_ticket
      `,
      [req.userId, eventId]
    );

    const { has_rsvp, has_ticket } = attendeeCheck.rows[0];
    if (!has_rsvp && !has_ticket) {
      return res.status(400).json({ error: 'You must be attending the event to create a group' });
    }

    // Generate unique invite code
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();

    const result = await pool.query(
      `INSERT INTO event_groups (event_id, creator_id, name, description, invite_code, max_members)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, req.userId, name, description, inviteCode, maxMembers]
    );

    const group = result.rows[0];

    // Add creator as member with creator role
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'creator')`,
      [group.id, req.userId]
    );

    res.status(201).json({ group });
  } catch (error) {
    console.error('Error creating event group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Join event group by invite code
export const joinEventGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;

    // Find group by invite code
    const groupResult = await pool.query(
      `SELECT * FROM event_groups WHERE invite_code = $1`,
      [inviteCode]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const group = groupResult.rows[0];

    // Check if user is already a member
    const memberCheck = await pool.query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group.id, req.userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.json({ group, message: 'Already a member of this group' });
    }

    // Check if group is full
    const memberCount = await pool.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );

    if (parseInt(memberCount.rows[0].count) >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Verify user is attending the event
    const attendeeCheck = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $2 AND status = 'going') as has_rsvp,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND payment_status = 'completed') as has_ticket
      `,
      [req.userId, group.event_id]
    );

    const { has_rsvp, has_ticket } = attendeeCheck.rows[0];
    if (!has_rsvp && !has_ticket) {
      return res.status(400).json({ error: 'You must be attending the event to join the group' });
    }

    // Add user to group
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [group.id, req.userId]
    );

    res.json({ group, message: 'Successfully joined group' });
  } catch (error) {
    console.error('Error joining event group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get event groups for an event
export const getEventGroups = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = (req as AuthRequest).userId || null;

    const result = await pool.query(
      `SELECT 
        eg.*,
        u.name as creator_name,
        u.avatar as creator_avatar,
        COUNT(gm.id) as member_count,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM group_members WHERE group_id = eg.id AND user_id = $2)
        ELSE FALSE END as is_member
      FROM event_groups eg
      INNER JOIN users u ON u.id = eg.creator_id
      LEFT JOIN group_members gm ON gm.group_id = eg.id
      WHERE eg.event_id = $1
      GROUP BY eg.id, u.name, u.avatar
      ORDER BY eg.created_at DESC`,
      [eventId, userId]
    );

    res.json({ groups: result.rows });
  } catch (error) {
    console.error('Error fetching event groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get group details
export const getGroupDetails = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = (req as AuthRequest).userId || null;

    const groupResult = await pool.query(
      `SELECT 
        eg.*,
        u.name as creator_name,
        u.avatar as creator_avatar,
        COUNT(gm.id) as member_count,
        CASE WHEN $2::uuid IS NOT NULL THEN 
          EXISTS(SELECT 1 FROM group_members WHERE group_id = eg.id AND user_id = $2)
        ELSE FALSE END as is_member
      FROM event_groups eg
      INNER JOIN users u ON u.id = eg.creator_id
      LEFT JOIN group_members gm ON gm.group_id = eg.id
      WHERE eg.id = $1
      GROUP BY eg.id, u.name, u.avatar`,
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Get group members
    const membersResult = await pool.query(
      `SELECT 
        gm.*,
        u.id as user_id,
        u.name,
        u.avatar,
        u.bio
      FROM group_members gm
      INNER JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE gm.role 
          WHEN 'creator' THEN 1
          WHEN 'admin' THEN 2
          ELSE 3
        END,
        gm.joined_at ASC`,
      [groupId]
    );

    res.json({ 
      group,
      members: membersResult.rows 
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Leave event group
export const leaveEventGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;

    // Check if user is the creator
    const groupCheck = await pool.query(
      `SELECT creator_id FROM event_groups WHERE id = $1`,
      [groupId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (groupCheck.rows[0].creator_id === req.userId) {
      return res.status(400).json({ error: 'Group creator cannot leave. Transfer ownership or delete group instead.' });
    }

    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.userId]
    );

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving event group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send message in group chat
export const sendGroupMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;

    // Verify user is a member
    const memberCheck = await pool.query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must be a member to send messages' });
    }

    const result = await pool.query(
      `INSERT INTO group_chat_messages (group_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [groupId, req.userId, message]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get group chat messages
export const getGroupMessages = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        gcm.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM group_chat_messages gcm
      INNER JOIN users u ON u.id = gcm.user_id
      WHERE gcm.group_id = $1
      ORDER BY gcm.created_at DESC
      LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    res.json({ messages: result.rows.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

