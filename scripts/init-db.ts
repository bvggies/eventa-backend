import { initializeDatabase } from '../src/config/database';
import { seedBadges } from '../src/utils/seedBadges';
import { pool } from '../src/config/database';

/**
 * Script to initialize database schema and seed badges
 * Run with: npx ts-node scripts/init-db.ts
 */
const initDatabase = async () => {
  try {
    console.log('🔄 Starting database initialization...\n');

    // Test database connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully\n');
    client.release();

    // Initialize database tables (includes all new tables)
    console.log('📋 Initializing database tables...');
    await initializeDatabase();
    console.log('✅ Database tables initialized successfully\n');

    // Seed badges
    console.log('🏆 Seeding badges...');
    await seedBadges();
    console.log('✅ Badges seeded successfully\n');

    console.log('🎉 Database initialization complete!');
    console.log('\n📊 New tables created:');
    console.log('   - user_follows (attendee visibility)');
    console.log('   - event_groups (group attendance)');
    console.log('   - group_members');
    console.log('   - group_chat_messages');
    console.log('   - event_gallery (post-event photos)');
    console.log('   - gallery_tags');
    console.log('   - event_reviews (detailed ratings)');
    console.log('   - user_wallets (points system)');
    console.log('   - points_transactions');
    console.log('   - badges');
    console.log('   - user_badges');
    console.log('   - icebreaker_chats');
    console.log('   - icebreaker_messages');
    console.log('\n✨ All features are ready to use!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error initializing database:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
};

// Run the initialization
initDatabase();

