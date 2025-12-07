"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVenue = exports.getAllVenues = exports.addVenue = exports.getAfterPartyVenues = void 0;
const database_1 = require("../config/database");
const axios_1 = __importDefault(require("axios"));
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
// Search Google Places API for nearby venues
const searchGooglePlaces = async (lat, lng, radius, type = 'night_club|bar|restaurant') => {
    if (!GOOGLE_PLACES_API_KEY) {
        console.warn('Google Places API key not configured');
        return [];
    }
    try {
        const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location: `${lat},${lng}`,
                radius: radius * 1000, // Convert km to meters
                type: type,
                key: GOOGLE_PLACES_API_KEY,
            },
        });
        if (response.data.status === 'OK' && response.data.results) {
            return response.data.results.map((place) => ({
                googlePlaceId: place.place_id,
                name: place.name,
                location: place.vicinity || place.formatted_address,
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
                rating: place.rating || null,
                type: mapGooglePlaceType(place.types),
                image: place.photos && place.photos.length > 0
                    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
                    : null,
            }));
        }
        return [];
    }
    catch (error) {
        console.error('Error searching Google Places:', error);
        return [];
    }
};
// Map Google Places types to our venue types
const mapGooglePlaceType = (types) => {
    if (types.includes('night_club') || types.includes('bar'))
        return 'club';
    if (types.includes('restaurant') || types.includes('cafe'))
        return 'restaurant';
    if (types.includes('park') || types.includes('beach'))
        return 'chill-spot';
    return 'bar';
};
const getAfterPartyVenues = async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = parseFloat(radius);
        if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
            return res.status(400).json({ error: 'Invalid coordinates or radius' });
        }
        // Get venues from database (admin-added and user-added)
        const dbVenuesResult = await database_1.pool.query(`SELECT 
        id, name, type, location, address, latitude, longitude, 
        rating, google_place_id, image, phone, website, description,
        is_admin_added, created_at
       FROM afterparty_venues
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`);
        // Calculate distance for each venue and filter by radius
        const dbVenues = dbVenuesResult.rows
            .map((venue) => {
            const distance = calculateDistance(latNum, lngNum, parseFloat(venue.latitude), parseFloat(venue.longitude));
            return {
                ...venue,
                distance: parseFloat(distance.toFixed(2)),
            };
        })
            .filter((venue) => venue.distance <= radiusNum)
            .sort((a, b) => a.distance - b.distance);
        // Get Google Places results
        const googlePlaces = await searchGooglePlaces(latNum, lngNum, radiusNum);
        // Merge Google Places with database venues, avoiding duplicates
        const googlePlaceIds = new Set(dbVenues.map((v) => v.google_place_id).filter(Boolean));
        const uniqueGooglePlaces = googlePlaces
            .filter((place) => !googlePlaceIds.has(place.googlePlaceId))
            .map((place) => {
            const distance = calculateDistance(latNum, lngNum, place.latitude, place.longitude);
            return {
                id: `google_${place.googlePlaceId}`,
                name: place.name,
                type: place.type,
                location: place.location,
                latitude: place.latitude,
                longitude: place.longitude,
                rating: place.rating,
                distance: parseFloat(distance.toFixed(2)),
                image: place.image,
                google_place_id: place.googlePlaceId,
                is_admin_added: false,
            };
        });
        // Combine and sort by distance
        const allVenues = [...dbVenues, ...uniqueGooglePlaces]
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20); // Limit to 20 results
        res.json(allVenues);
    }
    catch (error) {
        console.error('Error fetching after-party venues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAfterPartyVenues = getAfterPartyVenues;
// Admin endpoint to add a venue
const addVenue = async (req, res) => {
    try {
        // Check if user is admin
        const userResult = await database_1.pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
        if (!userResult.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Only admins can add venues' });
        }
        const { name, type, location, address, latitude, longitude, rating, googlePlaceId, image, phone, website, description, } = req.body;
        if (!name || !type || !location || !latitude || !longitude) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await database_1.pool.query(`INSERT INTO afterparty_venues (
        name, type, location, address, latitude, longitude,
        rating, google_place_id, image, phone, website, description,
        is_admin_added, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`, [
            name,
            type,
            location,
            address || null,
            latitude,
            longitude,
            rating || null,
            googlePlaceId || null,
            image || null,
            phone || null,
            website || null,
            description || null,
            true,
            req.userId,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addVenue = addVenue;
// Admin endpoint to get all venues
const getAllVenues = async (req, res) => {
    try {
        // Check if user is admin
        const userResult = await database_1.pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
        if (!userResult.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Only admins can view all venues' });
        }
        const result = await database_1.pool.query('SELECT * FROM afterparty_venues ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching venues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllVenues = getAllVenues;
// Admin endpoint to delete a venue
const deleteVenue = async (req, res) => {
    try {
        // Check if user is admin
        const userResult = await database_1.pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
        if (!userResult.rows[0]?.is_admin) {
            return res.status(403).json({ error: 'Only admins can delete venues' });
        }
        const { id } = req.params;
        await database_1.pool.query('DELETE FROM afterparty_venues WHERE id = $1', [id]);
        res.json({ message: 'Venue deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting venue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteVenue = deleteVenue;
