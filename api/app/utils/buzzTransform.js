"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformBuzzPosts = exports.transformBuzzPost = void 0;
/**
 * Transform database buzz post (snake_case) to API format (camelCase)
 */
const transformBuzzPost = (post) => {
    return {
        id: post.id,
        userId: post.user_id,
        userName: post.user_name || 'Unknown User',
        userAvatar: post.user_avatar || null,
        content: post.content,
        images: post.images || [],
        eventId: post.event_id || null,
        eventName: post.event_name || null,
        hashtags: post.hashtags || [],
        likes: parseInt(post.likes) || 0,
        comments: parseInt(post.comments) || 0,
        shares: parseInt(post.shares) || 0,
        views: parseInt(post.views) || 0,
        isLiked: post.is_liked || false,
        createdAt: post.created_at,
    };
};
exports.transformBuzzPost = transformBuzzPost;
/**
 * Transform multiple buzz posts
 */
const transformBuzzPosts = (posts) => {
    return posts.map(exports.transformBuzzPost);
};
exports.transformBuzzPosts = transformBuzzPosts;
