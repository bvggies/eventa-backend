import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Initialize database tables
export const initializeDatabase = async () => {
  const client = await pool.connect();
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
        ticket_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add ticket_number column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_number') THEN
          ALTER TABLE tickets ADD COLUMN ticket_number TEXT;
        END IF;
      END $$;
    `);

    // Add event_name column if it doesn't exist (for manually added tickets)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'event_name') THEN
          ALTER TABLE tickets ADD COLUMN event_name VARCHAR(255);
        END IF;
      END $$;
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

    // After party venues table
    await client.query(`
      CREATE TABLE IF NOT EXISTS afterparty_venues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('club', 'restaurant', 'chill-spot', 'bar', 'lounge')),
        location TEXT NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        rating DECIMAL(3, 2),
        google_place_id VARCHAR(255),
        image TEXT,
        phone VARCHAR(50),
        website TEXT,
        description TEXT,
        is_admin_added BOOLEAN DEFAULT FALSE,
        added_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for location-based queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_afterparty_venues_location 
      ON afterparty_venues(latitude, longitude)
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

    // Safety checks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS safety_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL CHECK (status IN ('safe', 'check-in', 'emergency', 'location-shared', 'high-alert', 'sos-broadcast')),
        alert_type VARCHAR(20) DEFAULT 'location-shared' CHECK (alert_type IN ('SAFE', 'ALERT', 'EMERGENCY', 'HIGH_ALERT', 'SOS')),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address TEXT,
        event_name VARCHAR(255),
        message TEXT,
        is_emergency BOOLEAN DEFAULT FALSE,
        is_high_alert BOOLEAN DEFAULT FALSE,
        acknowledged_by_admin BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMP,
        google_maps_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add alert_type column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_checks' AND column_name = 'alert_type') THEN
          ALTER TABLE safety_checks ADD COLUMN alert_type VARCHAR(20) DEFAULT 'location-shared';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_checks' AND column_name = 'is_high_alert') THEN
          ALTER TABLE safety_checks ADD COLUMN is_high_alert BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_checks' AND column_name = 'google_maps_url') THEN
          ALTER TABLE safety_checks ADD COLUMN google_maps_url TEXT;
        END IF;
      END $$;
    `);

    // Trusted contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trusted_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        relationship VARCHAR(50),
        is_primary BOOLEAN DEFAULT FALSE,
        can_receive_sos BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, phone)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON trusted_contacts(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_alert_type ON safety_checks(alert_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_is_high_alert ON safety_checks(is_high_alert) WHERE is_high_alert = TRUE;
    `);

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_user_id ON safety_checks(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_status ON safety_checks(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_emergency ON safety_checks(is_emergency) WHERE is_emergency = TRUE;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_safety_checks_created_at ON safety_checks(created_at DESC);
    `);

    // User follows table (for attendee visibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        CHECK (follower_id != following_id)
      )
    `);

    // Event groups table (for group attendance)
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        invite_code VARCHAR(50) UNIQUE NOT NULL,
        max_members INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Group members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES event_groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      )
    `);

    // Group chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES event_groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Event gallery table (post-event photos/videos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_gallery (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
        caption TEXT,
        is_highlight BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gallery tags table (tagging people in photos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID REFERENCES event_gallery(id) ON DELETE CASCADE,
        tagged_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        tagged_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        x_position DECIMAL(5, 2),
        y_position DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(gallery_id, tagged_user_id)
      )
    `);

    // Event reviews table (detailed ratings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        overall_rating DECIMAL(2, 1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
        crowd_rating DECIMAL(2, 1) CHECK (crowd_rating >= 1 AND crowd_rating <= 5),
        music_rating DECIMAL(2, 1) CHECK (music_rating >= 1 AND music_rating <= 5),
        security_rating DECIMAL(2, 1) CHECK (security_rating >= 1 AND security_rating <= 5),
        drinks_rating DECIMAL(2, 1) CHECK (drinks_rating >= 1 AND drinks_rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      )
    `);

    // Wallet/points system
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        points_balance INTEGER DEFAULT 0,
        coins_balance INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_redeemed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Points transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS points_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'penalty')),
        points_amount INTEGER NOT NULL,
        coins_amount INTEGER DEFAULT 0,
        source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('event_attendance', 'buzz_post', 'invite_friend', 'ticket_purchase', 'review_submission', 'gallery_upload', 'discount', 'free_ticket', 'vip_upgrade', 'admin_adjustment')),
        source_id UUID,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Badges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        category VARCHAR(50) CHECK (category IN ('attendance', 'social', 'engagement', 'special')),
        requirement_type VARCHAR(50),
        requirement_value INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User badges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_id)
      )
    `);

    // Icebreaker chats table (for attendee connections)
    await client.query(`
      CREATE TABLE IF NOT EXISTS icebreaker_chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
        initiated_by UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user1_id, user2_id)
      )
    `);

    // Icebreaker messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS icebreaker_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID REFERENCES icebreaker_chats(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for new tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
      CREATE INDEX IF NOT EXISTS idx_event_groups_event ON event_groups(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_groups_invite_code ON event_groups(invite_code);
      CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group ON group_chat_messages(group_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_gallery_event ON event_gallery(event_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_gallery_highlight ON event_gallery(event_id, is_highlight) WHERE is_highlight = TRUE;
      CREATE INDEX IF NOT EXISTS idx_gallery_tags_gallery ON gallery_tags(gallery_id);
      CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
      CREATE INDEX IF NOT EXISTS idx_icebreaker_chats_event ON icebreaker_chats(event_id);
      CREATE INDEX IF NOT EXISTS idx_icebreaker_messages_chat ON icebreaker_messages(chat_id, created_at DESC);
    `);

    // Add wallet columns to users table if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'followers_count') THEN
          ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'following_count') THEN
          ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    console.log('Database tables initialized successfully');
    
    // Seed admin accounts if they don't exist (for Vercel/production)
    try {
      const { seedAdminAccounts } = await import('../utils/seedAdmin');
      await seedAdminAccounts();
    } catch (seedError: any) {
      console.warn('⚠️  Could not seed admin accounts (non-critical):', seedError.message);
    }

    // Seed badges if they don't exist
    try {
      const { seedBadges } = await import('../utils/seedBadges');
      await seedBadges();
    } catch (seedError: any) {
      console.warn('⚠️  Could not seed badges (non-critical):', seedError.message);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

