/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Global test settings
    globals: true,

    // Environment for DOM testing
    environment: 'jsdom',

    // Setup files run before each test file
    setupFiles: ['./vitest.setup.ts'],

    // Include patterns for test files
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.claude'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/engine/**/*.js',
        'src/TurkeyTrotDefense.jsx'
      ],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/test-utils/**',
        'src/main.jsx'
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 90,
          lines: 85,
          statements: 85
        }
      }
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Timeout for each test
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Max concurrent tests
    maxConcurrency: 5,

    // Fail on first error in CI
    bail: process.env.CI ? 1 : 0,

    // Watch mode excludes
    watchExclude: ['node_modules', 'dist'],

    // Mock reset between tests
    mockReset: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Clear mocks between tests
    clearMocks: true
  }
});
