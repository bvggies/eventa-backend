"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAfterPartyVenues = void 0;
const getAfterPartyVenues = async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query;
        // Mock data - in production, this would query a venues database
        const venues = [
            {
                id: '1',
                name: 'Skybar Lounge',
                type: 'club',
                location: 'Airport City, Accra',
                latitude: 5.6037,
                longitude: -0.1870,
                rating: 4.5,
                distance: 2.3,
                image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
            },
            {
                id: '2',
                name: 'Republic Bar & Grill',
                type: 'restaurant',
                location: 'Osu, Accra',
                latitude: 5.5500,
                longitude: -0.1833,
                rating: 4.2,
                distance: 3.1,
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            },
            {
                id: '3',
                name: 'Labadi Beach',
                type: 'chill-spot',
                location: 'Labadi, Accra',
                latitude: 5.5833,
                longitude: -0.1167,
                rating: 4.7,
                distance: 5.2,
                image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
            },
        ];
        // Filter by distance if lat/lng provided
        let filteredVenues = venues;
        if (lat && lng) {
            filteredVenues = venues.filter((venue) => {
                // Simple distance calculation
                const distance = Math.sqrt(Math.pow(parseFloat(lat) - venue.latitude, 2) +
                    Math.pow(parseFloat(lng) - venue.longitude, 2)) * 111; // Rough conversion to km
                return distance <= parseFloat(radius);
            });
        }
        res.json(filteredVenues);
    }
    catch (error) {
        console.error('Error fetching after-party venues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAfterPartyVenues = getAfterPartyVenues;
