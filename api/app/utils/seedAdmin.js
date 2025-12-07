"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminAccounts = void 0;
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Seed admin accounts specifically
 * This will create or update admin accounts even if other data exists
 */
const seedAdminAccounts = async () => {
    const client = await database_1.pool.connect();
    try {
        console.log('🔑 Seeding admin accounts...');
        const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
        const organizerPassword = await bcryptjs_1.default.hash('password123', 10);
        const adminAccounts = [
            {
                name: 'Super Admin',
                email: 'admin@eventa.com',
                password: adminPassword,
                phone: '+233241234500',
                is_organizer: true,
                is_admin: true,
            },
            {
                name: 'Event Organizer Pro',
                email: 'organizer@eventa.com',
                password: organizerPassword,
                phone: '+233241234569',
                is_organizer: true,
                is_admin: false,
            },
        ];
        for (const admin of adminAccounts) {
            // Check if user exists
            const existing = await client.query('SELECT id, is_admin FROM users WHERE email = $1', [admin.email]);
            if (existing.rows.length > 0) {
                // Update existing user to ensure admin status
                await client.query(`UPDATE users 
           SET name = $1, password = $2, phone = $3, is_organizer = $4, is_admin = $5, updated_at = CURRENT_TIMESTAMP
           WHERE email = $6`, [admin.name, admin.password, admin.phone, admin.is_organizer, admin.is_admin, admin.email]);
                console.log(`✅ Updated admin account: ${admin.email} (is_admin: ${admin.is_admin})`);
            }
            else {
                // Create new user
                const result = await client.query(`INSERT INTO users (name, email, password, phone, is_organizer, is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, is_admin`, [admin.name, admin.email, admin.password, admin.phone, admin.is_organizer, admin.is_admin]);
                console.log(`✅ Created admin account: ${admin.email} (is_admin: ${admin.is_admin})`);
            }
        }
        console.log('✅ Admin accounts seeded successfully!');
        console.log('');
        console.log('📋 Admin Account Credentials:');
        console.log('   Super Admin:');
        console.log('   - Email: admin@eventa.com');
        console.log('   - Password: admin123');
        console.log('   - Role: Super Admin (Full Access)');
        console.log('');
        console.log('   Organizer:');
        console.log('   - Email: organizer@eventa.com');
        console.log('   - Password: password123');
        console.log('   - Role: Organizer');
    }
    catch (error) {
        console.error('❌ Error seeding admin accounts:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.seedAdminAccounts = seedAdminAccounts;
// Run if called directly
if (require.main === module) {
    (0, exports.seedAdminAccounts)()
        .then(() => {
        console.log('✅ Seeding complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    });
}
