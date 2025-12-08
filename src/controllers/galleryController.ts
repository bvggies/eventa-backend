import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';

// Upload media to event gallery
export const uploadGalleryMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, mediaUrl, mediaType, caption, isHighlight = false } = req.body;

    // Verify user attended the event (has ticket or RSVP)
    const attendeeCheck = await pool.query(
      `SELECT 
        EXISTS(SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $2 AND status = 'going') as has_rsvp,
        EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND event_id = $2 AND payment_status = 'completed') as has_ticket
      `,
      [req.userId, eventId]
    );

    const { has_rsvp, has_ticket } = attendeeCheck.rows[0];
    if (!has_rsvp && !has_ticket) {
      return res.status(400).json({ error: 'You must have attended the event to upload media' });
    }

    const result = await pool.query(
      `INSERT INTO event_gallery (event_id, user_id, media_url, media_type, caption, is_highlight)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, req.userId, mediaUrl, mediaType, caption, isHighlight]
    );

    // Award points for gallery upload
    try {
      await pool.query(
        `INSERT INTO points_transactions (user_id, transaction_type, points_amount, coins_amount, source_type, source_id, description)
         VALUES ($1, 'earn', 10, 10, 'gallery_upload', $2, 'Uploaded media to event gallery')`,
        [req.userId, result.rows[0].id]
      );

      // Update wallet
      await pool.query(
        `INSERT INTO user_wallets (user_id, points_balance, coins_balance, total_earned)
         VALUES ($1, 10, 10, 10)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           points_balance = user_wallets.points_balance + 10,
           coins_balance = user_wallets.coins_balance + 10,
           total_earned = user_wallets.total_earned + 10,
           updated_at = CURRENT_TIMESTAMP`,
        [req.userId]
      );
    } catch (pointsError) {
      console.error('Error awarding points for gallery upload:', pointsError);
      // Don't fail the upload if points fail
    }

    res.status(201).json({ media: result.rows[0] });
  } catch (error) {
    console.error('Error uploading gallery media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get event gallery
export const getEventGallery = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { highlightOnly = false, limit = 50, offset = 0 } = req.query;
    const userId = (req as AuthRequest).userId || null;

    let query = `
      SELECT 
        eg.*,
        u.name as user_name,
        u.avatar as user_avatar,
        COUNT(gt.id) as tag_count
      FROM event_gallery eg
      INNER JOIN users u ON u.id = eg.user_id
      LEFT JOIN gallery_tags gt ON gt.gallery_id = eg.id
      WHERE eg.event_id = $1
    `;

    const params: any[] = [eventId];

    if (highlightOnly === 'true') {
      query += ' AND eg.is_highlight = TRUE';
    }

    query += ` GROUP BY eg.id, u.name, u.avatar
               ORDER BY eg.is_highlight DESC, eg.created_at DESC
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get tags for each media item
    const mediaWithTags = await Promise.all(
      result.rows.map(async (media) => {
        const tagsResult = await pool.query(
          `SELECT 
            gt.*,
            u.id as tagged_user_id,
            u.name as tagged_user_name,
            u.avatar as tagged_user_avatar
          FROM gallery_tags gt
          INNER JOIN users u ON u.id = gt.tagged_user_id
          WHERE gt.gallery_id = $1`,
          [media.id]
        );
        return { ...media, tags: tagsResult.rows };
      })
    );

    res.json({ gallery: mediaWithTags });
  } catch (error) {
    console.error('Error fetching event gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Tag user in gallery media
export const tagUserInGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { taggedUserId, xPosition, yPosition } = req.body;

    // Verify gallery exists and user has permission (uploader or tagged user)
    const galleryCheck = await pool.query(
      `SELECT user_id FROM event_gallery WHERE id = $1`,
      [galleryId]
    );

    if (galleryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    // Allow uploader or the person being tagged to add tags
    const canTag = galleryCheck.rows[0].user_id === req.userId || taggedUserId === req.userId;

    if (!canTag) {
      return res.status(403).json({ error: 'Not authorized to tag in this media' });
    }

    const result = await pool.query(
      `INSERT INTO gallery_tags (gallery_id, tagged_user_id, tagged_by_user_id, x_position, y_position)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (gallery_id, tagged_user_id) 
       DO UPDATE SET 
         x_position = EXCLUDED.x_position,
         y_position = EXCLUDED.y_position,
         tagged_by_user_id = EXCLUDED.tagged_by_user_id
       RETURNING *`,
      [galleryId, taggedUserId, req.userId, xPosition, yPosition]
    );

    res.json({ tag: result.rows[0] });
  } catch (error) {
    console.error('Error tagging user in gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove tag from gallery media
export const removeGalleryTag = async (req: AuthRequest, res: Response) => {
  try {
    const { galleryId, tagId } = req.params;

    // Verify user has permission (uploader or tagged user)
    const tagCheck = await pool.query(
      `SELECT gt.tagged_user_id, eg.user_id as uploader_id
       FROM gallery_tags gt
       INNER JOIN event_gallery eg ON eg.id = gt.gallery_id
       WHERE gt.id = $1`,
      [tagId]
    );

    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const { tagged_user_id, uploader_id } = tagCheck.rows[0];
    const canRemove = uploader_id === req.userId || tagged_user_id === req.userId;

    if (!canRemove) {
      return res.status(403).json({ error: 'Not authorized to remove this tag' });
    }

    await pool.query('DELETE FROM gallery_tags WHERE id = $1', [tagId]);

    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Error removing gallery tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark media as highlight
export const markAsHighlight = async (req: AuthRequest, res: Response) => {
  try {
    const { galleryId } = req.params;
    const { isHighlight } = req.body;

    // Verify user is event organizer
    const galleryCheck = await pool.query(
      `SELECT eg.*, e.organizer_id
       FROM event_gallery eg
       INNER JOIN events e ON e.id = eg.event_id
       WHERE eg.id = $1`,
      [galleryId]
    );

    if (galleryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    const { organizer_id } = galleryCheck.rows[0];
    
    // Check if user is organizer or admin
    const userCheck = await pool.query(
      `SELECT is_admin, is_organizer FROM users WHERE id = $1`,
      [req.userId]
    );

    const { is_admin, is_organizer } = userCheck.rows[0] || {};
    const canMark = organizer_id === req.userId || is_admin || is_organizer;

    if (!canMark) {
      return res.status(403).json({ error: 'Only event organizers can mark highlights' });
    }

    await pool.query(
      `UPDATE event_gallery SET is_highlight = $1 WHERE id = $2`,
      [isHighlight, galleryId]
    );

    res.json({ message: 'Highlight status updated' });
  } catch (error) {
    console.error('Error marking highlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

