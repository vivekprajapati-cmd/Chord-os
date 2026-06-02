// Run once to generate PWA icons: node scripts/generate-icons.mjs
// Requires: npm install canvas (run once)

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background — Ink (#0A0A0A)
  ctx.fillStyle = '#0A0A0A';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // Letter C — Cream (#F2EBD9)
  ctx.fillStyle = '#F2EBD9';
  ctx.font = `bold ${size * 0.58}px Arial Black, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', size * 0.5, size * 0.52);

  return canvas.toBuffer('image/png');
}

writeFileSync('public/icon-192.png', generateIcon(192));
writeFileSync('public/icon-512.png', generateIcon(512));

console.log('Icons generated: public/icon-192.png + public/icon-512.png');
