/**
 * Generates the PWA placeholder icons as solid-colour PNGs.
 *
 * Placeholder art only, produced locally with zlib so the repository needs no
 * binary design assets and no external tooling.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');

// OpenAudioBooks placeholder palette: deep indigo with a warm amber "play" bar.
const BACKGROUND = [24, 26, 43];
const FOREGROUND = [242, 181, 56];

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Draws a rounded-square background with a centred triangle, which reads as a
 * play button at every required size.
 */
function drawIcon(size) {
  const radius = Math.round(size * 0.22);
  const barLeft = Math.round(size * 0.36);
  const barRight = Math.round(size * 0.68);
  const top = Math.round(size * 0.3);
  const bottom = Math.round(size * 0.7);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter type: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const insideRoundedSquare = (() => {
        const cx = Math.min(Math.max(x, radius), size - 1 - radius);
        const cy = Math.min(Math.max(y, radius), size - 1 - radius);
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= radius * radius;
      })();

      let colour = BACKGROUND;
      if (insideRoundedSquare) {
        // Triangle pointing right, centred vertically.
        const halfHeight = bottom - top;
        const centreY = (top + bottom) / 2;
        const dy = Math.abs(y - centreY);
        const t = dy / (halfHeight / 2);
        const xLimit = barLeft + (barRight - barLeft) * (1 - t);
        if (y >= top && y <= bottom && x >= barLeft && x <= xLimit) {
          colour = FOREGROUND;
        }
      }

      raw[offset] = colour[0];
      raw[offset + 1] = colour[1];
      raw[offset + 2] = colour[2];
      raw[offset + 3] = 255;
      offset += 4;
    }
  }
  return raw;
}

function encodePng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(drawIcon(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });

for (const size of [192, 512, 180]) {
  const file = resolve(outDir, size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`);
  const png = encodePng(size);
  writeFileSync(file, png);
  console.log(`wrote ${size}x${size} icon (${png.length} bytes)`);
}

console.log('Placeholder PWA icons generated.');
