/**
 * Generates local development audio fixtures.
 *
 * These are synthesised sine tones written as 16-bit PCM WAV files. They are
 * NOT audiobook content and contain no third-party material. They exist only so
 * that the player architecture can be exercised end to end during development.
 *
 * Usage: npm run gen:fixtures
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'audio', 'dev');
const sampleRate = 22050;

function writeWav(filePath, samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }

  writeFileSync(filePath, buffer);
  return buffer.length;
}

/**
 * A quiet, clearly non-musical tone with short silent gaps, so that position
 * and duration are audible in a way that makes playback bugs obvious.
 */
function makeTone(seconds, frequency) {
  const count = Math.floor(seconds * sampleRate);
  const samples = new Float32Array(count);
  const attack = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < count; i += 1) {
    const fade = Math.min(1, i / Math.max(1, attack));
    samples[i] = 0.18 * fade * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return samples;
}

mkdirSync(outDir, { recursive: true });

const fixtures = [
  { file: 'tone-a.wav', seconds: 6, frequency: 220 },
  { file: 'tone-b.wav', seconds: 8, frequency: 277.18 },
  { file: 'tone-c.wav', seconds: 5, frequency: 329.63 },
  { file: 'tone-d.wav', seconds: 7, frequency: 196 },
  { file: 'tone-e.wav', seconds: 4, frequency: 246.94 },
];

for (const fixture of fixtures) {
  const size = writeWav(resolve(outDir, fixture.file), makeTone(fixture.seconds, fixture.frequency));
  console.log(`wrote ${fixture.file} (${fixture.seconds}s, ${size} bytes)`);
}

console.log('Development audio fixtures generated. No audiobook content included.');
