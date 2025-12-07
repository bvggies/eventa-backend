// Vercel serverless function entry point
// Set Vercel environment variable before importing
process.env.VERCEL = '1';

// Change to the app directory so relative imports resolve correctly
const path = require('path');
const originalDir = process.cwd();

try {
  // Change working directory to api/app so relative imports work
  process.chdir(path.join(__dirname, 'app'));
  
  // Import the Express app from the compiled TypeScript
  const indexModule = require('./index.js');
  
  // Restore original directory
  process.chdir(originalDir);
  
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
    throw new Error('Could not find Express app in module exports. Got: ' + typeof app);
  }
  
  // Export the Express app for Vercel
  module.exports = app;
} catch (error) {
  // Restore directory on error
  process.chdir(originalDir);
  console.error('Error loading Express app:', error);
  console.error('Error stack:', error.stack);
  throw error;
}
