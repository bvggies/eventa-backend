import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initializeDatabase } from './config/database';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import userRoutes from './routes/users';
import rsvpRoutes from './routes/rsvp';
import ticketRoutes from './routes/tickets';
import vibeRoutes from './routes/vibe';
import afterpartyRoutes from './routes/afterparty';
import buzzRoutes from './routes/buzz';
import adminRoutes from './routes/admin';
import { seedDatabase } from './utils/seed';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', '*']; // Default to allow all in development

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? allowedOrigins 
    : '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Increase body size limit for image uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/vibe', vibeRoutes);
app.use('/api/afterparty', afterpartyRoutes);
app.use('/api/buzz', buzzRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Eventa API is running' });
});

// Initialize database and start server
const initializeServer = async () => {
  try {
    console.log('🔄 Connecting to database...');
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully to Neon');
    client.release();
    
    console.log('🔄 Initializing database tables...');
    // Initialize database tables
    await initializeDatabase();
    console.log('✅ Database tables initialized');
    
    // Seed database with sample data (non-blocking)
    console.log('🔄 Seeding database with sample data...');
    try {
      await seedDatabase();
    } catch (seedError: any) {
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
  } catch (err: any) {
    console.error('❌ Server initialization error:', err);
    console.error('Error details:', err.message);
    console.error('Stack:', err.stack);
    // Don't exit - allow server to start even if DB fails (for testing)
    // process.exit(1);
    
    // Start server anyway for testing
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️  Server started on port ${PORT} but database connection failed`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`📱 Mobile API: http://192.168.0.100:${PORT}/api`);
    });
  }
};

initializeServer();

export default app;

