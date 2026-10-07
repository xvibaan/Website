const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }
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

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticSrc = path.join(rootDir, '.next', 'static');
const publicSrc = path.join(rootDir, 'public');

try {
  if (!fs.existsSync(standaloneDir)) {
    console.error(`Error: Standalone directory not found at ${standaloneDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(staticSrc)) {
    console.error(`Error: Source static directory not found at ${staticSrc}`);
    process.exit(1);
  }

  console.log('Copying static assets to standalone directory...');
  
  // Copy public directory
  if (fs.existsSync(publicSrc)) {
    const publicDest = path.join(standaloneDir, 'public');
    copyDir(publicSrc, publicDest);
    console.log('- Copied public directory');
  }

  // Copy .next/static directory
  const staticDest = path.join(standaloneDir, '.next', 'static');
  copyDir(staticSrc, staticDest);
  console.log('- Copied .next/static directory');
  
  console.log('Standalone build artifacts are complete.');
} catch (error) {
  console.error('Error during standalone asset copy:', error);
  process.exit(1);
}
