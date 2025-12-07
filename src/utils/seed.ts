import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seeding...');

    // Check if data already exists
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    const existingEvents = await client.query('SELECT COUNT(*) FROM events');

    const userCount = parseInt(existingUsers.rows[0].count);
    const eventCount = parseInt(existingEvents.rows[0].count);
    
    if (userCount > 0 || eventCount > 0) {
      console.log(`⚠️  Database already has data (${userCount} users, ${eventCount} events). Skipping seed.`);
      return;
    }

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const users = [
      {
        name: 'Super Admin',
        email: 'admin@eventa.com',
        password: adminPassword,
        phone: '+233241234500',
        is_organizer: true,
        is_admin: true,
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        phone: '+233241234567',
        is_organizer: false,
        is_admin: false,
      },
      {
        name: 'Sarah Mensah',
        email: 'sarah@example.com',
        password: hashedPassword,
        phone: '+233241234568',
        is_organizer: true,
        is_admin: false,
      },
      {
        name: 'Event Organizer Pro',
        email: 'organizer@eventa.com',
        password: hashedPassword,
        phone: '+233241234569',
        is_organizer: true,
        is_admin: false,
      },
    ];

    const userIds: string[] = [];
    for (const user of users) {
      // Check if user already exists
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows.length > 0) {
        // Update existing user to ensure admin status
        if (user.is_admin) {
          await client.query(
            'UPDATE users SET is_admin = $1, is_organizer = $2 WHERE email = $3',
            [user.is_admin, user.is_organizer, user.email]
          );
        }
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
        userIds.push(existingUser.rows[0].id);
      } else {
        const result = await client.query(
          `INSERT INTO users (name, email, password, phone, is_organizer, is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [user.name, user.email, user.password, user.phone, user.is_organizer, user.is_admin || false]
        );
        userIds.push(result.rows[0].id);
      }
    }
    console.log(`✅ Created/Updated ${userIds.length} users`);
    console.log(`🔑 Super Admin Account: admin@eventa.com / admin123`);

    // Create sample events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const events = [
      {
        name: 'Accra Music Festival 2024',
        description: 'The biggest music festival in Ghana! Featuring top artists from across Africa. Join us for an unforgettable night of music, food, and fun.',
        location: 'Accra',
        address: 'Independence Square, Accra',
        latitude: 5.5500,
        longitude: -0.2000,
        date: nextWeek.toISOString().split('T')[0],
        time: '18:00:00',
        end_date: nextWeek.toISOString().split('T')[0],
        end_time: '23:00:00',
        category: 'Concert',
        banner: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        ticket_price: 50.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[1],
        organizer_name: 'Sarah Mensah',
        views: 1250,
        likes: 89,
        saves: 45,
        rsvps: 234,
        is_featured: true,
        is_trending: true,
        promo_code: 'FEST2024',
        promo_discount: 10.00,
      },
      {
        name: 'Beach Party at Labadi',
        description: 'Sunset beach party with DJ, drinks, and bonfire. Perfect way to end the week!',
        location: 'Accra',
        address: 'Labadi Beach, Accra',
        latitude: 5.6000,
        longitude: -0.1500,
        date: tomorrow.toISOString().split('T')[0],
        time: '16:00:00',
        end_date: tomorrow.toISOString().split('T')[0],
        end_time: '22:00:00',
        category: 'Beach',
        banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
        ticket_price: 25.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[2],
        organizer_name: 'Event Organizer Pro',
        views: 890,
        likes: 67,
        saves: 32,
        rsvps: 156,
        is_featured: false,
        is_trending: true,
      },
      {
        name: 'Kumasi Night Market',
        description: 'Explore local crafts, food, and entertainment at the vibrant night market.',
        location: 'Kumasi',
        address: 'Kejetia Market, Kumasi',
        latitude: 6.7000,
        longitude: -1.6167,
        date: nextWeek.toISOString().split('T')[0],
        time: '17:00:00',
        end_date: nextWeek.toISOString().split('T')[0],
        end_time: '23:00:00',
        category: 'Fair',
        banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        ticket_price: 0.00,
        currency: 'GHS',
        is_free: true,
        organizer_id: userIds[2],
        organizer_name: 'Event Organizer Pro',
        views: 456,
        likes: 34,
        saves: 18,
        rsvps: 89,
        is_featured: false,
        is_trending: false,
      },
      {
        name: 'Gospel Concert - Praise Night',
        description: 'An uplifting night of gospel music and worship. All are welcome!',
        location: 'Accra',
        address: 'National Theatre, Accra',
        latitude: 5.5500,
        longitude: -0.1833,
        date: nextMonth.toISOString().split('T')[0],
        time: '18:00:00',
        end_date: nextMonth.toISOString().split('T')[0],
        end_time: '21:00:00',
        category: 'Church',
        banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
        ticket_price: 30.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[1],
        organizer_name: 'Sarah Mensah',
        views: 678,
        likes: 45,
        saves: 23,
        rsvps: 112,
        is_featured: true,
        is_trending: false,
      },
      {
        name: 'Club Night - Afrobeat Vibes',
        description: 'Dance the night away to the best Afrobeat hits. Dress to impress!',
        location: 'Accra',
        address: 'Republic Bar, Osu, Accra',
        latitude: 5.5500,
        longitude: -0.1667,
        date: tomorrow.toISOString().split('T')[0],
        time: '22:00:00',
        end_date: tomorrow.toISOString().split('T')[0],
        end_time: '04:00:00',
        category: 'Club',
        banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
        ticket_price: 40.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[2],
        organizer_name: 'Event Organizer Pro',
        views: 1234,
        likes: 156,
        saves: 78,
        rsvps: 289,
        is_featured: true,
        is_trending: true,
        promo_code: 'CLUB50',
        promo_discount: 5.00,
      },
      {
        name: 'Kids Fun Day',
        description: 'A fun-filled day for kids with games, face painting, and entertainment.',
        location: 'Accra',
        address: 'Achimota School, Accra',
        latitude: 5.6000,
        longitude: -0.2333,
        date: nextWeek.toISOString().split('T')[0],
        time: '10:00:00',
        end_date: nextWeek.toISOString().split('T')[0],
        end_time: '16:00:00',
        category: 'Kids',
        banner: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
        ticket_price: 15.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[1],
        organizer_name: 'Sarah Mensah',
        views: 345,
        likes: 28,
        saves: 12,
        rsvps: 67,
        is_featured: false,
        is_trending: false,
      },
      {
        name: 'Movie Premiere - New Release',
        description: 'Exclusive premiere screening of the latest blockbuster. Red carpet event!',
        location: 'Accra',
        address: 'Silverbird Cinemas, Accra Mall',
        latitude: 5.6167,
        longitude: -0.1833,
        date: nextWeek.toISOString().split('T')[0],
        time: '19:00:00',
        end_date: nextWeek.toISOString().split('T')[0],
        end_time: '21:30:00',
        category: 'Movie',
        banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
        ticket_price: 35.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[2],
        organizer_name: 'Event Organizer Pro',
        views: 567,
        likes: 42,
        saves: 19,
        rsvps: 98,
        is_featured: false,
        is_trending: true,
      },
      {
        name: 'Tech Conference 2024',
        description: 'Learn from industry leaders about the latest in technology and innovation.',
        location: 'Accra',
        address: 'Kempinski Hotel, Accra',
        latitude: 5.5500,
        longitude: -0.2000,
        date: nextMonth.toISOString().split('T')[0],
        time: '09:00:00',
        end_date: nextMonth.toISOString().split('T')[0],
        end_time: '17:00:00',
        category: 'Conference',
        banner: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800',
        ticket_price: 100.00,
        currency: 'GHS',
        is_free: false,
        organizer_id: userIds[2],
        organizer_name: 'Event Organizer Pro',
        views: 789,
        likes: 56,
        saves: 34,
        rsvps: 145,
        is_featured: true,
        is_trending: false,
      },
    ];

    for (const event of events) {
      await client.query(
        `INSERT INTO events (
          name, description, location, address, latitude, longitude,
          date, time, end_date, end_time, category, banner,
          ticket_price, currency, is_free, organizer_id, organizer_name,
          views, likes, saves, rsvps, is_featured, is_trending,
          promo_code, promo_discount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [
          event.name, event.description, event.location, event.address,
          event.latitude, event.longitude, event.date, event.time,
          event.end_date, event.end_time, event.category, event.banner,
          event.ticket_price, event.currency, event.is_free,
          event.organizer_id, event.organizer_name,
          event.views, event.likes, event.saves, event.rsvps,
          event.is_featured, event.is_trending,
          event.promo_code || null, event.promo_discount || null,
        ]
      );
    }
    console.log(`✅ Created ${events.length} events`);

    // Create some sample buzz posts
    const buzzPosts = [
      {
        user_id: userIds[0],
        content: 'Can\'t wait for the Accra Music Festival! 🔥 #MusicFest #Accra #GhanaEvents',
        hashtags: ['MusicFest', 'Accra', 'GhanaEvents'],
      },
      {
        user_id: userIds[1],
        content: 'Excited to announce our beach party this weekend! Join us for an amazing time 🌊 #BeachParty #Labadi',
        hashtags: ['BeachParty', 'Labadi'],
        event_id: null, // Will link to beach party event
      },
      {
        user_id: userIds[0],
        content: 'Just discovered Eventa! This app is amazing for finding events in Ghana 🇬🇭 #Eventa #GhanaEvents',
        hashtags: ['Eventa', 'GhanaEvents'],
      },
    ];

    // Get event IDs for linking
    const eventResult = await client.query('SELECT id FROM events ORDER BY created_at DESC LIMIT 3');
    const eventIds = eventResult.rows.map((row: any) => row.id);

    for (let i = 0; i < buzzPosts.length; i++) {
      const post = buzzPosts[i];
      await client.query(
        `INSERT INTO buzz_posts (user_id, content, event_id, hashtags)
         VALUES ($1, $2, $3, $4)`,
        [
          post.user_id,
          post.content,
          i === 1 ? eventIds[1] : null, // Link beach party post to event
          post.hashtags,
        ]
      );
    }
    console.log(`✅ Created ${buzzPosts.length} buzz posts`);

    console.log('✅ Database seeding completed successfully!');
  } catch (error: any) {
    console.error('❌ Error seeding database:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    // Don't throw - let the server continue even if seeding fails
    // throw error;
  } finally {
    client.release();
  }
};

