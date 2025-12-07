// Vercel serverless function entry point
// Set Vercel environment variable before importing
process.env.VERCEL = '1';

// Use Module._resolveFilename to properly resolve modules
const Module = require('module');
const path = require('path');
const originalRequire = Module.prototype.require;

// Override require to resolve from api/app directory
Module.prototype.require = function(id) {
  // If it's a relative path, resolve it relative to api/app
  if (id.startsWith('./') || id.startsWith('../')) {
    const appDir = path.join(__dirname, 'app');
    const resolvedPath = path.resolve(appDir, id);
    return originalRequire.call(this, resolvedPath);
  }
  // For absolute paths or node_modules, use original require
  return originalRequire.call(this, id);
};

try {
  // Import the Express app from the compiled TypeScript
  // Now relative imports will resolve from api/app
  const indexModule = require(path.join(__dirname, 'app', 'index.js'));
  
  // Restore original require
  Module.prototype.require = originalRequire;
  
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
  // Restore original require on error
  Module.prototype.require = originalRequire;
  console.error('Error loading Express app:', error);
  console.error('Error stack:', error.stack);
  throw error;
}
