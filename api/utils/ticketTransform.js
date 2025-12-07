"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformTickets = exports.transformTicket = void 0;
/**
 * Transform database ticket (snake_case) to API format (camelCase)
 * @param ticket - Database ticket object
 * @param includePrivateFields - Whether to include private fields like ticket_number (default: true for user's own tickets)
 */
const transformTicket = (ticket, includePrivateFields = true) => {
    const transformed = {
        id: ticket.id,
        eventId: ticket.event_id,
        eventName: ticket.event_name || null, // Include event name for manually added tickets
        userId: ticket.user_id,
        ticketType: ticket.ticket_type,
        quantity: ticket.quantity,
        price: ticket.price ? parseFloat(ticket.price) : 0,
        total: ticket.total ? parseFloat(ticket.total) : 0,
        promoCode: ticket.promo_code || null,
        discount: ticket.discount ? parseFloat(ticket.discount) : 0,
        paymentMethod: ticket.payment_method,
        paymentStatus: ticket.payment_status,
        qrCode: ticket.qr_code || null,
        createdAt: ticket.created_at,
    };
    // Only include ticket_number if explicitly allowed (for user's own tickets)
    if (includePrivateFields) {
        transformed.ticketNumber = ticket.ticket_number || null;
    }
    return transformed;
};
exports.transformTicket = transformTicket;
/**
 * Transform multiple tickets
 * @param tickets - Array of database ticket objects
 * @param includePrivateFields - Whether to include private fields (default: true)
 */
const transformTickets = (tickets, includePrivateFields = true) => {
    return tickets.map(ticket => (0, exports.transformTicket)(ticket, includePrivateFields));
};
exports.transformTickets = transformTickets;
