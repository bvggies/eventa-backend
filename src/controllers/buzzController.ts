import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { transformBuzzPost, transformBuzzPosts } from '../utils/buzzTransform';

export const getAllPosts = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        bp.*,
        u.name as user_name,
        u.avatar as user_avatar,
        e.name as event_name,
        e.id as event_id,
        bp.views,
        (SELECT COUNT(*) FROM buzz_likes WHERE post_id = bp.id) as likes,
        (SELECT COUNT(*) FROM buzz_comments WHERE post_id = bp.id) as comments,
        (SELECT COUNT(*) FROM buzz_shares WHERE post_id = bp.id) as shares,
        EXISTS(SELECT 1 FROM buzz_likes WHERE post_id = bp.id AND user_id = $1) as is_liked
      FROM buzz_posts bp
      INNER JOIN users u ON bp.user_id = u.id
      LEFT JOIN events e ON bp.event_id = e.id
      ORDER BY bp.created_at DESC
      LIMIT 50`,
      [req.userId || null]
    );
    res.json(transformBuzzPosts(result.rows));
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        bp.*,
        u.name as user_name,
        u.avatar as user_avatar,
        e.name as event_name,
        e.id as event_id,
        bp.views,
        (SELECT COUNT(*) FROM buzz_likes WHERE post_id = bp.id) as likes,
        (SELECT COUNT(*) FROM buzz_comments WHERE post_id = bp.id) as comments,
        (SELECT COUNT(*) FROM buzz_shares WHERE post_id = bp.id) as shares,
        EXISTS(SELECT 1 FROM buzz_likes WHERE post_id = bp.id AND user_id = $2) as is_liked
      FROM buzz_posts bp
      INNER JOIN users u ON bp.user_id = u.id
      LEFT JOIN events e ON bp.event_id = e.id
      WHERE bp.id = $1`,
      [id, req.userId || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(transformBuzzPost(result.rows[0]));
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostsByHashtag = async (req: any, res: Response) => {
  try {
    const { hashtag } = req.params;
    const result = await pool.query(
      `SELECT 
        bp.*,
        u.name as user_name,
        u.avatar as user_avatar,
        e.name as event_name,
        e.id as event_id,
        bp.views,
        (SELECT COUNT(*) FROM buzz_likes WHERE post_id = bp.id) as likes,
        (SELECT COUNT(*) FROM buzz_comments WHERE post_id = bp.id) as comments,
        (SELECT COUNT(*) FROM buzz_shares WHERE post_id = bp.id) as shares,
        EXISTS(SELECT 1 FROM buzz_likes WHERE post_id = bp.id AND user_id = $2) as is_liked
      FROM buzz_posts bp
      INNER JOIN users u ON bp.user_id = u.id
      LEFT JOIN events e ON bp.event_id = e.id
      WHERE bp.hashtags @> ARRAY[$1]::text[]
      ORDER BY bp.created_at DESC
      LIMIT 50`,
      [hashtag, req.userId || null]
    );
    res.json(transformBuzzPosts(result.rows));
  } catch (error) {
    console.error('Error fetching posts by hashtag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { content, eventId, hashtags, images } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await pool.query(
      `INSERT INTO buzz_posts (user_id, content, event_id, hashtags, images)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.userId,
        content.trim(),
        eventId || null,
        hashtags || [],
        images || [],
      ]
    );

    // Fetch the full post with user info
    const fullPostResult = await pool.query(
      `SELECT 
        bp.*,
        u.name as user_name,
        u.avatar as user_avatar,
        e.name as event_name,
        e.id as event_id,
        bp.views,
        (SELECT COUNT(*) FROM buzz_likes WHERE post_id = bp.id) as likes,
        (SELECT COUNT(*) FROM buzz_comments WHERE post_id = bp.id) as comments,
        (SELECT COUNT(*) FROM buzz_shares WHERE post_id = bp.id) as shares,
        EXISTS(SELECT 1 FROM buzz_likes WHERE post_id = bp.id AND user_id = $1) as is_liked
      FROM buzz_posts bp
      INNER JOIN users u ON bp.user_id = u.id
      LEFT JOIN events e ON bp.event_id = e.id
      WHERE bp.id = $2`,
      [req.userId, result.rows[0].id]
    );

    res.status(201).json(transformBuzzPost(fullPostResult.rows[0]));
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if already liked
    const existing = await pool.query(
      'SELECT id FROM buzz_likes WHERE post_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existing.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM buzz_likes WHERE post_id = $1 AND user_id = $2', [
        id,
        req.userId,
      ]);
      res.json({ liked: false });
    } else {
      // Like
      await pool.query('INSERT INTO buzz_likes (post_id, user_id) VALUES ($1, $2)', [
        id,
        req.userId,
      ]);
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const incrementViews = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE buzz_posts SET views = views + 1 WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing views:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const result = await pool.query(
      `INSERT INTO buzz_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.userId, content.trim()]
    );

    res.status(201).json(transformBuzzComment(result.rows[0]));
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addShare = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if already shared by this user
    const existing = await pool.query(
      'SELECT id FROM buzz_shares WHERE post_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existing.rows.length === 0) {
      // Add share
      await pool.query(
        'INSERT INTO buzz_shares (post_id, user_id) VALUES ($1, $2)',
        [id, req.userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding share:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCommentsByPostId = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        bc.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM buzz_comments bc
      INNER JOIN users u ON bc.user_id = u.id
      WHERE bc.post_id = $1
      ORDER BY bc.created_at DESC`,
      [id]
    );

    const comments = result.rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      userName: row.user_name || 'Unknown User',
      userAvatar: row.user_avatar || null,
      content: row.content,
      createdAt: row.created_at,
    }));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const transformBuzzComment = (comment: any) => {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    content: comment.content,
    createdAt: comment.created_at,
  };
};

export const getTrendingHashtags = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        unnest(hashtags) as tag,
        COUNT(*) as count
      FROM buzz_posts
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20`
    );

    const hashtags = result.rows.map((row) => ({
      tag: row.tag,
      count: parseInt(row.count),
      trending: parseInt(row.count) > 10,
    }));

    res.json(hashtags);
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

