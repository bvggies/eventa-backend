// Vercel serverless function entry point
// Set Vercel environment variable before importing
process.env.VERCEL = '1';

// Import the Express app from the compiled TypeScript
// The dist folder is copied to api/app, so we require from there
let app;

try {
  const indexModule = require('./app/index.js');
  
  // Handle CommonJS default export
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
    throw new Error('Could not find Express app in module exports. Got: ' + typeof app);
  }
} catch (error) {
  console.error('Error loading Express app:', error);
  console.error('Error stack:', error.stack);
  throw error;
}

// Export the Express app for Vercel
module.exports = app;
