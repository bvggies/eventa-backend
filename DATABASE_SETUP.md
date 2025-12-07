# Database Setup - Neon PostgreSQL

## Connection Details

Your Neon database is already configured in the backend. The connection string is set up in:
- `backend/.env` - Environment variables
- `backend/src/config/database.ts` - Database configuration

## Connection String

```
postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Database Tables

The following tables will be automatically created when you start the backend:

1. **users** - User accounts
2. **events** - Event listings
3. **saved_events** - User saved events
4. **rsvps** - Event RSVPs
5. **tickets** - Purchased tickets
6. **vibe_ratings** - Event vibe ratings
7. **buzz_posts** - Social feed posts
8. **buzz_likes** - Post likes
9. **buzz_comments** - Post comments
10. **buzz_shares** - Post shares

## Setup Steps

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **The tables will be created automatically** when the server starts.

3. **Verify connection:**
   - Check the console for "✅ Database connected successfully to Neon"
   - Check for "Database tables initialized successfully"

## Manual Connection (Optional)

You can also connect directly using psql:

```bash
psql 'postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

## Troubleshooting

### Connection Issues
- Make sure your internet connection is active
- Verify the connection string is correct
- Check Neon dashboard for database status

### SSL Issues
- The connection string includes `sslmode=require` which is required for Neon
- SSL is automatically configured in the code

### Table Creation Issues
- Check console logs for specific errors
- Verify you have proper permissions on the database
- Tables are created with IF NOT EXISTS, so it's safe to restart

## Environment Variables

Make sure your `backend/.env` file contains:

```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-secret-key-change-in-production-eventa-2024
NODE_ENV=development
```

## Production Notes

- Change `JWT_SECRET` to a strong random string in production
- Consider using environment variables from your hosting platform
- Neon provides automatic backups and scaling

