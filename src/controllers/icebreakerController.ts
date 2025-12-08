import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Initiate icebreaker chat with another attendee
export const initiateIcebreakerChat = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, targetUserId } = req.body;

    if (req.userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot start chat with yourself' });
    }

    // Check if both users are attending the event
    const attendeeCheck = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $3 AND status = 'going') as user1_attending,
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $2 AND event_id = $3 AND status = 'going') as user2_attending,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $3 AND payment_status = 'completed') as user1_has_ticket,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $2 AND event_id = $3 AND payment_status = 'completed') as user2_has_ticket
      `,
      [req.userId, targetUserId, eventId]
    );

    const { user1_attending, user2_attending, user1_has_ticket, user2_has_ticket } = attendeeCheck.rows[0];
    
    if (!(user1_attending || user1_has_ticket) || !(user2_attending || user2_has_ticket)) {
      return res.status(400).json({ error: 'Both users must be attending the event' });
    }

    // Create or get existing chat (ensure consistent user1_id < user2_id ordering)
    const userIds = [req.userId, targetUserId].sort();
    const [user1Id, user2Id] = userIds;

    const existingChat = await pool.query(
      `SELECT * FROM icebreaker_chats 
       WHERE event_id = $1 AND user1_id = $2 AND user2_id = $3`,
      [eventId, user1Id, user2Id]
    );

    let chat;
    if (existingChat.rows.length > 0) {
      chat = existingChat.rows[0];
      // Reactivate if archived
      if (chat.status === 'archived') {
        await pool.query(
          `UPDATE icebreaker_chats SET status = 'active' WHERE id = $1`,
          [chat.id]
        );
        chat.status = 'active';
      }
    } else {
      const result = await pool.query(
        `INSERT INTO icebreaker_chats (event_id, user1_id, user2_id, initiated_by, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [eventId, user1Id, user2Id, req.userId]
      );
      chat = result.rows[0];
    }

    res.json({ chat });
  } catch (error) {
    console.error('Error initiating icebreaker chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get icebreaker chats for an event
export const getIcebreakerChats = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
        ic.*,
        CASE 
          WHEN ic.user1_id = $1 THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN ic.user1_id = $1 THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN ic.user1_id = $1 THEN u2.avatar
          ELSE u1.avatar
        END as other_user_avatar,
        (SELECT message FROM icebreaker_messages 
         WHERE chat_id = ic.id 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM icebreaker_messages 
         WHERE chat_id = ic.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM icebreaker_messages 
         WHERE chat_id = ic.id AND sender_id != $1 AND is_read = FALSE) as unread_count
      FROM icebreaker_chats ic
      INNER JOIN users u1 ON u1.id = ic.user1_id
      INNER JOIN users u2 ON u2.id = ic.user2_id
      WHERE ic.event_id = $2 
        AND (ic.user1_id = $1 OR ic.user2_id = $1)
        AND ic.status = 'active'
      ORDER BY last_message_time DESC NULLS LAST`,
      [req.userId, eventId]
    );

    res.json({ chats: result.rows });
  } catch (error) {
    console.error('Error fetching icebreaker chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send message in icebreaker chat
export const sendIcebreakerMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    // Verify user is part of the chat
    const chatCheck = await pool.query(
      `SELECT * FROM icebreaker_chats 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND status = 'active'`,
      [chatId, req.userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to send message in this chat' });
    }

    const result = await pool.query(
      `INSERT INTO icebreaker_messages (chat_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [chatId, req.userId, message]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error sending icebreaker message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get messages for an icebreaker chat
export const getIcebreakerMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is part of the chat
    const chatCheck = await pool.query(
      `SELECT * FROM icebreaker_chats 
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [chatId, req.userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    const result = await pool.query(
      `SELECT 
        im.*,
        u.name as sender_name,
        u.avatar as sender_avatar
      FROM icebreaker_messages im
      INNER JOIN users u ON u.id = im.sender_id
      WHERE im.chat_id = $1
      ORDER BY im.created_at DESC
      LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE icebreaker_messages 
       SET is_read = TRUE 
       WHERE chat_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [chatId, req.userId]
    );

    res.json({ messages: result.rows.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching icebreaker messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

