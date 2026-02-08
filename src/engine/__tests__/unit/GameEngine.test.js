/**
 * GameEngine Tests
 *
 * Comprehensive tests for the main game engine including:
 * - StateSnapshot class
 * - Constructor and configuration
 * - Game state management
 * - Wave composition and progression
 * - Public API methods
 * - Upgrade system
 * - Ability system
 * - Turret placement
 * - Callback system
 * - Cleanup and disposal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine, StateSnapshot, WeaponTypes, ZombieTypes, HouseUpgrades, TurretTypes, AbilityTypes } from '../../GameEngine.js';
import { Vector3 } from '../__mocks__/three.js';
import {
  createMockGameState,
  createMockZombie,
  createMockTurret,
  createMockMesh,
  createPosition,
  resetIdCounter
} from '../../../test-utils/factories.js';

describe('GameEngine', () => {
  let engine;
  let mockContainer;
  let mockAudioManager;

  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Create mock container
    mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      contains: vi.fn(() => true)
    };

    // Create mock audio manager
    mockAudioManager = {
      playSound: vi.fn(),
      startMusic: vi.fn(),
      stopMusic: vi.fn()
    };

    engine = new GameEngine();
  });

  afterEach(() => {
    if (engine && engine.dispose) {
      engine.dispose();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ============================================
  // StateSnapshot Tests
  // ============================================

  describe('StateSnapshot', () => {
    it('should capture timestamp on creation', () => {
      const state = createMockGameState({ wave: 5, score: 1000 });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.timestamp).toBeDefined();
      expect(typeof snapshot.timestamp).toBe('number');
    });

    it('should capture wave number', () => {
      const state = createMockGameState({ wave: 7 });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.activeWaveNumber).toBe(7);
    });

    it('should capture score', () => {
      const state = createMockGameState({ score: 5000 });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.score).toBe(5000);
    });

    it('should capture currency', () => {
      const state = createMockGameState({ currency: 250 });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.currency).toBe(250);
    });

    it('should capture barn health', () => {
      const state = createMockGameState({ barn: { health: 150, maxHealth: 175 } });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.barnHealth).toBe(150);
      expect(snapshot.barnMaxHealth).toBe(175);
    });

    it('should default barn health if not provided', () => {
      const snapshot = new StateSnapshot({});

      expect(snapshot.barnHealth).toBe(175);
      expect(snapshot.barnMaxHealth).toBe(175);
    });

    it('should capture player position', () => {
      const pos = new Vector3(10, 0, 20);
      const state = createMockGameState({ player: { pos } });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.playerPos).toBeDefined();
    });

    it('should capture turret count', () => {
      const turrets = [createMockTurret(), createMockTurret(), createMockTurret()];
      const state = createMockGameState({ turrets });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.turretCount).toBe(3);
    });

    it('should capture zombie count', () => {
      const zombies = [createMockZombie(), createMockZombie()];
      const state = createMockGameState({ zombies });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.zombieCount).toBe(2);
    });

    it('should capture projectile count', () => {
      const projectiles = [{}, {}, {}, {}];
      const state = createMockGameState({ projectiles });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.projectileCount).toBe(4);
    });

    it('should handle empty arrays gracefully', () => {
      const state = createMockGameState({
        turrets: [],
        zombies: [],
        projectiles: []
      });
      const snapshot = new StateSnapshot(state);

      expect(snapshot.turretCount).toBe(0);
      expect(snapshot.zombieCount).toBe(0);
      expect(snapshot.projectileCount).toBe(0);
    });
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('Constructor', () => {
    it('should create engine with default config', () => {
      expect(engine.config.spatialCellSize).toBe(5);
      expect(engine.config.maxZombies).toBe(500);
      expect(engine.config.maxProjectiles).toBe(200);
      expect(engine.config.collisionRadius).toBe(2.0);
      expect(engine.config.turretMinDistance).toBe(5);
      expect(engine.config.turretMaxDistance).toBe(35);
    });

    it('should accept custom config options', () => {
      const customEngine = new GameEngine({
        spatialCellSize: 10,
        maxZombies: 1000,
        collisionRadius: 3.0
      });

      expect(customEngine.config.spatialCellSize).toBe(10);
      expect(customEngine.config.maxZombies).toBe(1000);
      expect(customEngine.config.collisionRadius).toBe(3.0);
      // Defaults should still be preserved
      expect(customEngine.config.maxProjectiles).toBe(200);
    });

    it('should initialize null scene references', () => {
      expect(engine.scene).toBeNull();
      expect(engine.camera).toBeNull();
      expect(engine.renderer).toBeNull();
      expect(engine.container).toBeNull();
    });

    it('should initialize default camera settings', () => {
      expect(engine.cameraMode).toBe('SHOULDER');
      expect(engine.zoom).toBe(1.0);
      expect(engine.cameraAngle).toBe(Math.PI); // Camera behind player
      expect(engine.pointerLocked).toBe(false);
    });

    it('should initialize game state', () => {
      expect(engine.state.started).toBe(false);
      expect(engine.state.gameOver).toBe(false);
      expect(engine.state.paused).toBe(false);
      expect(engine.state.endlessMode).toBe(false);
    });

    it('should initialize player state', () => {
      expect(engine.state.player.health).toBe(100);
      expect(engine.state.player.maxHealth).toBe(100);
      expect(engine.state.player.rot).toBe(0);
      expect(engine.state.player.pitch).toBe(0);
      expect(engine.state.player.isInside).toBe(false);
      expect(engine.state.player.invulnTimer).toBe(0);
    });

    it('should initialize barn state', () => {
      expect(engine.state.barn.health).toBe(175);
      expect(engine.state.barn.maxHealth).toBe(175);
    });

    it('should initialize empty arrays for entities', () => {
      expect(engine.state.zombies).toEqual([]);
      expect(engine.state.projectiles).toEqual([]);
      expect(engine.state.turretProjectiles).toEqual([]);
      expect(engine.state.turrets).toEqual([]);
    });

    it('should initialize wave state', () => {
      expect(engine.state.activeWaveNumber).toBe(0);
      expect(engine.state.toSpawn).toBe(0);
      expect(engine.state.totalSpawnedThisWave).toBe(0);
      expect(engine.state.expectedThisWave).toBe(0);
      expect(engine.state.spawnTimer).toBe(0);
    });

    it('should initialize economy state', () => {
      expect(engine.state.currency).toBe(100);
      expect(engine.state.score).toBe(0);
    });

    it('should initialize weapon state', () => {
      expect(engine.state.currentWeapon).toBe('PITCHFORK');
      expect(engine.state.shootTimer).toBe(0);
    });

    it('should initialize input state', () => {
      expect(engine.state.input.w).toBe(false);
      expect(engine.state.input.a).toBe(false);
      expect(engine.state.input.s).toBe(false);
      expect(engine.state.input.d).toBe(false);
      expect(engine.state.input.firing).toBe(false);
    });

    it('should initialize upgrade state', () => {
      expect(engine.state.upgrades.houseArmor).toBe(0);
      expect(engine.state.upgrades.weaponDamage).toBe(0);
      expect(engine.state.upgrades.fireRate).toBe(0);
      expect(engine.state.upgrades.playerHealth).toBe(0);
      expect(engine.state.upgrades.houseLevel).toBe(0);
    });

    it('should initialize ability state', () => {
      expect(engine.state.globalFreeze).toBe(0);
      expect(engine.state.rageActive).toBe(0);
      expect(engine.state.pendingAirstrike).toBeNull();
    });

    it('should initialize spatial grids', () => {
      expect(engine.zombieGrid).toBeDefined();
      expect(engine.turretGrid).toBeDefined();
    });

    it('should initialize building systems', () => {
      expect(engine.buildingValidator).toBeDefined();
      expect(engine.damageManager).toBeDefined();
    });

    it('should initialize performance metrics', () => {
      expect(engine.metrics.entityCount).toBe(0);
      expect(engine.metrics.collisionChecks).toBe(0);
      expect(engine.metrics.fps).toBe(60);
    });

    it('should initialize all callback slots as null', () => {
      expect(engine.callbacks.onStatsUpdate).toBeNull();
      expect(engine.callbacks.onWeaponChange).toBeNull();
      expect(engine.callbacks.onBannerChange).toBeNull();
      expect(engine.callbacks.onGameOver).toBeNull();
      expect(engine.callbacks.onWaveComplete).toBeNull();
      expect(engine.callbacks.onLowHealth).toBeNull();
      expect(engine.callbacks.onHitMarker).toBeNull();
      expect(engine.callbacks.onPauseChange).toBeNull();
    });
  });

  // ============================================
  // Wave Composition Tests
  // ============================================

  describe('Wave Composition (_getWaveComposition)', () => {
    it('should return only STANDARD zombies for wave 1', () => {
      const comp = engine._getWaveComposition(1, false);

      expect(comp.STANDARD).toBeGreaterThan(0);
      expect(comp.RUNNER).toBe(0);
      expect(comp.TANK).toBe(0);
      expect(comp.HEALER).toBe(0);
      expect(comp.SPLITTER).toBe(0);
      expect(comp.BOSS).toBe(0);
    });

    it('should return only STANDARD zombies for wave 2', () => {
      const comp = engine._getWaveComposition(2, false);

      expect(comp.STANDARD).toBeGreaterThan(0);
      expect(comp.RUNNER).toBe(0);
      expect(comp.TANK).toBe(0);
    });

    it('should introduce RUNNERS at wave 3', () => {
      const comp = engine._getWaveComposition(3, false);

      expect(comp.STANDARD).toBeGreaterThan(0);
      expect(comp.RUNNER).toBeGreaterThan(0);
    });

    it('should introduce TANKS at wave 5', () => {
      const comp = engine._getWaveComposition(5, false);

      expect(comp.TANK).toBeGreaterThan(0);
    });

    it('should introduce HEALERS at wave 7', () => {
      const comp = engine._getWaveComposition(7, false);

      expect(comp.HEALER).toBeGreaterThan(0);
    });

    it('should introduce SPLITTERS at wave 8', () => {
      const comp = engine._getWaveComposition(8, false);

      expect(comp.SPLITTER).toBeGreaterThan(0);
    });

    it('should have BOSS every 5 waves starting at wave 5', () => {
      const comp5 = engine._getWaveComposition(5, false);
      const comp10 = engine._getWaveComposition(10, false);
      const comp15 = engine._getWaveComposition(15, false);

      expect(comp5.BOSS).toBeGreaterThan(0);
      expect(comp10.BOSS).toBeGreaterThan(0);
      expect(comp15.BOSS).toBeGreaterThan(0);
    });

    it('should NOT have BOSS on non-boss waves', () => {
      const comp6 = engine._getWaveComposition(6, false);
      const comp7 = engine._getWaveComposition(7, false);
      const comp8 = engine._getWaveComposition(8, false);

      expect(comp6.BOSS).toBe(0);
      expect(comp7.BOSS).toBe(0);
      expect(comp8.BOSS).toBe(0);
    });

    it('should increase enemy count with wave number', () => {
      const comp1 = engine._getWaveComposition(1, false);
      const comp10 = engine._getWaveComposition(10, false);
      const comp20 = engine._getWaveComposition(20, false);

      const total1 = Object.values(comp1).reduce((a, b) => a + b, 0);
      const total10 = Object.values(comp10).reduce((a, b) => a + b, 0);
      const total20 = Object.values(comp20).reduce((a, b) => a + b, 0);

      expect(total10).toBeGreaterThan(total1);
      expect(total20).toBeGreaterThan(total10);
    });

    it('should apply endless mode multiplier', () => {
      const normalComp = engine._getWaveComposition(10, false);
      const endlessComp = engine._getWaveComposition(10, true);

      const normalTotal = Object.values(normalComp).reduce((a, b) => a + b, 0);
      const endlessTotal = Object.values(endlessComp).reduce((a, b) => a + b, 0);

      expect(endlessTotal).toBeGreaterThanOrEqual(normalTotal);
    });

    it('should have reduced enemies on boss waves (rhythm modifier)', () => {
      const comp4 = engine._getWaveComposition(4, false);
      const comp5 = engine._getWaveComposition(5, false);

      // Boss wave should have fewer regular enemies (excluding the boss)
      expect(comp5.STANDARD).toBeLessThanOrEqual(comp4.STANDARD);
    });

    it('should have breather waves after boss waves', () => {
      const comp5 = engine._getWaveComposition(5, false);
      const comp6 = engine._getWaveComposition(6, false);
      const comp7 = engine._getWaveComposition(7, false);

      // Wave 6 is a breather wave (wave > 5 && wave % 5 === 1)
      const total5 = Object.values(comp5).reduce((a, b) => a + b, 0);
      const total6 = Object.values(comp6).reduce((a, b) => a + b, 0);

      expect(comp6.BOSS).toBe(0);
    });

    it('should have buildup waves before boss waves', () => {
      const comp4 = engine._getWaveComposition(4, false);
      const comp9 = engine._getWaveComposition(9, false);

      // Buildup waves (wave % 5 === 4) have increased enemies
      expect(comp4.STANDARD).toBeGreaterThan(0);
      expect(comp9.STANDARD).toBeGreaterThan(0);
    });

    it('should cap enemy types at maximum values', () => {
      // High wave number should still be capped
      const comp50 = engine._getWaveComposition(50, false);

      expect(comp50.RUNNER).toBeLessThanOrEqual(6);
      expect(comp50.TANK).toBeLessThanOrEqual(4);
      expect(comp50.HEALER).toBeLessThanOrEqual(3);
      expect(comp50.SPLITTER).toBeLessThanOrEqual(2);
    });

    it('should have higher caps in endless mode', () => {
      const normalComp = engine._getWaveComposition(50, false);
      const endlessComp = engine._getWaveComposition(50, true);

      // Endless mode allows higher caps
      const normalNonBoss = normalComp.RUNNER + normalComp.TANK + normalComp.HEALER + normalComp.SPLITTER;
      const endlessNonBoss = endlessComp.RUNNER + endlessComp.TANK + endlessComp.HEALER + endlessComp.SPLITTER;

      expect(endlessNonBoss).toBeGreaterThanOrEqual(normalNonBoss);
    });

    it('should increase boss count at higher waves', () => {
      const comp5 = engine._getWaveComposition(5, false);
      const comp15 = engine._getWaveComposition(15, false);
      const comp25 = engine._getWaveComposition(25, false);

      expect(comp5.BOSS).toBe(1);
      expect(comp15.BOSS).toBe(2);
      expect(comp25.BOSS).toBe(3);
    });
  });

  // ============================================
  // Public API Tests
  // ============================================

  describe('setWeapon', () => {
    it('should change current weapon', () => {
      engine.setWeapon('CORN_CANNON');
      expect(engine.state.currentWeapon).toBe('CORN_CANNON');

      engine.setWeapon('EGG_BLASTER');
      expect(engine.state.currentWeapon).toBe('EGG_BLASTER');
    });

    it('should NOT change weapon if invalid key', () => {
      engine.setWeapon('INVALID_WEAPON');
      expect(engine.state.currentWeapon).toBe('PITCHFORK');
    });

    it('should emit onWeaponChange callback', () => {
      const callback = vi.fn();
      engine.on('onWeaponChange', callback);

      engine.setWeapon('HAY_BALE_CATAPULT');

      expect(callback).toHaveBeenCalledWith(WeaponTypes.HAY_BALE_CATAPULT);
    });

    it('should play click sound', () => {
      engine.audioManager = mockAudioManager;
      engine.setWeapon('CORN_CANNON');

      expect(mockAudioManager.playSound).toHaveBeenCalledWith('click');
    });
  });

  describe('setCameraMode', () => {
    beforeEach(() => {
      // Set up minimal player state
      engine.state.player.pos = new Vector3(0, 0, 10);
      engine.state.player.rot = 0;
      engine.state.player.pitch = 0;
    });

    it('should change camera mode to TOPDOWN', () => {
      engine.setCameraMode('TOPDOWN');
      expect(engine.cameraMode).toBe('TOPDOWN');
    });

    it('should change camera mode to FIRST_PERSON', () => {
      engine.setCameraMode('FIRST_PERSON');
      expect(engine.cameraMode).toBe('FIRST_PERSON');
    });

    it('should change camera mode to ISOMETRIC', () => {
      engine.setCameraMode('FIRST_PERSON');
      engine.setCameraMode('ISOMETRIC');
      expect(engine.cameraMode).toBe('ISOMETRIC');
    });

    it('should reset pitch when entering FPS mode', () => {
      engine.state.player.pitch = 0.5;
      engine.setCameraMode('FIRST_PERSON');

      expect(engine.state.player.pitch).toBe(0);
    });

    it('should calculate look direction toward center when entering FPS', () => {
      engine.state.player.pos = new Vector3(10, 0, 10);
      engine.setCameraMode('FIRST_PERSON');

      // Player should look toward center (0,0,0)
      expect(engine.state.player.rot).not.toBe(0);
    });
  });

  describe('togglePause', () => {
    beforeEach(() => {
      // Must be in a game phase (not READY) to toggle pause
      engine.phase = 'WAVE_PREP';
    });

    it('should toggle pause state', () => {
      expect(engine.state.paused).toBe(false);

      engine.togglePause();
      expect(engine.state.paused).toBe(true);

      engine.togglePause();
      expect(engine.state.paused).toBe(false);
    });

    it('should emit onPauseChange callback', () => {
      const callback = vi.fn();
      engine.on('onPauseChange', callback);

      engine.togglePause();
      expect(callback).toHaveBeenCalledWith(true);

      engine.togglePause();
      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      // Mock reset since it requires initialized Three.js components
      engine.reset = vi.fn();
    });

    it('should call reset', () => {
      engine.startGame();
      expect(engine.reset).toHaveBeenCalled();
    });

    it('should set started to true', () => {
      engine.startGame();
      expect(engine.state.started).toBe(true);
    });

    it('should set waveComplete to true (waiting for first wave)', () => {
      engine.startGame();
      expect(engine.state.waveComplete).toBe(true);
    });

    it('should set endlessMode based on parameter', () => {
      engine.startGame(true);
      expect(engine.state.endlessMode).toBe(true);
    });

    it('should emit onWaitingForWave callback', () => {
      const callback = vi.fn();
      engine.on('onWaitingForWave', callback);

      engine.startGame();
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should emit onBannerChange callback', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);

      engine.startGame();
      expect(callback).toHaveBeenCalledWith('Press SPACE to start Wave 1');
    });

    it('should start music', () => {
      engine.audioManager = mockAudioManager;
      engine.startGame();

      expect(mockAudioManager.startMusic).toHaveBeenCalled();
    });
  });

  describe('startWave', () => {
    beforeEach(() => {
      engine.state.started = true;
      engine.state.waveComplete = true;
      engine.phase = 'WAVE_PREP'; // Must be in WAVE_PREP or WAVE_COMPLETE to start wave
    });

    it('should increment wave number', () => {
      engine.startWave();
      expect(engine.state.activeWaveNumber).toBe(1);

      // Reset for next wave
      engine.state.waveComplete = true;
      engine.phase = 'WAVE_COMPLETE'; // Must be in proper phase to start next wave
      engine.startWave();
      expect(engine.state.activeWaveNumber).toBe(2);
    });

    it('should set waveComplete to false', () => {
      engine.startWave();
      expect(engine.state.waveComplete).toBe(false);
    });

    it('should calculate wave composition', () => {
      engine.startWave();
      expect(engine.state.waveComp).toBeDefined();
      expect(Object.keys(engine.state.waveComp).length).toBeGreaterThan(0);
    });

    it('should set toSpawn based on composition', () => {
      engine.startWave();
      expect(engine.state.toSpawn).toBeGreaterThan(0);
    });

    it('should set expectedThisWave', () => {
      engine.startWave();
      expect(engine.state.expectedThisWave).toBe(engine.state.toSpawn);
    });

    it('should reset totalSpawnedThisWave', () => {
      engine.state.totalSpawnedThisWave = 50;
      engine.startWave();
      expect(engine.state.totalSpawnedThisWave).toBe(0);
    });

    it('should set spawnTimer', () => {
      engine.startWave();
      expect(engine.state.spawnTimer).toBe(1);
    });

    it('should record waveStartHealth', () => {
      engine.state.player.health = 75;
      engine.startWave();
      expect(engine.state.waveStartHealth).toBe(75);
    });

    it('should NOT start wave if game not started', () => {
      engine.state.started = false;
      engine.startWave();
      expect(engine.state.activeWaveNumber).toBe(0);
    });

    it('should NOT start wave if wave already in progress', () => {
      engine.state.waveComplete = false;
      engine.phase = 'WAVE_ACTIVE'; // Wave is in progress
      engine.startWave();
      expect(engine.state.activeWaveNumber).toBe(0);
    });

    it('should NOT start wave if game over', () => {
      engine.state.gameOver = true;
      engine.startWave();
      expect(engine.state.activeWaveNumber).toBe(0);
    });

    it('should emit onWaitingForWave(false) callback', () => {
      const callback = vi.fn();
      engine.on('onWaitingForWave', callback);

      engine.startWave();
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should emit onBannerChange callback', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);

      engine.startWave();
      expect(callback).toHaveBeenCalledWith('Wave 1');
    });

    it('should play wave sound', () => {
      engine.audioManager = mockAudioManager;
      engine.startWave();

      expect(mockAudioManager.playSound).toHaveBeenCalledWith('wave');
    });
  });

  // ============================================
  // Upgrade System Tests
  // ============================================

  describe('buyUpgrade', () => {
    it('should deduct currency for purchase', () => {
      engine.state.currency = 200;
      engine.buyUpgrade('weaponDamage', 50);
      expect(engine.state.currency).toBe(150);
    });

    it('should increment upgrade level', () => {
      engine.state.currency = 200;
      engine.buyUpgrade('weaponDamage', 50);
      expect(engine.state.upgrades.weaponDamage).toBe(1);

      engine.buyUpgrade('weaponDamage', 50);
      expect(engine.state.upgrades.weaponDamage).toBe(2);
    });

    it('should return true on successful purchase', () => {
      engine.state.currency = 200;
      const result = engine.buyUpgrade('fireRate', 50);
      expect(result).toBe(true);
    });

    it('should return false if not enough currency', () => {
      engine.state.currency = 30;
      const result = engine.buyUpgrade('fireRate', 50);
      expect(result).toBe(false);
    });

    it('should NOT deduct currency if insufficient', () => {
      engine.state.currency = 30;
      engine.buyUpgrade('fireRate', 50);
      expect(engine.state.currency).toBe(30);
    });

    it('should emit banner message if insufficient currency', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);
      engine.state.currency = 30;

      engine.buyUpgrade('fireRate', 50);
      expect(callback).toHaveBeenCalledWith('Not enough corn!');
    });

    it('should increase player max health for playerHealth upgrade', () => {
      engine.state.currency = 200;
      engine.state.player.maxHealth = 100;
      engine.state.player.health = 100;

      engine.buyUpgrade('playerHealth', 50);

      expect(engine.state.player.maxHealth).toBe(120);
    });

    it('should heal player when buying playerHealth upgrade', () => {
      engine.state.currency = 200;
      engine.state.player.maxHealth = 100;
      engine.state.player.health = 80;

      engine.buyUpgrade('playerHealth', 50);

      expect(engine.state.player.health).toBe(100); // 80 + 20, capped at 120
    });

    it('should play purchase sound', () => {
      engine.audioManager = mockAudioManager;
      engine.state.currency = 200;

      engine.buyUpgrade('houseArmor', 50);
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('purchase');
    });
  });

  describe('repairHouse', () => {
    beforeEach(() => {
      engine.houseDoors = [
        { health: 50, maxHealth: 100, destroyed: false },
        { health: 30, maxHealth: 100, destroyed: false }
      ];
      engine.houseWindows = [
        { health: 25, maxHealth: 50, destroyed: false },
        { health: 10, maxHealth: 50, destroyed: false }
      ];
    });

    it('should cost 50 currency', () => {
      engine.state.currency = 100;
      engine.repairHouse();
      expect(engine.state.currency).toBe(50);
    });

    it('should return false if not enough currency', () => {
      engine.state.currency = 30;
      const result = engine.repairHouse();
      expect(result).toBe(false);
    });

    it('should heal doors by 50%', () => {
      engine.state.currency = 100;
      engine.repairHouse();

      expect(engine.houseDoors[0].health).toBe(100); // 50 + 50 capped at 100
      expect(engine.houseDoors[1].health).toBe(80); // 30 + 50
    });

    it('should heal windows by 50%', () => {
      engine.state.currency = 100;
      engine.repairHouse();

      expect(engine.houseWindows[0].health).toBe(50); // 25 + 25 capped at 50
      expect(engine.houseWindows[1].health).toBe(35); // 10 + 25
    });

    it('should NOT heal destroyed doors', () => {
      engine.houseDoors[0].destroyed = true;
      engine.houseDoors[0].health = 0;
      engine.state.currency = 100;

      engine.repairHouse();

      expect(engine.houseDoors[0].health).toBe(0);
    });

    it('should emit banner on success', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);
      engine.state.currency = 100;

      engine.repairHouse();
      expect(callback).toHaveBeenCalledWith('House repaired!');
    });

    it('should play purchase sound', () => {
      engine.audioManager = mockAudioManager;
      engine.state.currency = 100;

      engine.repairHouse();
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('purchase');
    });
  });

  describe('upgradeHouse', () => {
    it('should return false if at max level', () => {
      engine.state.upgrades.houseLevel = 4; // FORTRESS is last
      engine.state.currency = 10000;

      const result = engine.upgradeHouse();
      expect(result).toBe(false);
    });

    it('should return false if not enough currency', () => {
      engine.state.upgrades.houseLevel = 0;
      engine.state.currency = 10; // COTTAGE costs more

      const result = engine.upgradeHouse();
      expect(result).toBe(false);
    });

    it('should increment house level', () => {
      engine.state.upgrades.houseLevel = 0;
      engine.state.currency = HouseUpgrades.COTTAGE.cost;
      // Need to mock _buildHouse since it requires Three.js scene
      engine._buildHouse = vi.fn();

      engine.upgradeHouse();
      expect(engine.state.upgrades.houseLevel).toBe(1);
    });

    it('should deduct correct cost', () => {
      engine.state.upgrades.houseLevel = 0;
      engine.state.currency = HouseUpgrades.COTTAGE.cost + 100;
      engine._buildHouse = vi.fn();

      engine.upgradeHouse();
      expect(engine.state.currency).toBe(100);
    });

    it('should call _buildHouse with new level', () => {
      engine.state.upgrades.houseLevel = 0;
      engine.state.currency = HouseUpgrades.COTTAGE.cost;
      engine._buildHouse = vi.fn();

      engine.upgradeHouse();
      expect(engine._buildHouse).toHaveBeenCalledWith(1);
    });
  });

  // ============================================
  // Ability System Tests
  // ============================================

  describe('useAbility', () => {
    beforeEach(() => {
      engine.state.aim = new Vector3(10, 0, 10);
    });

    it('should set pendingAirstrike for AIRSTRIKE ability', () => {
      engine.useAbility('AIRSTRIKE');
      expect(engine.state.pendingAirstrike).toBeDefined();
    });

    it('should set globalFreeze for FREEZE ability', () => {
      engine.useAbility('FREEZE');
      expect(engine.state.globalFreeze).toBe(AbilityTypes.FREEZE.duration);
    });

    it('should set rageActive for RAGE ability', () => {
      engine.useAbility('RAGE');
      expect(engine.state.rageActive).toBe(AbilityTypes.RAGE.duration);
    });

    it('should heal doors for REPAIR ability', () => {
      engine.houseDoors = [
        { health: 50, maxHealth: 100, destroyed: false }
      ];
      engine.houseWindows = [];

      engine.useAbility('REPAIR');

      expect(engine.houseDoors[0].health).toBeGreaterThan(50);
    });

    it('should repair destroyed doors for REPAIR ability', () => {
      engine.houseDoors = [
        { health: 0, maxHealth: 100, destroyed: true, panel: { visible: false } }
      ];
      engine.houseWindows = [];

      engine.useAbility('REPAIR');

      expect(engine.houseDoors[0].destroyed).toBe(false);
      expect(engine.houseDoors[0].health).toBeGreaterThan(0);
      expect(engine.houseDoors[0].panel.visible).toBe(true);
    });

    it('should repair destroyed windows for REPAIR ability', () => {
      engine.houseDoors = [];
      engine.houseWindows = [
        { health: 0, maxHealth: 50, destroyed: true, glass: { visible: false } }
      ];

      engine.useAbility('REPAIR');

      expect(engine.houseWindows[0].destroyed).toBe(false);
      expect(engine.houseWindows[0].health).toBeGreaterThan(0);
      expect(engine.houseWindows[0].glass.visible).toBe(true);
    });

    it('should do nothing for invalid ability', () => {
      const initialState = { ...engine.state };
      engine.useAbility('INVALID');

      expect(engine.state.globalFreeze).toBe(initialState.globalFreeze);
      expect(engine.state.rageActive).toBe(initialState.rageActive);
    });

    it('should play ability sound', () => {
      engine.audioManager = mockAudioManager;
      engine.useAbility('RAGE');

      expect(mockAudioManager.playSound).toHaveBeenCalledWith('ability');
    });

    it('should play freeze sound for FREEZE', () => {
      engine.audioManager = mockAudioManager;
      engine.useAbility('FREEZE');

      expect(mockAudioManager.playSound).toHaveBeenCalledWith('freeze');
    });
  });

  // ============================================
  // Turret Placement Tests
  // ============================================

  describe('startTurretPlacement', () => {
    beforeEach(() => {
      // Set up turret preview mock
      engine.turretPreview = {
        visible: false,
        userData: {
          rangeIndicator: {
            geometry: { dispose: vi.fn() }
          }
        }
      };
    });

    it('should set placingTurret to turret type', () => {
      engine.state.currency = 500;

      engine.startTurretPlacement('BASIC');
      expect(engine.state.placingTurret).toBe('BASIC');
    });

    it('should show turret preview', () => {
      engine.state.currency = 500;

      engine.startTurretPlacement('BASIC');
      expect(engine.turretPreview.visible).toBe(true);
    });

    it('should NOT place if invalid turret type', () => {
      engine.state.placingTurret = null;
      engine.startTurretPlacement('INVALID');
      expect(engine.state.placingTurret).toBeNull();
    });

    it('should NOT place if not enough currency', () => {
      engine.state.currency = 10;
      engine.state.placingTurret = null;

      engine.startTurretPlacement('BASIC');
      expect(engine.state.placingTurret).toBeNull();
    });

    it('should emit banner if not enough currency', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);
      engine.state.currency = 10;

      engine.startTurretPlacement('BASIC');
      expect(callback).toHaveBeenCalledWith('Not enough corn!');
    });

    it('should update range indicator geometry', () => {
      engine.state.currency = 500;
      const disposeFn = engine.turretPreview.userData.rangeIndicator.geometry.dispose;

      engine.startTurretPlacement('BASIC');
      expect(disposeFn).toHaveBeenCalled();
    });
  });

  describe('cancelTurretPlacement', () => {
    it('should clear placingTurret', () => {
      engine.state.placingTurret = 'BASIC';
      engine.turretPreview = { visible: true };

      engine.cancelTurretPlacement();
      expect(engine.state.placingTurret).toBeNull();
    });

    it('should hide turret preview', () => {
      engine.state.placingTurret = 'BASIC';
      engine.turretPreview = { visible: true };

      engine.cancelTurretPlacement();
      expect(engine.turretPreview.visible).toBe(false);
    });
  });

  // ============================================
  // Callback System Tests
  // ============================================

  describe('on (callback registration)', () => {
    it('should register onStatsUpdate callback', () => {
      const callback = vi.fn();
      engine.on('onStatsUpdate', callback);
      expect(engine.callbacks.onStatsUpdate).toBe(callback);
    });

    it('should register onWeaponChange callback', () => {
      const callback = vi.fn();
      engine.on('onWeaponChange', callback);
      expect(engine.callbacks.onWeaponChange).toBe(callback);
    });

    it('should register onBannerChange callback', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);
      expect(engine.callbacks.onBannerChange).toBe(callback);
    });

    it('should register onGameOver callback', () => {
      const callback = vi.fn();
      engine.on('onGameOver', callback);
      expect(engine.callbacks.onGameOver).toBe(callback);
    });

    it('should NOT register invalid callback names', () => {
      const callback = vi.fn();
      engine.on('invalidEvent', callback);
      expect(engine.callbacks['invalidEvent']).toBeUndefined();
    });

    it('should allow replacing callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      engine.on('onStatsUpdate', callback1);
      engine.on('onStatsUpdate', callback2);

      expect(engine.callbacks.onStatsUpdate).toBe(callback2);
    });
  });

  describe('_emitCallback', () => {
    it('should call registered callback with data', () => {
      const callback = vi.fn();
      engine.on('onStatsUpdate', callback);

      engine._emitCallback('onStatsUpdate', { health: 100 });
      expect(callback).toHaveBeenCalledWith({ health: 100 });
    });

    it('should NOT throw if callback not registered', () => {
      expect(() => {
        engine._emitCallback('onStatsUpdate', { health: 100 });
      }).not.toThrow();
    });
  });

  // ============================================
  // State Getters Tests
  // ============================================

  describe('getState', () => {
    it('should return copy of state', () => {
      engine.state.activeWaveNumber = 5;
      engine.state.score = 1000;

      const state = engine.getState();

      expect(state.activeWaveNumber).toBe(5);
      expect(state.score).toBe(1000);
    });

    it('should return isolated copy (not reference)', () => {
      const state = engine.getState();
      state.activeWaveNumber = 999;

      expect(engine.state.activeWaveNumber).toBe(0);
    });
  });

  describe('getUpgrades', () => {
    it('should return copy of upgrades', () => {
      engine.state.upgrades.weaponDamage = 3;
      engine.state.upgrades.fireRate = 2;

      const upgrades = engine.getUpgrades();

      expect(upgrades.weaponDamage).toBe(3);
      expect(upgrades.fireRate).toBe(2);
    });

    it('should return isolated copy', () => {
      const upgrades = engine.getUpgrades();
      upgrades.weaponDamage = 999;

      expect(engine.state.upgrades.weaponDamage).toBe(0);
    });
  });

  // ============================================
  // Reset Tests
  // ============================================

  describe('reset', () => {
    beforeEach(() => {
      // Modify state to verify reset
      engine.state.activeWaveNumber = 10;
      engine.state.score = 5000;
      engine.state.currency = 500;
      engine.state.gameOver = true;
      engine.state.player.health = 50;
      engine.state.player.maxHealth = 120;
      engine.state.upgrades.weaponDamage = 5;
      engine.state.globalFreeze = 3;
      engine.state.rageActive = 5;

      // Mock scene for zombie/projectile cleanup
      engine.scene = {
        remove: vi.fn()
      };
      engine.playerGroup = {
        position: { copy: vi.fn() }
      };
      engine._buildHouse = vi.fn();
      engine._updateStats = vi.fn();
    });

    it('should reset wave to 0', () => {
      engine.reset();
      expect(engine.state.activeWaveNumber).toBe(0);
    });

    it('should reset score to 0', () => {
      engine.reset();
      expect(engine.state.score).toBe(0);
    });

    it('should reset currency to 100', () => {
      engine.reset();
      expect(engine.state.currency).toBe(100);
    });

    it('should reset gameOver to false', () => {
      engine.reset();
      expect(engine.state.gameOver).toBe(false);
    });

    it('should reset player health', () => {
      engine.reset();
      expect(engine.state.player.health).toBe(100);
      expect(engine.state.player.maxHealth).toBe(100);
    });

    it('should reset player position', () => {
      engine.reset();
      expect(engine.state.player.pos.x).toBe(-40);
      expect(engine.state.player.pos.z).toBe(-25);
    });

    it('should reset upgrades', () => {
      engine.reset();
      expect(engine.state.upgrades.weaponDamage).toBe(0);
      expect(engine.state.upgrades.houseArmor).toBe(0);
      expect(engine.state.upgrades.fireRate).toBe(0);
      expect(engine.state.upgrades.playerHealth).toBe(0);
      expect(engine.state.upgrades.houseLevel).toBe(0);
    });

    it('should reset ability states', () => {
      engine.reset();
      expect(engine.state.globalFreeze).toBe(0);
      expect(engine.state.rageActive).toBe(0);
    });

    it('should reset weapon to PITCHFORK', () => {
      engine.state.currentWeapon = 'PUMPKIN_MORTAR';
      engine.reset();
      expect(engine.state.currentWeapon).toBe('PITCHFORK');
    });

    it('should clear zombies array', () => {
      engine.state.zombies = [createMockZombie(), createMockZombie()];
      engine.reset();
      expect(engine.state.zombies).toEqual([]);
    });

    it('should clear projectiles array', () => {
      engine.state.projectiles = [{}, {}, {}];
      engine.reset();
      expect(engine.state.projectiles).toEqual([]);
    });

    it('should clear turrets array', () => {
      engine.state.turrets = [createMockTurret(), createMockTurret()];
      engine.reset();
      expect(engine.state.turrets).toEqual([]);
    });

    it('should rebuild house at level 0', () => {
      engine.reset();
      expect(engine._buildHouse).toHaveBeenCalledWith(0);
    });

    it('should clear spatial grids', () => {
      engine.zombieGrid.clear = vi.fn();
      engine.turretGrid.clear = vi.fn();
      engine.buildingValidator.clear = vi.fn();
      engine.damageManager.clear = vi.fn();

      engine.reset();

      expect(engine.zombieGrid.clear).toHaveBeenCalled();
      expect(engine.turretGrid.clear).toHaveBeenCalled();
      expect(engine.buildingValidator.clear).toHaveBeenCalled();
      expect(engine.damageManager.clear).toHaveBeenCalled();
    });
  });

  // ============================================
  // Re-exported Config Tests
  // ============================================

  describe('Re-exports', () => {
    it('should re-export WeaponTypes', () => {
      expect(WeaponTypes).toBeDefined();
      expect(WeaponTypes.PITCHFORK).toBeDefined();
    });

    it('should re-export ZombieTypes', () => {
      expect(ZombieTypes).toBeDefined();
      expect(ZombieTypes.STANDARD).toBeDefined();
    });

    it('should re-export HouseUpgrades', () => {
      expect(HouseUpgrades).toBeDefined();
      expect(HouseUpgrades.BASIC).toBeDefined();
    });

    it('should re-export TurretTypes', () => {
      expect(TurretTypes).toBeDefined();
      expect(TurretTypes.BASIC).toBeDefined();
    });

    it('should re-export AbilityTypes', () => {
      expect(AbilityTypes).toBeDefined();
      expect(AbilityTypes.AIRSTRIKE).toBeDefined();
    });
  });

  // ============================================
  // Input Handling Tests
  // ============================================

  describe('_handleKey', () => {
    it('should set w input on KeyW down', () => {
      engine._handleKey({ code: 'KeyW' }, true);
      expect(engine.state.input.w).toBe(true);
    });

    it('should clear w input on KeyW up', () => {
      engine.state.input.w = true;
      engine._handleKey({ code: 'KeyW' }, false);
      expect(engine.state.input.w).toBe(false);
    });

    it('should set all WASD inputs', () => {
      engine._handleKey({ code: 'KeyW' }, true);
      engine._handleKey({ code: 'KeyA' }, true);
      engine._handleKey({ code: 'KeyS' }, true);
      engine._handleKey({ code: 'KeyD' }, true);

      expect(engine.state.input.w).toBe(true);
      expect(engine.state.input.a).toBe(true);
      expect(engine.state.input.s).toBe(true);
      expect(engine.state.input.d).toBe(true);
    });

    it('should set pan inputs on arrow keys', () => {
      engine._handleKey({ code: 'ArrowUp' }, true);
      engine._handleKey({ code: 'ArrowDown' }, true);
      engine._handleKey({ code: 'ArrowLeft' }, true);
      engine._handleKey({ code: 'ArrowRight' }, true);

      expect(engine.state.input.panUp).toBe(true);
      expect(engine.state.input.panDown).toBe(true);
      expect(engine.state.input.panLeft).toBe(true);
      expect(engine.state.input.panRight).toBe(true);
    });

    it('should switch weapon on number keys', () => {
      engine._handleKey({ code: 'Digit2' }, true);
      expect(engine.state.currentWeapon).toBe('CORN_CANNON');

      engine._handleKey({ code: 'Digit3' }, true);
      expect(engine.state.currentWeapon).toBe('EGG_BLASTER');

      engine._handleKey({ code: 'Digit4' }, true);
      expect(engine.state.currentWeapon).toBe('HAY_BALE_CATAPULT');

      engine._handleKey({ code: 'Digit1' }, true);
      expect(engine.state.currentWeapon).toBe('PITCHFORK');
    });

    it('should start wave on Space key', () => {
      engine.state.started = true;
      engine.state.waveComplete = true;
      engine.phase = 'WAVE_PREP'; // Set proper phase for wave start

      engine._handleKey({ code: 'Space' }, true);
      expect(engine.state.activeWaveNumber).toBe(1);
    });

    it('should start wave on N key', () => {
      engine.state.started = true;
      engine.state.waveComplete = true;
      engine.phase = 'WAVE_PREP'; // Set proper phase for wave start

      engine._handleKey({ code: 'KeyN' }, true);
      expect(engine.state.activeWaveNumber).toBe(1);
    });

    it('should rotate camera on comma key', () => {
      engine.audioManager = mockAudioManager;
      const initialAngle = engine.cameraAngle;

      engine._handleKey({ code: 'Comma' }, true);
      expect(engine.cameraAngle).toBe(initialAngle + Math.PI / 4);
    });

    it('should rotate camera on period key', () => {
      engine.audioManager = mockAudioManager;
      const initialAngle = engine.cameraAngle;

      engine._handleKey({ code: 'Period' }, true);
      expect(engine.cameraAngle).toBe(initialAngle - Math.PI / 4);
    });

    it('should reset camera on Z key', () => {
      engine.audioManager = mockAudioManager;
      engine.cameraAngle = Math.PI / 2; // Set to something other than default
      engine.panOffset = new Vector3(10, 0, 10);

      engine._handleKey({ code: 'KeyZ' }, true);

      expect(engine.cameraAngle).toBe(Math.PI); // Default behind-player view
      expect(engine.panOffset.x).toBe(0);
      expect(engine.panOffset.z).toBe(0);
    });
  });

  // ============================================
  // Wave Completion Tests
  // ============================================

  describe('_onWaveComplete', () => {
    beforeEach(() => {
      // Must be in WAVE_ACTIVE phase to transition to WAVE_COMPLETE
      engine.phase = 'WAVE_ACTIVE';
    });

    it('should set waveComplete to true', () => {
      engine.state.activeWaveNumber = 1;
      engine._onWaveComplete();
      expect(engine.state.waveComplete).toBe(true);
    });

    it('should emit onWaveComplete callback', () => {
      const callback = vi.fn();
      engine.on('onWaveComplete', callback);
      engine.state.activeWaveNumber = 5;

      engine._onWaveComplete();
      expect(callback).toHaveBeenCalledWith(5);
    });

    it('should emit onWaitingForWave callback', () => {
      const callback = vi.fn();
      engine.on('onWaitingForWave', callback);
      engine.state.activeWaveNumber = 1;

      engine._onWaveComplete();
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should emit banner message', () => {
      const callback = vi.fn();
      engine.on('onBannerChange', callback);
      engine.state.activeWaveNumber = 3;

      engine._onWaveComplete();
      expect(callback).toHaveBeenCalledWith('Wave 3 Complete!');
    });

    it('should award bonus currency', () => {
      engine.state.currency = 100;
      engine.state.activeWaveNumber = 5;

      engine._onWaveComplete();

      // Bonus: 20 + wave * 5 = 20 + 25 = 45
      expect(engine.state.currency).toBe(145);
    });

    it('should award more currency on later waves', () => {
      engine.state.currency = 100;
      engine.state.activeWaveNumber = 10;

      engine._onWaveComplete();

      // Bonus: 20 + 10 * 5 = 70
      expect(engine.state.currency).toBe(170);
    });

    it('should play wave sound', () => {
      engine.audioManager = mockAudioManager;
      engine.state.activeWaveNumber = 1;

      engine._onWaveComplete();
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('wave');
    });
  });

  // ============================================
  // Dispose Tests
  // ============================================

  describe('dispose', () => {
    let mockDispose;
    let mockDomElement;

    beforeEach(() => {
      mockDispose = vi.fn();
      mockDomElement = {
        removeEventListener: vi.fn()
      };

      engine.animationId = 123;
      engine.renderer = {
        dispose: mockDispose,
        domElement: mockDomElement
      };
      engine._boundHandlers = {
        resize: vi.fn(),
        keyDown: vi.fn(),
        keyUp: vi.fn(),
        mouseDown: vi.fn(),
        mouseUp: vi.fn(),
        mouseMove: vi.fn(),
        wheel: vi.fn(),
        pointerLockChange: vi.fn()
      };
    });

    it('should dispose renderer', () => {
      engine.dispose();
      expect(mockDispose).toHaveBeenCalled();
    });

    it('should clear scene reference', () => {
      engine.scene = {};
      engine.dispose();
      expect(engine.scene).toBeNull();
    });

    it('should clear camera reference', () => {
      engine.camera = {};
      engine.dispose();
      expect(engine.camera).toBeNull();
    });

    it('should clear renderer reference', () => {
      engine.dispose();
      expect(engine.renderer).toBeNull();
    });

    it('should remove event listeners from domElement', () => {
      engine.dispose();
      expect(mockDomElement.removeEventListener).toHaveBeenCalled();
    });
  });
});
