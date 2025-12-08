import { pool } from '../config/database';

export const seedBadges = async () => {
  const client = await pool.connect();
  try {
    // Check if badges already exist
    const existingBadges = await client.query('SELECT COUNT(*) FROM badges');
    if (parseInt(existingBadges.rows[0].count) > 0) {
      console.log('Badges already seeded, skipping...');
      return;
    }

    const badges = [
      {
        name: 'party_king',
        display_name: 'Party King',
        description: 'Attended 10+ events',
        icon: '👑',
        category: 'attendance',
        requirement_type: 'events_attended',
        requirement_value: 10,
      },
      {
        name: 'night_owl',
        display_name: 'Night Owl',
        description: 'Attended 5+ night events',
        icon: '🌙',
        category: 'attendance',
        requirement_type: 'night_events_attended',
        requirement_value: 5,
      },
      {
        name: 'concert_addict',
        display_name: 'Concert Addict',
        description: 'Attended 5+ concerts',
        icon: '🎤',
        category: 'attendance',
        requirement_type: 'concerts_attended',
        requirement_value: 5,
      },
      {
        name: 'social_butterfly',
        display_name: 'Social Butterfly',
        description: 'Followed 50+ people',
        icon: '🦋',
        category: 'social',
        requirement_type: 'following_count',
        requirement_value: 50,
      },
      {
        name: 'buzz_master',
        display_name: 'Buzz Master',
        description: 'Posted 20+ buzz posts',
        icon: '📱',
        category: 'engagement',
        requirement_type: 'buzz_posts',
        requirement_value: 20,
      },
      {
        name: 'early_bird',
        display_name: 'Early Bird',
        description: 'RSVP\'d to 10+ events early',
        icon: '🐦',
        category: 'engagement',
        requirement_type: 'early_rsvps',
        requirement_value: 10,
      },
      {
        name: 'reviewer',
        display_name: 'Reviewer',
        description: 'Reviewed 5+ events',
        icon: '⭐',
        category: 'engagement',
        requirement_type: 'reviews_submitted',
        requirement_value: 5,
      },
      {
        name: 'photographer',
        display_name: 'Photographer',
        description: 'Uploaded 20+ gallery photos',
        icon: '📸',
        category: 'engagement',
        requirement_type: 'gallery_uploads',
        requirement_value: 20,
      },
      {
        name: 'group_leader',
        display_name: 'Group Leader',
        description: 'Created 5+ event groups',
        icon: '👥',
        category: 'social',
        requirement_type: 'groups_created',
        requirement_value: 5,
      },
      {
        name: 'vip_member',
        display_name: 'VIP Member',
        description: 'Redeemed VIP upgrade',
        icon: '💎',
        category: 'special',
        requirement_type: 'vip_upgrade',
        requirement_value: 1,
      },
    ];

    for (const badge of badges) {
      await client.query(
        `INSERT INTO badges (name, display_name, description, icon, category, requirement_type, requirement_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO NOTHING`,
        [
          badge.name,
          badge.display_name,
          badge.description,
          badge.icon,
          badge.category,
          badge.requirement_type,
          badge.requirement_value,
        ]
      );
    }

    console.log('✅ Badges seeded successfully');
  } catch (error) {
    console.error('Error seeding badges:', error);
    throw error;
  } finally {
    client.release();
  }
};

