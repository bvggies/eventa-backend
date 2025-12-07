// Vercel serverless function entry point
const app = require('../dist/index.js');

// Export the Express app for Vercel
module.exports = app.default || app;

