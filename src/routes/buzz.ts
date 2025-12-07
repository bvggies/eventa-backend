import express from 'express';
import {
  getAllPosts,
  getPostById,
  getPostsByHashtag,
  createPost,
  likePost,
  getTrendingHashtags,
  incrementViews,
  addComment,
  addShare,
  getCommentsByPostId,
} from '../controllers/buzzController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/hashtags/trending', getTrendingHashtags);
router.get('/hashtag/:hashtag', getPostsByHashtag);
router.get('/:id', getPostById);
router.get('/:id/comments', getCommentsByPostId);
router.post('/', authenticate, createPost);
router.post('/:id/like', authenticate, likePost);
router.post('/:id/view', incrementViews);
router.post('/:id/comment', authenticate, addComment);
router.post('/:id/share', authenticate, addShare);

export default router;

