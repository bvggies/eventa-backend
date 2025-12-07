"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const users_1 = __importDefault(require("./routes/users"));
const rsvp_1 = __importDefault(require("./routes/rsvp"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const vibe_1 = __importDefault(require("./routes/vibe"));
const afterparty_1 = __importDefault(require("./routes/afterparty"));
const buzz_1 = __importDefault(require("./routes/buzz"));
const admin_1 = __importDefault(require("./routes/admin"));
const seed_1 = require("./utils/seed");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', '*']; // Default to allow all in development
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Increase body size limit for image uploads (50MB)
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/events', events_1.default);
app.use('/api/users', users_1.default);
app.use('/api/rsvp', rsvp_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/vibe', vibe_1.default);
app.use('/api/afterparty', afterparty_1.default);
app.use('/api/buzz', buzz_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Eventa API is running' });
});
// Root route for Vercel
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Eventa API is running', version: '1.0.0' });
});
// Initialize database (only for non-serverless environments)
const initializeServer = async () => {
    // Skip initialization on Vercel (serverless)
    if (process.env.VERCEL) {
        console.log('🚀 Running on Vercel - skipping server initialization');
        return;
    }
    try {
        console.log('🔄 Connecting to database...');
        // Test database connection
        const client = await database_1.pool.connect();
        console.log('✅ Database connected successfully to Neon');
        client.release();
        console.log('🔄 Initializing database tables...');
        // Initialize database tables
        await (0, database_1.initializeDatabase)();
        console.log('✅ Database tables initialized');
        // Seed database with sample data (non-blocking)
        console.log('🔄 Seeding database with sample data...');
        try {
            await (0, seed_1.seedDatabase)();
        }
        catch (seedError) {
            console.error('⚠️  Error seeding database (non-critical):', seedError.message);
            // Continue server startup even if seeding fails
        }
        // Start server - listen on all interfaces (0.0.0.0) to allow mobile device access
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
            console.log(`📱 Mobile API: http://192.168.0.100:${PORT}/api`);
            console.log(`💾 Database: Neon PostgreSQL`);
            console.log(`✅ Server ready to accept connections`);
        });
    }
    catch (err) {
        console.error('❌ Server initialization error:', err);
        console.error('Error details:', err.message);
        console.error('Stack:', err.stack);
        // Start server anyway for testing
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`⚠️  Server started on port ${PORT} but database connection failed`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
            console.log(`📱 Mobile API: http://192.168.0.100:${PORT}/api`);
        });
    }
};
// Only initialize server if not on Vercel or serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_TARGET;
if (!isServerless) {
    // Regular server mode - initialize and listen
    initializeServer();
}
else {
    // Serverless mode - skip server initialization
    // Database will be initialized lazily on first request
    console.log('🚀 Running in serverless mode - skipping server initialization');
}
// Export app for Vercel serverless functions
exports.default = app;
