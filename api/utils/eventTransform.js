"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformEvents = exports.transformEvent = void 0;
/**
 * Transform database event (snake_case) to API format (camelCase)
 */
const transformEvent = (event) => {
    return {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        address: event.address,
        latitude: event.latitude ? parseFloat(event.latitude) : null,
        longitude: event.longitude ? parseFloat(event.longitude) : null,
        date: event.date,
        time: event.time,
        endDate: event.end_date || null,
        endTime: event.end_time || null,
        category: event.category,
        banner: event.banner,
        ticketPrice: event.ticket_price ? parseFloat(event.ticket_price) : 0,
        currency: event.currency || 'GHS',
        isFree: event.is_free || false,
        organizerId: event.organizer_id,
        organizerName: event.organizer_name,
        organizerAvatar: event.organizer_avatar,
        views: event.views || 0,
        likes: event.likes || 0,
        saves: event.saves || 0,
        rsvps: event.rsvps || 0,
        vibeRating: event.vibe_rating ? parseFloat(event.vibe_rating) : null,
        isFeatured: event.is_featured || false,
        isTrending: event.is_trending || false,
        promoCode: event.promo_code || null,
        promoDiscount: event.promo_discount ? parseFloat(event.promo_discount) : null,
        ticketOptions: typeof event.ticket_options === 'string'
            ? JSON.parse(event.ticket_options)
            : (event.ticket_options || []),
        gallery: event.gallery || [],
        ticketLink: event.ticket_link || null,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
    };
};
exports.transformEvent = transformEvent;
/**
 * Transform multiple events
 */
const transformEvents = (events) => {
    return events.map(exports.transformEvent);
};
exports.transformEvents = transformEvents;
