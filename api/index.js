// Vercel serverless function entry point
// Set Vercel environment variable before importing
process.env.VERCEL = '1';

// Import the Express app directly from api/app/index.js
// Node.js will resolve relative imports from api/app/index.js correctly
const app = require('./app/index.js').default || require('./app/index.js');

// Export the Express app for Vercel
module.exports = app;
