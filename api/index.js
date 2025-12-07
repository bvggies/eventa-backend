// Vercel serverless function entry point
// Set Vercel environment variable before importing
process.env.VERCEL = '1';

const path = require('path');

try {
  // Import the Express app from api/app/index.js
  // Use absolute path to avoid module resolution issues
  const appIndexPath = path.join(__dirname, 'app', 'index.js');
  const indexModule = require(appIndexPath);
  
  // Handle CommonJS default export
  let app;
  if (indexModule.default) {
    app = indexModule.default;
  } else if (indexModule.exports && indexModule.exports.default) {
    app = indexModule.exports.default;
  } else {
    // Try direct access
    app = indexModule;
  }
  
  if (!app || typeof app !== 'function') {
    console.error('Module exports:', Object.keys(indexModule));
    console.error('Module type:', typeof indexModule);
    throw new Error('Could not find Express app in module exports. Got: ' + typeof app);
  }
  
  // Export the Express app for Vercel
  module.exports = app;
} catch (error) {
  console.error('Error loading Express app:', error);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  throw error;
}
