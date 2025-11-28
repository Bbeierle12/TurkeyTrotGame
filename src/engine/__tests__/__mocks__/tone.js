/**
 * Tone.js Mock for Testing
 *
 * Provides mock implementations of Tone.js audio classes
 * to enable testing without Web Audio API.
 */

import { vi } from 'vitest';

// ============================================
// MOCK AUDIO CONTEXT
// ============================================
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  createGain: vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
};

// ============================================
// CORE TONE FUNCTIONS
// ============================================
export const start = vi.fn(() => Promise.resolve());
export const now = vi.fn(() => mockAudioContext.currentTime);
export const getContext = vi.fn(() => mockAudioContext);
export const setContext = vi.fn();

// Transport mock
export const Transport = {
  bpm: { value: 120 },
  state: 'stopped',
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  cancel: vi.fn(),
  position: '0:0:0',
  seconds: 0,
  schedule: vi.fn((callback, time) => 0),
  scheduleRepeat: vi.fn((callback, interval) => 0),
  clear: vi.fn()
};

// ============================================
// BASE CLASSES
// ============================================
class ToneAudioNode {
  constructor() {
    this._disposed = false;
  }

  connect(destination) {
    return destination;
  }

  disconnect() {
    return this;
  }

  toDestination() {
    return this;
  }

  dispose() {
    this._disposed = true;
    return this;
  }
}

// ============================================
// GAIN
// ============================================
export class Gain extends ToneAudioNode {
  constructor(gain = 1) {
    super();
    this.gain = {
      value: gain,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    };
  }
}

// ============================================
// SYNTHS
// ============================================
class BaseSynth extends ToneAudioNode {
  constructor(options = {}) {
    super();
    this.volume = { value: 0 };
    this.options = options;
  }

  triggerAttack(note, time, velocity) {
    return this;
  }

  triggerRelease(time) {
    return this;
  }

  triggerAttackRelease(note, duration, time, velocity) {
    return this;
  }
}

export class Synth extends BaseSynth {
  constructor(options) {
    super(options);
    this.oscillator = { type: options?.oscillator?.type || 'triangle' };
    this.envelope = options?.envelope || {};
  }
}

export class MonoSynth extends BaseSynth {
  constructor(options) {
    super(options);
    this.oscillator = { type: options?.oscillator?.type || 'sawtooth' };
    this.envelope = options?.envelope || {};
    this.filterEnvelope = options?.filterEnvelope || {};
  }
}

export class PolySynth extends ToneAudioNode {
  constructor(voice = Synth, options = {}) {
    super();
    this.volume = { value: 0 };
    this._voice = voice;
    this._options = options;
  }

  triggerAttack(notes, time, velocity) {
    return this;
  }

  triggerRelease(notes, time) {
    return this;
  }

  triggerAttackRelease(notes, duration, time, velocity) {
    return this;
  }

  releaseAll(time) {
    return this;
  }
}

export class MetalSynth extends BaseSynth {
  constructor(options) {
    super(options);
    this.frequency = options?.frequency || 200;
    this.harmonicity = options?.harmonicity || 5.1;
    this.modulationIndex = options?.modulationIndex || 16;
    this.resonance = options?.resonance || 2000;
    this.octaves = options?.octaves || 1.5;
  }
}

export class MembraneSynth extends BaseSynth {
  constructor(options) {
    super(options);
    this.pitchDecay = options?.pitchDecay || 0.05;
    this.octaves = options?.octaves || 6;
    this.oscillator = { type: options?.oscillator?.type || 'sine' };
  }
}

export class NoiseSynth extends ToneAudioNode {
  constructor(options = {}) {
    super();
    this.volume = { value: 0 };
    this.noise = { type: options?.noise?.type || 'white' };
    this.envelope = options?.envelope || {};
  }

  triggerAttack(time) {
    return this;
  }

  triggerRelease(time) {
    return this;
  }

  triggerAttackRelease(duration, time) {
    return this;
  }
}

// ============================================
// EFFECTS
// ============================================
export class Reverb extends ToneAudioNode {
  constructor(decay = 1.5) {
    super();
    this.decay = decay;
    this.wet = { value: 1 };
  }
}

export class Delay extends ToneAudioNode {
  constructor(delayTime = 0.25, feedback = 0.5) {
    super();
    this.delayTime = { value: delayTime };
    this.feedback = { value: feedback };
    this.wet = { value: 1 };
  }
}

