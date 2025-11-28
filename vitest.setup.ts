/**
 * Vitest Global Setup
 *
 * This file runs before each test file and sets up:
 * - DOM testing environment extensions
 * - Global mocks for Three.js and Tone.js
 * - localStorage mock
 * - Performance API mock
 * - Custom matchers
 */

import { expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// ============================================
// GLOBAL MOCKS
// ============================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock performance.now() for consistent timing in tests
const performanceMock = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn()
};

Object.defineProperty(globalThis, 'performance', {
  value: performanceMock,
  writable: true
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
});

globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id);
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// ============================================
// CUSTOM MATCHERS
// ============================================

expect.extend({
  /**
   * Check if a Vector3-like object is approximately equal to another
   * @example expect(vec).toBeNearVector3({ x: 1, y: 2, z: 3 }, 0.001)
   */
  toBeNearVector3(
    received: { x: number; y: number; z: number },
    expected: { x: number; y: number; z: number },
    tolerance: number = 0.0001
  ) {
    const pass =
      Math.abs(received.x - expected.x) <= tolerance &&
      Math.abs(received.y - expected.y) <= tolerance &&
      Math.abs(received.z - expected.z) <= tolerance;

    return {
      pass,
      message: () =>
        pass
          ? `Expected Vector3(${received.x}, ${received.y}, ${received.z}) not to be near Vector3(${expected.x}, ${expected.y}, ${expected.z}) within ${tolerance}`
          : `Expected Vector3(${received.x}, ${received.y}, ${received.z}) to be near Vector3(${expected.x}, ${expected.y}, ${expected.z}) within ${tolerance}`
    };
  },

  /**
   * Check if a number is within a range (inclusive)
   * @example expect(5).toBeInRange(1, 10)
   */
  toBeInRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be in range [${min}, ${max}]`
          : `Expected ${received} to be in range [${min}, ${max}]`
    };
  },

  /**
   * Check if an object has a specific damage state
   * @example expect(damageable).toHaveDamageState('damaged')
   */
  toHaveDamageState(
    received: { damageState?: string },
    expectedState: string
  ) {
    const pass = received?.damageState === expectedState;
    return {
      pass,
      message: () =>
        pass
          ? `Expected damage state not to be "${expectedState}"`
          : `Expected damage state to be "${expectedState}", but got "${received?.damageState}"`
    };
  },

  /**
   * Check if a value is a positive number
   * @example expect(5).toBePositive()
   */
  toBePositive(received: number) {
    const pass = typeof received === 'number' && received > 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be positive`
          : `Expected ${received} to be positive`
    };
  },

  /**
   * Check if a value is a non-negative number
   * @example expect(0).toBeNonNegative()
   */
  toBeNonNegative(received: number) {
    const pass = typeof received === 'number' && received >= 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be non-negative`
          : `Expected ${received} to be non-negative`
    };
  },

  /**
   * Check if a value is an integer
   * @example expect(5).toBeInteger()
   */
  toBeInteger(received: number) {
    const pass = Number.isInteger(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be an integer`
          : `Expected ${received} to be an integer`
    };
  }
});

// ============================================
// TYPE DECLARATIONS FOR CUSTOM MATCHERS
// ============================================

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeNearVector3(
      expected: { x: number; y: number; z: number },
      tolerance?: number
    ): T;
    toBeInRange(min: number, max: number): T;
    toHaveDamageState(state: string): T;
    toBePositive(): T;
    toBeNonNegative(): T;
    toBeInteger(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeNearVector3(
      expected: { x: number; y: number; z: number },
      tolerance?: number
    ): unknown;
    toBeInRange(min: number, max: number): unknown;
    toHaveDamageState(state: string): unknown;
    toBePositive(): unknown;
    toBeNonNegative(): unknown;
    toBeInteger(): unknown;
  }
}

// ============================================
// TEST LIFECYCLE HOOKS
// ============================================

beforeEach(() => {
  // Reset localStorage before each test
  localStorageMock.clear();

  // Reset performance.now to return consistent values
  let time = 0;
  performanceMock.now.mockImplementation(() => {
    time += 16.67; // Simulate ~60fps
    return time;
  });
});

afterEach(() => {
  // Clean up any timers
  vi.clearAllTimers();
});

// ============================================
// CONSOLE SUPPRESSION FOR CLEAN TEST OUTPUT
// ============================================

// Suppress console.warn for expected warnings during tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Suppress specific expected warnings
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Audio init failed') ||
      message.includes('Failed to load save data'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
