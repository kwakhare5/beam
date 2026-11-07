import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'renderer', 'assets', 'beam-chime.wav');
const rate = 44100;
const seconds = 0.9;
const total = Math.floor(rate * seconds);
const samples = new Float32Array(total);

function bell(startSec, freq, gain) {
  const start = Math.floor(startSec * rate);
  const length = Math.min(total - start, Math.floor(rate * 0.65));
  for (let i = 0; i < length; i += 1) {
    const t = i / rate;
    const attack = Math.min(1, t / 0.008);
    const decay = Math.exp(-t * 6.5);
    const body = Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
    samples[start + i] += body * attack * decay * gain;
  }
}

bell(0, 880, 0.32);
bell(0.22, 1318.51, 0.28);

let peak = 0;
for (const value of samples) peak = Math.max(peak, Math.abs(value));
const scale = peak > 0 ? 0.85 / peak : 1;
const data = Buffer.alloc(total * 2);
for (let i = 0; i < total; i += 1) {
  const value = Math.max(-1, Math.min(1, samples[i] * scale));
  data.writeInt16LE(Math.round(value * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out} (${header.length + data.length} bytes)`);