export class Distortion extends ToneAudioNode {
  constructor(distortion = 0.4) {
    super();
    this.distortion = distortion;
    this.wet = { value: 1 };
  }
}

export class Filter extends ToneAudioNode {
  constructor(frequency = 350, type = 'lowpass') {
    super();
    this.frequency = { value: frequency };
    this.type = type;
    this.Q = { value: 1 };
  }
}

// ============================================
// LOOP
// ============================================
export class Loop extends ToneAudioNode {
  constructor(callback, interval = '4n') {
    super();
    this._callback = callback;
    this.interval = interval;
    this._started = false;
  }

  start(time) {
    this._started = true;
    return this;
  }

  stop(time) {
    this._started = false;
    return this;
  }

  cancel(time) {
    return this;
  }
}

// ============================================
// SEQUENCE
// ============================================
export class Sequence extends ToneAudioNode {
  constructor(callback, events, subdivision = '8n') {
    super();
    this._callback = callback;
    this.events = events;
    this.subdivision = subdivision;
    this._started = false;
  }

  start(time) {
    this._started = true;
    return this;
  }

  stop(time) {
    this._started = false;
    return this;
  }
}

// ============================================
// PATTERN
// ============================================
export class Pattern extends ToneAudioNode {
  constructor(callback, values, type = 'up') {
    super();
    this._callback = callback;
    this.values = values;
    this.pattern = type;
  }

  start(time) {
    return this;
  }

  stop(time) {
    return this;
  }
}

// ============================================
// PLAYER
// ============================================
export class Player extends ToneAudioNode {
  constructor(url, onload) {
    super();
    this.buffer = null;
    this.loop = false;
    this.autostart = false;
    this.volume = { value: 0 };

    // Simulate async loading
    if (onload) {
      setTimeout(() => onload(), 0);
    }
  }

  start(time) {
    return this;
  }

  stop(time) {
    return this;
  }

  seek(offset, time) {
    return this;
  }
}

// ============================================
// SAMPLER
// ============================================
export class Sampler extends ToneAudioNode {
  constructor(urls, onload) {
    super();
    this.volume = { value: 0 };
    this._urls = urls;

    if (onload) {
      setTimeout(() => onload(), 0);
    }
  }

  triggerAttack(note, time, velocity) {
    return this;
  }

  triggerRelease(note, time) {
    return this;
  }

  triggerAttackRelease(note, duration, time, velocity) {
    return this;
  }
}

// ============================================
// BUFFER
// ============================================
export class ToneBuffer {
  constructor(url, onload, onerror) {
    this.loaded = false;
    this.duration = 0;

    if (onload) {
      setTimeout(() => {
        this.loaded = true;
        this.duration = 1;
        onload(this);
      }, 0);
    }
  }

  static fromUrl(url) {
    return Promise.resolve(new ToneBuffer(url));
  }
}

// Buffer alias
export { ToneBuffer as Buffer };

// ============================================
// OSCILLATOR
// ============================================
export class Oscillator extends ToneAudioNode {
  constructor(frequency = 440, type = 'sine') {
    super();
    this.frequency = { value: frequency };
    this.type = type;
    this.volume = { value: 0 };
  }

  start(time) {
    return this;
  }

  stop(time) {
    return this;
  }
}

// ============================================
// NOISE
// ============================================
export class Noise extends ToneAudioNode {
  constructor(type = 'white') {
    super();
    this.type = type;
    this.volume = { value: 0 };
  }

  start(time) {
    return this;
  }

  stop(time) {
    return this;
  }
}

// ============================================
// ENVELOPE
// ============================================
export class Envelope extends ToneAudioNode {
  constructor(attack = 0.01, decay = 0.1, sustain = 0.5, release = 1) {
    super();
    this.attack = attack;
    this.decay = decay;
    this.sustain = sustain;
    this.release = release;
  }

  triggerAttack(time, velocity) {
    return this;
  }

  triggerRelease(time) {
    return this;
  }

  triggerAttackRelease(duration, time, velocity) {
    return this;
  }
}

// ============================================
// AMPLITUDE ENVELOPE
// ============================================
export class AmplitudeEnvelope extends Envelope {
  constructor(options = {}) {
    super(options.attack, options.decay, options.sustain, options.release);
  }
}

