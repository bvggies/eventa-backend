"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }, // Neon requires SSL
});
// Initialize database tables
const initializeDatabase = async () => {
    const client = await exports.pool.connect();
    try {
        // Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        avatar TEXT,
        is_organizer BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Add is_admin column if it doesn't exist (for existing databases)
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_admin'
        ) THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);
        // Events table
        await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255) NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        date DATE NOT NULL,
        time TIME NOT NULL,
        end_date DATE,
        end_time TIME,
        category VARCHAR(50) NOT NULL,
        banner TEXT,
        ticket_price DECIMAL(10, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'GHS',
        is_free BOOLEAN DEFAULT FALSE,
        organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        organizer_name VARCHAR(255),
        organizer_avatar TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        rsvps INTEGER DEFAULT 0,
        vibe_rating DECIMAL(3, 2),
        is_featured BOOLEAN DEFAULT FALSE,
        is_trending BOOLEAN DEFAULT FALSE,
        promo_code VARCHAR(50),
        promo_discount DECIMAL(5, 2),
        ticket_options JSONB DEFAULT '[]'::jsonb,
        gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
        ticket_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Saved events table
        await client.query(`
      CREATE TABLE IF NOT EXISTS saved_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);
        // RSVP table
        await client.query(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL CHECK (status IN ('interested', 'going', 'not-going')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);
        // Tickets table
        await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ticket_type VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        promo_code VARCHAR(50),
        discount DECIMAL(10, 2) DEFAULT 0,
        payment_method VARCHAR(20) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Vibe ratings table
        await client.query(`
      CREATE TABLE IF NOT EXISTS vibe_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rating VARCHAR(20) NOT NULL CHECK (rating IN ('lit', 'cool', 'average', 'dead')),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);
        // Buzz posts table
        await client.query(`
      CREATE TABLE IF NOT EXISTS buzz_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
        images TEXT[] DEFAULT ARRAY[]::TEXT[],
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Buzz likes table
        await client.query(`
      CREATE TABLE IF NOT EXISTS buzz_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES buzz_posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);
        // Buzz comments table
        await client.query(`
      CREATE TABLE IF NOT EXISTS buzz_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES buzz_posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Buzz shares table
        await client.query(`
      CREATE TABLE IF NOT EXISTS buzz_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES buzz_posts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      )
    `);
        // Add views column to buzz_posts if it doesn't exist
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'buzz_posts' AND column_name = 'views'
        ) THEN
          ALTER TABLE buzz_posts ADD COLUMN views INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);
        // Add new columns to events table if they don't exist
        await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'events' AND column_name = 'ticket_options'
        ) THEN
          ALTER TABLE events ADD COLUMN ticket_options JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'events' AND column_name = 'gallery'
        ) THEN
          ALTER TABLE events ADD COLUMN gallery TEXT[] DEFAULT ARRAY[]::TEXT[];
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'events' AND column_name = 'ticket_link'
        ) THEN
          ALTER TABLE events ADD COLUMN ticket_link TEXT;
        END IF;
      END $$;
    `);
        console.log('Database tables initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.initializeDatabase = initializeDatabase;
