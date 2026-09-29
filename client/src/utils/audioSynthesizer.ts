/**
 * Lightweight in-browser royalty-free audio generator using Web Audio API.
 * Produces soft, romantic ambient harmonic loops for couple moments,
 * ensuring zero external network dependency and zero copyright violations.
 */

export function generateRomanticWav(type: 'acoustic' | 'piano' | 'lofi' | 'celebration'): string {
  const sampleRate = 22050;
  const duration = type === 'celebration' ? 4 : 12; // seconds
  const totalSamples = sampleRate * duration;
  const buffer = new Float32Array(totalSamples);

  // Chords progression based on type (frequencies in Hz)
  const progressions: Record<string, number[][]> = {
    acoustic: [
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
    ],
    piano: [
      [293.66, 369.99, 440.0], // D
      [220.0, 277.18, 329.63], // A
      [246.94, 293.66, 369.99], // Bm
      [196.0, 246.94, 293.66], // G
    ],
    lofi: [
      [261.63, 311.13, 392.0, 466.16], // Cm7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ],
    celebration: [
      [261.63, 329.63, 392.0, 523.25], // C maj
      [329.63, 392.0, 523.25, 659.25], // E maj
      [392.0, 493.88, 587.33, 783.99], // G maj
      [523.25, 659.25, 783.99, 1046.5], // C fanfare
    ],
  };

  const chords = progressions[type] || progressions.acoustic;
  const chordDuration = duration / chords.length;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.min(Math.floor(t / chordDuration), chords.length - 1);
    const chord = chords[chordIndex];
    const chordTime = t % chordDuration;

    let sample = 0;
    chord.forEach((freq, noteIdx) => {
      // Gentle pluck/decay envelope
      const decay = Math.exp(-chordTime * (type === 'piano' ? 1.2 : 0.8));
      // Base tone + warm octave overtone
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * (freq * 2) * t) * 0.2;
      // Arpeggio rhythm effect
      const arpeggio = (Math.sin(2 * Math.PI * (noteIdx + 1) * 2 * chordTime) + 1) * 0.5;
      sample += tone * decay * (0.6 + 0.4 * arpeggio);
    });

    // Master fade in and fade out
    let masterEnv = 1;
    if (t < 0.8) masterEnv = t / 0.8;
    if (t > duration - 0.8) masterEnv = (duration - t) / 0.8;

    buffer[i] = sample * 0.25 * masterEnv;
  }

  // Encode Float32Array to 16-bit PCM WAV Data URL
  return bufferToWavDataUrl(buffer, sampleRate);
}

function bufferToWavDataUrl(samples: Float32Array, sampleRate: number): string {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
