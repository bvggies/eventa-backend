// Vercel serverless function entry point
process.env.VERCEL = '1';

// Import the Express app from the compiled TypeScript
const app = require('./app-index.js').default || require('./app-index.js');

// Export the Express app for Vercel
module.exports = app;
