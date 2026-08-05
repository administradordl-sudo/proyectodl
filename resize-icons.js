const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputImagePath = path.join(__dirname, 'public', 'logo.png');
const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
const icon512Path = path.join(__dirname, 'public', 'icon-512.png');

async function createIcons() {
  try {
    // Read the image
    const imageBuffer = fs.readFileSync(inputImagePath);
    
    // Create 192x192
    await sharp(imageBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(icon192Path);
      
    // Create 512x512
    await sharp(imageBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(icon512Path);
      
    console.log('Icons generated successfully.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

createIcons();
