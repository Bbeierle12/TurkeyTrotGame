import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../../GameEngine.js';

describe('Wave Flow Integration', () => {
  let engine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new GameEngine();
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

  it('advances through waves 1-3 without desync', () => {
    engine.startGame(false);
    expect(engine.state.activeWaveNumber).toBe(0);
    expect(engine.state.waveComplete).toBe(true);

    for (let wave = 1; wave <= 3; wave++) {
      engine.startWave();
      vi.advanceTimersByTime(2000);

      expect(engine.state.activeWaveNumber).toBe(wave);
      expect(engine.state.waveComplete).toBe(false);

      engine.state.totalSpawnedThisWave = engine.state.expectedThisWave;
      engine.state.toSpawn = 0;
      engine.state.zombies = [];

      engine._updateGame(0.016, wave);
      expect(engine.state.waveComplete).toBe(true);
    }
  });
});
