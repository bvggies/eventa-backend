# Eventa Backend API

Node.js + Express + PostgreSQL (Neon) backend for the Eventa app.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env` (already configured with Neon database)
   - Or create `.env` with:
     ```env
     PORT=5000
     DATABASE_URL=postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     JWT_SECRET=your-secret-key-change-in-production-eventa-2024
     NODE_ENV=development
     ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

The server will:
- ✅ Connect to your Neon database
- ✅ Create all necessary tables automatically
- ✅ Start on http://localhost:5000

## 📊 Database

**Neon PostgreSQL** is already configured. The connection string includes:
- SSL mode: required
- Channel binding: required
- Automatic table creation on startup

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for more details.

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/featured` - Get featured events
- `GET /api/events/trending` - Get trending events
- `GET /api/events/nearby` - Get nearby events
- `POST /api/events` - Create event (auth)
- `PUT /api/events/:id` - Update event (auth)
- `DELETE /api/events/:id` - Delete event (auth)

### Users
- `GET /api/users/profile` - Get profile (auth)
- `PUT /api/users/profile` - Update profile (auth)
- `GET /api/users/saved-events` - Get saved events (auth)
- `POST /api/users/saved-events/:eventId` - Save event (auth)
- `DELETE /api/users/saved-events/:eventId` - Unsave event (auth)

### RSVP
- `POST /api/rsvp` - RSVP to event (auth)
- `GET /api/rsvp` - Get my RSVPs (auth)
- `DELETE /api/rsvp/:eventId` - Cancel RSVP (auth)

### Tickets
- `POST /api/tickets` - Buy ticket (auth)
- `GET /api/tickets` - Get my tickets (auth)
- `GET /api/tickets/:id` - Get ticket by ID (auth)

### Vibe Ratings
- `POST /api/vibe` - Rate event (auth)
- `GET /api/vibe/event/:eventId` - Get event ratings

### Buzz (Social Feed)
- `GET /api/buzz` - Get all posts
- `GET /api/buzz/:id` - Get post by ID
- `GET /api/buzz/hashtag/:hashtag` - Get posts by hashtag
- `GET /api/buzz/hashtags/trending` - Get trending hashtags
- `POST /api/buzz` - Create post (auth)
- `POST /api/buzz/:id/like` - Like/unlike post (auth)

### After Party
- `GET /api/afterparty/nearby` - Get nearby venues

## 🗄️ Database Schema

Tables are created automatically:
- `users` - User accounts
- `events` - Event listings
- `saved_events` - User saved events
- `rsvps` - Event RSVPs
- `tickets` - Purchased tickets
- `vibe_ratings` - Event vibe ratings
- `buzz_posts` - Social feed posts
- `buzz_likes` - Post likes
- `buzz_comments` - Post comments
- `buzz_shares` - Post shares

## 🔐 Authentication

Uses JWT tokens. Include in requests:
```
Authorization: Bearer <token>
```

## 🛠️ Development

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start
```

## 📝 Environment Variables

- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Environment (development/production)

## 🐛 Troubleshooting

**Database connection fails:**
- Check your internet connection
- Verify the connection string in `.env`
- Check Neon dashboard for database status

**Tables not created:**
- Check console logs for errors
- Verify database permissions
- Tables use `IF NOT EXISTS`, safe to restart

## 📚 More Info

- [Database Setup](./DATABASE_SETUP.md)
- [Main Project README](../README.md)

