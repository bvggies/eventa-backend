// Copy dist/index.js to api/index.js for Vercel
const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, '../dist/index.js');
const apiDir = path.join(__dirname, '../api');
const apiFile = path.join(apiDir, 'index.js');

// Create api directory if it doesn't exist
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Copy the built file
if (fs.existsSync(distFile)) {
  fs.copyFileSync(distFile, apiFile);
  console.log('✅ Copied dist/index.js to api/index.js for Vercel');
} else {
  console.error('❌ dist/index.js not found. Run tsc first.');
  process.exit(1);
}