// ============================================
// LFO
// ============================================
export class LFO extends ToneAudioNode {
  constructor(frequency = 1, min = 0, max = 1) {
    super();
    this.frequency = { value: frequency };
    this.min = min;
    this.max = max;
    this.type = 'sine';
  }

  start(time) {
    return this;
  }

  stop(time) {
    return this;
  }
}

// ============================================
// CHANNEL
// ============================================
export class Channel extends ToneAudioNode {
  constructor(volume = 0, pan = 0) {
    super();
    this.volume = { value: volume };
    this.pan = { value: pan };
    this.mute = false;
    this.solo = false;
  }
}

// ============================================
// COMPRESSOR
// ============================================
export class Compressor extends ToneAudioNode {
  constructor(threshold = -24, ratio = 12) {
    super();
    this.threshold = { value: threshold };
    this.ratio = { value: ratio };
    this.attack = { value: 0.003 };
    this.release = { value: 0.25 };
    this.knee = { value: 30 };
  }
}

// ============================================
// LIMITER
// ============================================
export class Limiter extends ToneAudioNode {
  constructor(threshold = -6) {
    super();
    this.threshold = { value: threshold };
  }
}

// ============================================
// EQ3
// ============================================
export class EQ3 extends ToneAudioNode {
  constructor(low = 0, mid = 0, high = 0) {
    super();
    this.low = { value: low };
    this.mid = { value: mid };
    this.high = { value: high };
    this.lowFrequency = { value: 400 };
    this.highFrequency = { value: 2500 };
  }
}

// ============================================
// PANNER
// ============================================
export class Panner extends ToneAudioNode {
  constructor(pan = 0) {
    super();
    this.pan = { value: pan };
  }
}

// ============================================
// VOLUME
// ============================================
export class Volume extends ToneAudioNode {
  constructor(volume = 0) {
    super();
    this.volume = { value: volume };
    this.mute = false;
  }
}

// ============================================
// TIME UTILITIES
// ============================================
export class Time {
  constructor(value) {
    this._value = value;
  }

  toSeconds() {
    if (typeof this._value === 'number') {
      return this._value;
    }
    // Simplified notation parsing
    if (typeof this._value === 'string') {
      if (this._value.includes('n')) {
        const n = parseInt(this._value);
        return (60 / Transport.bpm.value) * (4 / n);
      }
    }
    return 0;
  }

  static toSeconds(value) {
    return new Time(value).toSeconds();
  }
}

// ============================================
// FREQUENCY
// ============================================
export class Frequency {
  constructor(value) {
    this._value = value;
  }

  toFrequency() {
    if (typeof this._value === 'number') {
      return this._value;
    }
    // Simplified note to frequency
    const noteMap = {
      C: 261.63,
      D: 293.66,
      E: 329.63,
      F: 349.23,
      G: 392.0,
      A: 440.0,
      B: 493.88
    };
    if (typeof this._value === 'string' && this._value.length >= 2) {
      const note = this._value[0].toUpperCase();
      const octave = parseInt(this._value.slice(-1)) || 4;
      const base = noteMap[note] || 440;
      return base * Math.pow(2, octave - 4);
    }
    return 440;
  }

  static toFrequency(value) {
    return new Frequency(value).toFrequency();
  }
}

// ============================================
// CONTEXT
// ============================================
export class Context {
  constructor() {
    this.rawContext = mockAudioContext;
    this.lookAhead = 0.1;
    this.latencyHint = 'interactive';
  }

  resume() {
    return Promise.resolve();
  }
}

// ============================================
// DESTINATION
// ============================================
export const Destination = new Gain(1);
export const destination = Destination;

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  start,
  now,
  getContext,
  setContext,
  Transport,
  Gain,
  Synth,
  MonoSynth,
  PolySynth,
  MetalSynth,
  MembraneSynth,
  NoiseSynth,
  Reverb,
  Delay,
  Distortion,
  Filter,
  Loop,
  Sequence,
  Pattern,
  Player,
  Sampler,
  Buffer: ToneBuffer,
  Oscillator,
  Noise,
  Envelope,
  AmplitudeEnvelope,
  LFO,
  Channel,
  Compressor,
  Limiter,
  EQ3,
  Panner,
  Volume,
  Time,
  Frequency,
  Context,
  Destination,
  destination
};
