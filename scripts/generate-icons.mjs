/**
 * PWA Icon Generator Script
 * Generates PNG icons from SVG for various sizes
 * 
 * Run with: node scripts/generate-icons.mjs
 * Requires: npm install sharp
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Create icons directory if not exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Base SVG content with the logo
const createSvgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#070B16"/>
      <stop offset="100%" style="stop-color:#0F172A"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="url(#bgGrad)"/>
  <g transform="translate(${size * 0.11}, ${size * 0.11}) scale(${size / 30})">
    <path fill="#2D2D2D" stroke="#FFFFFF" stroke-width="0.6317" stroke-miterlimit="10" d="M24.51,28.51H5.49c-2.21,0-4-1.79-4-4V5.49c0-2.21,1.79-4,4-4h19.03c2.21,0,4,1.79,4,4v19.03C28.51,26.72,26.72,28.51,24.51,28.51z"/>
    <g>
      <path fill="#FFFFFF" d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z"/>
      <polygon fill="#FFFFFF" points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"/>
      <path fill="#FFFFFF" d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z"/>
    </g>
  </g>
</svg>
`;

// Generate icons
async function generateIcons() {
  console.log('Generating PWA icons...\n');
  
  for (const size of sizes) {
    const svg = createSvgIcon(size);
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${size}x${size}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message);
    }
  }
  
  // Generate shortcut icons (scan and wallet)
  console.log('\nGenerating shortcut icons...');
  
  // Scan icon
  const scanSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#070B16"/>
  <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size * 0.7 / 24})">
    <rect x="2" y="2" width="7.5" height="7.5" rx="1.8" stroke="#FFD60A" stroke-width="1.9" fill="none"/>
    <rect x="14.5" y="2" width="7.5" height="7.5" rx="1.8" stroke="#FFD60A" stroke-width="1.9" fill="none"/>
    <rect x="2" y="14.5" width="7.5" height="7.5" rx="1.8" stroke="#FFD60A" stroke-width="1.9" fill="none"/>
    <circle cx="12" cy="12" r="2.1" fill="#FFD60A"/>
    <circle cx="17.4" cy="13.4" r="1.15" fill="#FFD60A"/>
    <circle cx="20.6" cy="16.4" r="1.15" fill="#FFD60A"/>
    <circle cx="13.6" cy="17.4" r="1.15" fill="#FFD60A"/>
    <circle cx="17.4" cy="20.4" r="1.15" fill="#FFD60A"/>
    <circle cx="20.6" cy="20.4" r="1.15" fill="#FFD60A"/>
  </g>
</svg>
`;
  
  const walletSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#070B16"/>
  <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size * 0.7 / 24})">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#FFD60A" stroke-width="2" fill="none"/>
    <path d="M16 12h.01" stroke="#FFD60A" stroke-width="2" stroke-linecap="round"/>
    <path d="M2 10h20" stroke="#FFD60A" stroke-width="2"/>
  </g>
</svg>
`;
  
  try {
    await sharp(Buffer.from(scanSvg(96))).png().toFile(join(iconsDir, 'scan-shortcut.png'));
    console.log('✓ Generated scan-shortcut.png');
  } catch (error) {
    console.error('✗ Failed to generate scan-shortcut.png:', error.message);
  }
  
  try {
    await sharp(Buffer.from(walletSvg(96))).png().toFile(join(iconsDir, 'wallet-shortcut.png'));
    console.log('✓ Generated wallet-shortcut.png');
  } catch (error) {
    console.error('✗ Failed to generate wallet-shortcut.png:', error.message);
  }
  
  console.log('\n✓ Icon generation complete!');
}

generateIcons().catch(console.error);
