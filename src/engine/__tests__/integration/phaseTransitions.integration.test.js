/**
 * Phase Transitions Integration Tests
 *
 * These tests verify that the game phase state machine works correctly
 * and that UI wave labels derive from a single source of truth.
 *
 * TDD: These tests are written FIRST and will FAIL until the implementation
 * is complete. They document the expected behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine, GamePhase } from '../../GameEngine.js';

describe('Phase Transitions Integration', () => {
  let engine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new GameEngine();
    // Mock scene components
    engine.scene = { add: vi.fn(), remove: vi.fn() };
    engine.zombieGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.projectileGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.turretGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.playerGroup = { position: { copy: vi.fn(), set: vi.fn() } };
    engine.camera = { position: { set: vi.fn(), copy: vi.fn() }, lookAt: vi.fn() };
    engine.renderer = { dispose: vi.fn() };
    engine.turretPreview = {
      visible: false,
      userData: { rangeIndicator: { geometry: { dispose: vi.fn() } } }
    };
    engine._buildHouse = vi.fn();
    engine._updatePlayer = vi.fn();
    engine._updateZombies = vi.fn();
    engine._updateProjectiles = vi.fn();
    engine._updateTurrets = vi.fn();
    engine._updateSpawning = vi.fn();
    engine._updateAbilities = vi.fn();
    engine._updateDamageSystem = vi.fn();
    engine._updateStats = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    engine = null;
  });

  describe('GamePhase enum exists', () => {
    it('should export GamePhase enum with all expected states', () => {
      expect(GamePhase).toBeDefined();
      expect(GamePhase.READY).toBe('READY');
      expect(GamePhase.WAVE_PREP).toBe('WAVE_PREP');
      expect(GamePhase.WAVE_ACTIVE).toBe('WAVE_ACTIVE');
      expect(GamePhase.WAVE_COMPLETE).toBe('WAVE_COMPLETE');
      expect(GamePhase.GAME_OVER).toBe('GAME_OVER');
    });
  });

  describe('Phase State Machine', () => {
    it('should start in READY phase before game begins', () => {
      expect(engine.phase).toBe(GamePhase.READY);
    });

    it('should transition to WAVE_PREP after startGame()', () => {
      engine.startGame(false);
      expect(engine.phase).toBe(GamePhase.WAVE_PREP);
    });

    it('should transition to WAVE_ACTIVE after startWave()', () => {
      engine.startGame(false);
      engine.startWave();
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
    });

    it('should transition to WAVE_COMPLETE when all enemies killed', () => {
      engine.startGame(false);
      engine.startWave();

      // Simulate all enemies spawned and killed
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];

      engine._updateGame(0.016, 1);
      expect(engine.phase).toBe(GamePhase.WAVE_COMPLETE);
    });

    it('should transition back to WAVE_PREP when starting next wave', () => {
      engine.startGame(false);
      engine.startWave();
      // Manually complete wave
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];
      engine._updateGame(0.016, 1);

      expect(engine.phase).toBe(GamePhase.WAVE_COMPLETE);
      // Now start next wave
      engine.startWave();
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
    });

    it('should transition to GAME_OVER when player dies', () => {
      engine.startGame(false);
      engine.startWave();
      engine.state.player.health = 0;

      engine._checkGameOver();
      expect(engine.phase).toBe(GamePhase.GAME_OVER);
    });

    it('should transition to GAME_OVER when house is destroyed', () => {
      engine.startGame(false);
      engine.startWave();
      engine.state.barn.health = 0;

      engine._checkGameOver();
      expect(engine.phase).toBe(GamePhase.GAME_OVER);
    });
  });

  describe('Wave Number Source of Truth', () => {
    it('should have activeWaveNumber that is always 1-based during wave', () => {
      engine.startGame(false);
      expect(engine.activeWaveNumber).toBe(0); // No active wave yet

      engine.startWave();
      expect(engine.activeWaveNumber).toBe(1);
    });

    it('should have upcomingWaveNumber that shows next wave to start', () => {
      engine.startGame(false);
      expect(engine.upcomingWaveNumber).toBe(1); // First wave will be 1

      engine.startWave();
      expect(engine.upcomingWaveNumber).toBe(2); // After wave 1 starts, next is 2
    });

    it('should maintain consistency between wave numbers', () => {
      engine.startGame(false);

      // Before any wave: activeWaveNumber=0, upcomingWaveNumber=1
      expect(engine.activeWaveNumber).toBe(0);
      expect(engine.upcomingWaveNumber).toBe(1);

      engine.startWave();
      // During wave 1: activeWaveNumber=1, upcomingWaveNumber=2
      expect(engine.activeWaveNumber).toBe(1);
      expect(engine.upcomingWaveNumber).toBe(2);

      // Complete wave 1
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];
      engine._updateGame(0.016, 1);

      // After wave 1: activeWaveNumber=1 (last played), upcomingWaveNumber=2
      expect(engine.activeWaveNumber).toBe(1);
      expect(engine.upcomingWaveNumber).toBe(2);

      engine.startWave();
      // During wave 2: activeWaveNumber=2, upcomingWaveNumber=3
      expect(engine.activeWaveNumber).toBe(2);
      expect(engine.upcomingWaveNumber).toBe(3);
    });
  });

  describe('Illegal Phase Transitions', () => {
    it('should NOT allow startWave() from READY phase', () => {
      expect(engine.phase).toBe(GamePhase.READY);
      engine.startWave();
      // Should remain in READY phase
      expect(engine.phase).toBe(GamePhase.READY);
      expect(engine.activeWaveNumber).toBe(0);
    });

    it('should NOT allow startWave() from WAVE_ACTIVE phase', () => {
      engine.startGame(false);
      engine.startWave();
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
      const wave = engine.activeWaveNumber;

      engine.startWave(); // Try to start again
      // Should remain in WAVE_ACTIVE with same wave
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
      expect(engine.activeWaveNumber).toBe(wave);
    });

    it('should NOT allow startWave() from GAME_OVER phase', () => {
      engine.startGame(false);
      engine.startWave();
      engine.state.player.health = 0;
      engine._checkGameOver();
      expect(engine.phase).toBe(GamePhase.GAME_OVER);

      engine.startWave();
      expect(engine.phase).toBe(GamePhase.GAME_OVER);
    });

    it('should NOT allow startGame() from WAVE_ACTIVE phase', () => {
      engine.startGame(false);
      engine.startWave();
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);

      engine.startGame(false);
      // Should remain in WAVE_ACTIVE (must reset first)
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
    });
  });

  describe('Event Emission for Phase Changes', () => {
    it('should emit onPhaseChange when phase transitions', () => {
      const callback = vi.fn();
      engine.on('onPhaseChange', callback);

      engine.startGame(false);
      expect(callback).toHaveBeenCalledWith({
        from: GamePhase.READY,
        to: GamePhase.WAVE_PREP,
        activeWaveNumber: 0,
        upcomingWaveNumber: 1
      });
    });

    it('should emit onPhaseChange when wave starts', () => {
      const callback = vi.fn();
      engine.on('onPhaseChange', callback);

      engine.startGame(false);
      callback.mockClear();

      engine.startWave();
      expect(callback).toHaveBeenCalledWith({
        from: GamePhase.WAVE_PREP,
        to: GamePhase.WAVE_ACTIVE,
        activeWaveNumber: 1,
        upcomingWaveNumber: 2
      });
    });

    it('should emit onPhaseChange when wave completes', () => {
      const callback = vi.fn();
      engine.on('onPhaseChange', callback);

      engine.startGame(false);
      engine.startWave();
      callback.mockClear();

      // Complete wave
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];
      engine._updateGame(0.016, 1);

      expect(callback).toHaveBeenCalledWith({
        from: GamePhase.WAVE_ACTIVE,
        to: GamePhase.WAVE_COMPLETE,
        activeWaveNumber: 1,
        upcomingWaveNumber: 2
      });
    });
  });

  describe('Snapshot for UI Consistency', () => {
    it('should provide getSnapshot() with all UI-relevant state', () => {
      engine.startGame(false);
      engine.startWave();

      const snapshot = engine.getSnapshot();

      expect(snapshot).toMatchObject({
        phase: GamePhase.WAVE_ACTIVE,
        activeWaveNumber: 1,
        upcomingWaveNumber: 2,
        isWaveActive: true,
        isWaitingForWave: false,
        canStartWave: false
      });
    });

    it('should show canStartWave=true only during WAVE_PREP or WAVE_COMPLETE', () => {
      engine.startGame(false);
      expect(engine.getSnapshot().canStartWave).toBe(true);

      engine.startWave();
      expect(engine.getSnapshot().canStartWave).toBe(false);

      // Complete wave
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];
      engine._updateGame(0.016, 1);

      expect(engine.getSnapshot().canStartWave).toBe(true);
    });

    it('should have startWaveButtonLabel match upcomingWaveNumber', () => {
      engine.startGame(false);
      expect(engine.getSnapshot().startWaveButtonLabel).toBe('Start Wave 1');

      engine.startWave();
      // Complete wave
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.zombies = [];
      engine._updateGame(0.016, 1);

      expect(engine.getSnapshot().startWaveButtonLabel).toBe('Start Wave 2');
    });
  });

  describe('Wave Desync Prevention', () => {
    it('should never have UI show different wave than engine source', () => {
      engine.startGame(false);

      for (let wave = 1; wave <= 5; wave++) {
        const snapshotBefore = engine.getSnapshot();
        expect(snapshotBefore.upcomingWaveNumber).toBe(wave);
        expect(snapshotBefore.startWaveButtonLabel).toBe(`Start Wave ${wave}`);

        engine.startWave();
        vi.advanceTimersByTime(2000);

        const snapshotDuring = engine.getSnapshot();
        expect(snapshotDuring.activeWaveNumber).toBe(wave);
        expect(snapshotDuring.phase).toBe(GamePhase.WAVE_ACTIVE);

        // Complete wave
        engine.state.toSpawn = 0;
        engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
        engine.state.zombies = [];
        engine._updateGame(0.016, wave);

        const snapshotAfter = engine.getSnapshot();
        expect(snapshotAfter.activeWaveNumber).toBe(wave);
        expect(snapshotAfter.upcomingWaveNumber).toBe(wave + 1);
      }
    });

    it('should prevent double-counting when startWave called rapidly', () => {
      engine.startGame(false);

      // Rapidly call startWave multiple times
      engine.startWave();
      engine.startWave();
      engine.startWave();

      // Should only increment once
      expect(engine.activeWaveNumber).toBe(1);
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
    });

    it('should handle edge case of starting wave during spawn completion', () => {
      engine.startGame(false);
      engine.startWave();

      // Set up near-completion state
      engine.state.toSpawn = 1;
      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave - 1;
      engine.state.zombies = [{ hp: 1 }];

      // Try to start wave (should be blocked)
      engine.startWave();
      expect(engine.activeWaveNumber).toBe(1);
      expect(engine.phase).toBe(GamePhase.WAVE_ACTIVE);
    });
  });
});
