import { pool } from '../config/database';
import { initializeDatabase } from '../config/database';
import { seedDatabase } from './seed';
import { seedAdminAccounts } from './seedAdmin';
import bcrypt from 'bcryptjs';

/**
 * Comprehensive seed script that seeds all tables in the database
 */
export const seedAllTables = async () => {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    console.log('');

    // First, ensure all tables are created
    console.log('📋 Step 1: Initializing database tables...');
    await initializeDatabase();
    console.log('✅ Database tables initialized');
    console.log('');

    // Seed admin accounts
    console.log('📋 Step 2: Seeding admin accounts...');
    await seedAdminAccounts();
    console.log('');

    // Seed main database (users, events, buzz posts)
    console.log('📋 Step 3: Seeding main data (users, events, buzz posts)...');
    await seedDatabase();
    console.log('');

    // Seed additional data for all tables
    console.log('📋 Step 4: Seeding additional tables...');

    // Get user IDs for relationships
    const usersResult = await client.query('SELECT id, email FROM users ORDER BY created_at');
    const userIds = usersResult.rows.map((row: any) => row.id);
    const adminUserId = usersResult.rows.find((row: any) => row.email === 'admin@eventa.com')?.id;
    const regularUserId = usersResult.rows.find((row: any) => row.email === 'john@example.com')?.id;

    // Get event IDs
    const eventsResult = await client.query('SELECT id FROM events ORDER BY created_at');
    const eventIds = eventsResult.rows.map((row: any) => row.id);

    if (userIds.length === 0 || eventIds.length === 0) {
      console.log('⚠️  No users or events found. Skipping additional seeding.');
      return;
    }

    // Seed RSVPs
    console.log('   Seeding RSVPs...');
    const rsvpCount = await client.query('SELECT COUNT(*) FROM rsvps');
    if (parseInt(rsvpCount.rows[0].count) === 0 && eventIds.length > 0 && regularUserId) {
      for (let i = 0; i < Math.min(3, eventIds.length); i++) {
        await client.query(
          `INSERT INTO rsvps (user_id, event_id, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, event_id) DO NOTHING`,
          [regularUserId, eventIds[i], i === 0 ? 'going' : 'interested']
        );
      }
      console.log('   ✅ Created RSVPs');
    } else {
      console.log('   ⏭️  RSVPs already exist');
    }

    // Seed Tickets
    console.log('   Seeding Tickets...');
    const ticketCount = await client.query('SELECT COUNT(*) FROM tickets');
    if (parseInt(ticketCount.rows[0].count) === 0 && eventIds.length > 0 && regularUserId) {
      for (let i = 0; i < Math.min(2, eventIds.length); i++) {
        const eventResult = await client.query('SELECT ticket_price FROM events WHERE id = $1', [eventIds[i]]);
        const ticketPrice = parseFloat(eventResult.rows[0]?.ticket_price || '50');
        
        await client.query(
          `INSERT INTO tickets (user_id, event_id, ticket_type, quantity, price, total, payment_method, payment_status, qr_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            regularUserId,
            eventIds[i],
            'Regular',
            1,
            ticketPrice,
            ticketPrice,
            'momo',
            'completed',
            `QR-${Date.now()}-${i}`
          ]
        );
      }
      console.log('   ✅ Created Tickets');
    } else {
      console.log('   ⏭️  Tickets already exist');
    }

    // Seed Trusted Contacts
    console.log('   Seeding Trusted Contacts...');
    const contactCount = await client.query('SELECT COUNT(*) FROM trusted_contacts');
    if (parseInt(contactCount.rows[0].count) === 0 && regularUserId) {
      await client.query(
        `INSERT INTO trusted_contacts (user_id, name, phone, email, relationship, is_primary, can_receive_sos)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          regularUserId,
          'Emergency Contact',
          '+233241234999',
          'emergency@example.com',
          'Family',
          true,
          true
        ]
      );
      console.log('   ✅ Created Trusted Contacts');
    } else {
      console.log('   ⏭️  Trusted Contacts already exist');
    }

    // Seed Safety Checks
    console.log('   Seeding Safety Checks...');
    const safetyCount = await client.query('SELECT COUNT(*) FROM safety_checks');
    if (parseInt(safetyCount.rows[0].count) === 0 && eventIds.length > 0 && regularUserId) {
      // Create a mix of safety check types
      await client.query(
        `INSERT INTO safety_checks (user_id, event_id, status, alert_type, latitude, longitude, address, event_name, is_emergency, is_high_alert, google_maps_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          regularUserId,
          eventIds[0],
          'location-shared',
          'HIGH_ALERT',
          5.5500,
          -0.2000,
          'Independence Square, Accra',
          'Accra Music Festival 2024',
          false,
          true,
          'https://www.google.com/maps?q=5.5500,-0.2000'
        ]
      );

      await client.query(
        `INSERT INTO safety_checks (user_id, event_id, status, alert_type, latitude, longitude, address, event_name, is_emergency, is_high_alert, google_maps_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          regularUserId,
          eventIds[0],
          'safe',
          'SAFE',
          5.5500,
          -0.2000,
          'Independence Square, Accra',
          'Accra Music Festival 2024',
          false,
          false,
          'https://www.google.com/maps?q=5.5500,-0.2000'
        ]
      );
      console.log('   ✅ Created Safety Checks');
    } else {
      console.log('   ⏭️  Safety Checks already exist');
    }

    // Seed After Party Venues (if admin user exists)
    console.log('   Seeding After Party Venues...');
    const venueCount = await client.query('SELECT COUNT(*) FROM afterparty_venues');
    if (parseInt(venueCount.rows[0].count) === 0) {
      const venues = [
        {
          name: 'Republic Bar',
          type: 'bar',
          location: 'Osu, Accra',
          latitude: 5.5500,
          longitude: -0.1667,
          rating: 4.5,
          google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
          is_admin_added: adminUserId ? true : false,
          added_by: adminUserId || null,
        },
        {
          name: 'Skybar 25',
          type: 'lounge',
          location: 'Airport City, Accra',
          latitude: 5.6167,
          longitude: -0.1833,
          rating: 4.7,
          google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY5',
          is_admin_added: adminUserId ? true : false,
          added_by: adminUserId || null,
        },
      ];

      for (const venue of venues) {
        await client.query(
          `INSERT INTO afterparty_venues (name, type, location, latitude, longitude, rating, google_place_id, is_admin_added, added_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            venue.name,
            venue.type,
            venue.location,
            venue.latitude,
            venue.longitude,
            venue.rating,
            venue.google_place_id,
            venue.is_admin_added,
            venue.added_by
          ]
        );
      }
      console.log('   ✅ Created After Party Venues');
    } else {
      console.log('   ⏭️  After Party Venues already exist');
    }

    // Seed Vibe Ratings
    console.log('   Seeding Vibe Ratings...');
    const vibeCount = await client.query('SELECT COUNT(*) FROM vibe_ratings');
    if (parseInt(vibeCount.rows[0].count) === 0 && eventIds.length > 0 && regularUserId) {
      await client.query(
        `INSERT INTO vibe_ratings (user_id, event_id, rating, comment)
         VALUES ($1, $2, $3, $4)`,
        [
          regularUserId,
          eventIds[0],
          'lit',
          'Amazing event! The vibe was incredible!'
        ]
      );
      console.log('   ✅ Created Vibe Ratings');
    } else {
      console.log('   ⏭️  Vibe Ratings already exist');
    }

    console.log('');
    console.log('✅ Comprehensive database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM rsvps) as rsvps,
        (SELECT COUNT(*) FROM tickets) as tickets,
        (SELECT COUNT(*) FROM buzz_posts) as buzz_posts,
        (SELECT COUNT(*) FROM trusted_contacts) as trusted_contacts,
        (SELECT COUNT(*) FROM safety_checks) as safety_checks,
        (SELECT COUNT(*) FROM afterparty_venues) as afterparty_venues,
        (SELECT COUNT(*) FROM vibe_ratings) as vibe_ratings
    `);
    const counts = summary.rows[0];
    console.log(`   👥 Users: ${counts.users}`);
    console.log(`   🎉 Events: ${counts.events}`);
    console.log(`   ✅ RSVPs: ${counts.rsvps}`);
    console.log(`   🎫 Tickets: ${counts.tickets}`);
    console.log(`   💬 Buzz Posts: ${counts.buzz_posts}`);
    console.log(`   📞 Trusted Contacts: ${counts.trusted_contacts}`);
    console.log(`   🛡️  Safety Checks: ${counts.safety_checks}`);
    console.log(`   🍻 After Party Venues: ${counts.afterparty_venues}`);
    console.log(`   ⭐ Vibe Ratings: ${counts.vibe_ratings}`);
    console.log('');
    console.log('🔑 Admin Login Credentials:');
    console.log('   Email: admin@eventa.com');
    console.log('   Password: admin123');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error seeding database:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  seedAllTables()
    .then(() => {
      console.log('✅ All seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

