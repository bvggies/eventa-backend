// Copy dist/index.js to api/index.js and all other files to api/ for Vercel
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const apiDir = path.join(__dirname, '../api');

// Create api directory if it doesn't exist
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Function to copy directory recursively
function copyDir(src, dest, excludeIndex = false) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip index.js if excludeIndex is true (we'll handle it separately)
    if (excludeIndex && entry.name === 'index.js') {
      continue;
    }
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, false);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Check if dist exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run tsc first.');
  process.exit(1);
}

// Copy all files from dist to api (except index.js which we'll handle separately)
copyDir(distDir, apiDir, true);

// Now create a wrapper api/index.js that requires the app
const wrapperContent = `// Vercel serverless function entry point
process.env.VERCEL = '1';

// Import the Express app from the compiled TypeScript
const app = require('./index.js').default || require('./index.js');

// Export the Express app for Vercel
module.exports = app;
`;

// Check if api/index.js wrapper already exists, if not create it
const apiIndexPath = path.join(apiDir, 'index.js');
if (!fs.existsSync(apiIndexPath)) {
  fs.writeFileSync(apiIndexPath, wrapperContent);
  console.log('✅ Created api/index.js wrapper');
}

// Copy dist/index.js to api/app-index.js temporarily, then we'll rename
const distIndexPath = path.join(distDir, 'index.js');
const apiAppIndexPath = path.join(apiDir, 'app-index.js');
fs.copyFileSync(distIndexPath, apiAppIndexPath);

// Now update api/index.js to require app-index.js
const updatedWrapper = `// Vercel serverless function entry point
process.env.VERCEL = '1';

// Import the Express app from the compiled TypeScript
const app = require('./app-index.js').default || require('./app-index.js');

// Export the Express app for Vercel
module.exports = app;
`;
fs.writeFileSync(apiIndexPath, updatedWrapper);

console.log('✅ Copied dist/ to api/ for Vercel (index.js as app-index.js)');

