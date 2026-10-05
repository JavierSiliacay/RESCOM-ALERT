const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const durationSeconds = 6; // 6-second loop
const totalSamples = sampleRate * durationSeconds;
const numChannels = 1;
const bytesPerSample = 2; // 16-bit
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = totalSamples * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

// 1. RIFF Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// 2. fmt Subchunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // BitsPerSample

// 3. data Subchunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Generate authentic mechanical dual-rotor military air raid siren
// Modulation period: 3 seconds per rise/fall cycle (2 full cycles in 6 seconds)
let phase1 = 0;
let phase2 = 0;

for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  
  // Base frequency sweeps between 450Hz and 820Hz
  const cycle = (t % 3.0) / 3.0; // 0 to 1 over 3 seconds
  // Smooth triangle/sine sweep
  const mod = 0.5 - 0.5 * Math.cos(2 * Math.PI * cycle);
  const freq = 450 + 370 * mod;
  
  // Advance phase
  phase1 += (2 * Math.PI * freq) / sampleRate;
  // Second harmonized rotor (5:4 minor third ratio common in air raid sirens)
  phase2 += (2 * Math.PI * (freq * 1.25)) / sampleRate;
  
  // Mechanical siren waveform (blend of fundamental, rotor 2, and 2nd harmonic for rich buzz)
  const s1 = Math.sin(phase1);
  const s2 = Math.sin(phase2) * 0.4;
  const s3 = Math.sin(phase1 * 2) * 0.25;
  const s4 = Math.sin(phase1 * 3) * 0.1;
  
  let val = (s1 + s2 + s3 + s4) / 1.75;
  
  // Subtle fade in/out at loop edges for seamless looping
  if (i < 2000) val *= i / 2000;
  if (i > totalSamples - 2000) val *= (totalSamples - i) / 2000;
  
  // Clamp & write 16-bit signed PCM
  const sample = Math.max(-32768, Math.min(32767, Math.floor(val * 32000)));
  buffer.writeInt16LE(sample, 44 + i * 2);
}

const outputPath = path.join(__dirname, '../mobile/android/app/src/main/res/raw/siren.wav');
fs.writeFileSync(outputPath, buffer);
console.log('Successfully generated military siren audio file at:', outputPath);
