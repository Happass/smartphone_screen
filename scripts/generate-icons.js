import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 簡単なPWAアイコンを生成する関数
function generatePWAIcon(size) {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#646cff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#61dafb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
  <circle cx="256" cy="200" r="60" fill="white" opacity="0.9"/>
  <rect x="196" y="280" width="120" height="80" rx="20" fill="white" opacity="0.9"/>
  <rect x="216" y="300" width="80" height="40" rx="10" fill="#646cff"/>
  <circle cx="236" cy="320" r="8" fill="white"/>
  <circle cx="276" cy="320" r="8" fill="white"/>
  <text x="256" y="420" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">AR</text>
</svg>`;

  return svg;
}

// アイコンファイルを生成
const publicDir = path.join(__dirname, '..', 'public');

// 192x192 PNG (簡易版としてSVGをコピー)
const icon192 = generatePWAIcon(192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

// 512x512 PNG (簡易版としてSVGをコピー)
const icon512 = generatePWAIcon(512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

// Apple Touch Icon (180x180)
const appleTouchIcon = generatePWAIcon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

console.log('PWA icons generated successfully!');
