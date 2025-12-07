// Copy entire dist folder to api/app for Vercel
// Keep api/index.js as the wrapper, copy dist to api/app
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const apiAppDir = path.join(__dirname, '../api/app');
const apiDir = path.join(__dirname, '../api');

// Create api/app directory if it doesn't exist
if (!fs.existsSync(apiAppDir)) {
  fs.mkdirSync(apiAppDir, { recursive: true });
}

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
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

// Ensure api/index.js exists (the wrapper)
const apiIndexPath = path.join(apiDir, 'index.js');
if (!fs.existsSync(apiIndexPath)) {
  console.error('❌ api/index.js not found. This should be the wrapper file.');
  process.exit(1);
}

// Copy entire dist folder to api/app
copyDir(distDir, apiAppDir);
console.log('✅ Copied dist/ to api/app/ for Vercel');

