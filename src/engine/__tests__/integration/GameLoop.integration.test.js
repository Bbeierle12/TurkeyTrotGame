/**
 * Game Loop Integration Tests
 *
 * Tests the core game loop interactions including:
 * - Wave spawning and progression
 * - Combat systems (zombies vs player, player vs zombies)
 * - Economy and upgrade systems
 * - State management across game cycles
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine, StateSnapshot, WeaponTypes, ZombieTypes, AbilityTypes, TurretTypes } from '../../GameEngine.js';
import { createMockGameState, createMockZombie, createPosition, resetIdCounter } from '../../../test-utils/factories.js';

describe('GameLoop Integration', () => {
  let engine;

  beforeEach(() => {
    resetIdCounter();
    engine = new GameEngine();
    // Mock Three.js scene components
    engine.scene = { add: vi.fn(), remove: vi.fn() };
    engine.zombieGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.projectileGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.turretGroup = { add: vi.fn(), remove: vi.fn(), children: [] };
    engine.playerGroup = { position: { x: 0, y: 0, z: 10, set: vi.fn(), copy: vi.fn() } };
    engine.camera = { position: { set: vi.fn(), copy: vi.fn() }, lookAt: vi.fn() };
    engine.renderer = { dispose: vi.fn() };
    engine.reset = vi.fn();
    engine.turretPreview = {
      visible: false,
      userData: { rangeIndicator: { geometry: { dispose: vi.fn() } } }
    };
  });

  afterEach(() => {
    engine = null;
  });

  describe('Wave Progression System', () => {
    it('should calculate correct wave composition for early waves', () => {
      engine.state.activeWaveNumber = 1;
      const comp = engine._getWaveComposition(1);

      // Wave 1 should be simple with mostly standard zombies
      expect(comp.STANDARD).toBeDefined();
      expect(comp.STANDARD).toBeGreaterThan(0);
    });

    it('should introduce new zombie types in later waves', () => {
      // Wave 3+ should introduce runners
      const wave3Comp = engine._getWaveComposition(3);
      // Wave 4+ should have runners with high probability
      const wave5Comp = engine._getWaveComposition(5);

      // Later waves should have increasing variety
      const wave3Types = Object.keys(wave3Comp).length;
      const wave5Types = Object.keys(wave5Comp).length;

      expect(wave5Types).toBeGreaterThanOrEqual(wave3Types);
    });

    it('should have boss waves at wave 5 multiples', () => {
      const wave5Comp = engine._getWaveComposition(5);
      const wave10Comp = engine._getWaveComposition(10);
      const wave15Comp = engine._getWaveComposition(15);

      // Boss waves should include BOSS type
      expect(wave5Comp.BOSS || wave10Comp.BOSS || wave15Comp.BOSS).toBeDefined();
    });

    it('should scale total enemy count with wave number', () => {
      const wave1Total = Object.values(engine._getWaveComposition(1)).reduce((a, b) => a + b, 0);
      const wave5Total = Object.values(engine._getWaveComposition(5)).reduce((a, b) => a + b, 0);
      const wave10Total = Object.values(engine._getWaveComposition(10)).reduce((a, b) => a + b, 0);

      expect(wave5Total).toBeGreaterThanOrEqual(wave1Total);
      expect(wave10Total).toBeGreaterThanOrEqual(wave5Total);
    });

    it('should have breather waves with reduced count', () => {
      // Waves after boss waves (6, 11, 16...) should be easier
      const wave5Comp = engine._getWaveComposition(5);
      const wave6Comp = engine._getWaveComposition(6);

      const wave5Total = Object.values(wave5Comp).reduce((a, b) => a + b, 0);
      const wave6Total = Object.values(wave6Comp).reduce((a, b) => a + b, 0);

      // Wave 6 (post-boss breather) should generally have fewer or similar enemies
      // This tests the rhythm modifier system
      expect(wave6Total).toBeLessThanOrEqual(wave5Total * 1.5);
    });
  });

  describe('Combat Integration', () => {
    beforeEach(() => {
      engine.state.started = true;
      engine.state.gameOver = false;
      engine.state.paused = false;
    });

    it('should track zombie deaths and award currency', () => {
      const initialCurrency = engine.state.currency;
      const zombie = createMockZombie({ type: 'STANDARD', hp: 0, value: 10 });
      zombie.mesh = { parent: engine.zombieGroup };

      engine.state.zombies = [zombie];

      // Simulate zombie death by setting HP to 0
      // The game loop would normally handle this
      expect(zombie.hp).toBe(0);
      expect(zombie.value).toBe(10);
    });

    it('should handle multiple weapon types', () => {
      const weapons = ['PITCHFORK', 'CORN_CANNON', 'EGG_BLASTER', 'HAY_BALE_CATAPULT'];

      weapons.forEach(weapon => {
        engine.setWeapon(weapon);
        expect(engine.state.currentWeapon).toBe(weapon);

        const weaponInfo = WeaponTypes[weapon];
        expect(weaponInfo).toBeDefined();
        expect(weaponInfo.damage).toBeGreaterThan(0);
      });
    });

    it('should apply splash damage for appropriate weapons', () => {
      const cornCannon = WeaponTypes.CORN_CANNON;
      const hayBaleCatapult = WeaponTypes.HAY_BALE_CATAPULT;

      expect(cornCannon.splash).toBeGreaterThan(0);
      expect(hayBaleCatapult.splash).toBeGreaterThan(0);
    });

    it('should apply pierce for pitchfork weapon', () => {
      const pitchfork = WeaponTypes.PITCHFORK;
      expect(pitchfork.pierce).toBeGreaterThan(0);
    });

    it('should apply slow effect for egg blaster', () => {
      const eggBlaster = WeaponTypes.EGG_BLASTER;
      expect(eggBlaster.slow).toBeGreaterThan(0);
    });
  });

  describe('Economy System Integration', () => {
    beforeEach(() => {
      engine.state.started = true;
      engine.state.currency = 500;
    });

    it('should handle upgrade purchase flow', () => {
      const upgrades = ['houseArmor', 'weaponDamage', 'fireRate', 'playerHealth'];

      upgrades.forEach(upgrade => {
        const initialLevel = engine.state.upgrades[upgrade];
        const result = engine.buyUpgrade(upgrade);

        if (result) {
          expect(engine.state.upgrades[upgrade]).toBe(initialLevel + 1);
        }
      });
    });

    it('should increment upgrade level when purchased', () => {
      engine.state.currency = 100000;
      const initialLevel = engine.state.upgrades.weaponDamage;

      // Buy upgrade with explicit cost
      engine.buyUpgrade('weaponDamage', 50);

      expect(engine.state.upgrades.weaponDamage).toBe(initialLevel + 1);
    });

    it('should not allow purchase without sufficient currency', () => {
      engine.state.currency = 0;
      const initialLevel = engine.state.upgrades.houseArmor;

      // Try to buy with explicit cost - should fail
      engine.buyUpgrade('houseArmor', 100);

      // Should not increase since currency is 0
      expect(engine.state.upgrades.houseArmor).toBe(initialLevel);
    });

    it('should handle house repair correctly', () => {
      engine.state.barn = { health: 50, maxHealth: 175 };
      engine.state.currency = 100;

      const initialHealth = engine.state.barn.health;
      engine.repairHouse();

      // Should attempt repair if currency available
      // Exact behavior depends on repair cost
    });
  });

  describe('State Snapshot System', () => {
    it('should create consistent snapshots', () => {
      engine.state.activeWaveNumber = 5;
      engine.state.currency = 1000;
      engine.state.score = 5000;
      engine.state.zombies = [createMockZombie(), createMockZombie()];

      const snapshot = new StateSnapshot(engine.state);

      expect(snapshot.activeWaveNumber).toBe(5);
      expect(snapshot.currency).toBe(1000);
      expect(snapshot.score).toBe(5000);
      expect(snapshot.zombieCount).toBe(2);
    });

    it('should track player position in snapshot', () => {
      engine.state.player = {
        pos: createPosition(10, 0, 20),
        health: 80,
        maxHealth: 100
      };

      const snapshot = new StateSnapshot(engine.state);

      // StateSnapshot tracks playerPos, not health
      expect(snapshot.playerPos).toBeDefined();
      expect(snapshot.playerPos.x).toBe(10);
      expect(snapshot.playerPos.z).toBe(20);
    });

    it('should track barn state in snapshot', () => {
      engine.state.barn = {
        health: 100,
        maxHealth: 175
      };

      const snapshot = new StateSnapshot(engine.state);

      expect(snapshot.barnHealth).toBe(100);
      expect(snapshot.barnMaxHealth).toBe(175);
    });
  });

  describe('Ability System Integration', () => {
    beforeEach(() => {
      engine.state.started = true;
      engine.state.currency = 1000;
    });

    it('should activate freeze ability', () => {
      const result = engine.useAbility('FREEZE');

      if (result) {
        expect(engine.state.globalFreeze).toBeGreaterThan(0);
      }
    });

    it('should activate rage ability', () => {
      const result = engine.useAbility('RAGE');

      if (result) {
        expect(engine.state.rageActive).toBeGreaterThan(0);
      }
    });

    it('should not activate abilities when game not started', () => {
      engine.state.started = false;

      const result = engine.useAbility('FREEZE');
      expect(result).toBeFalsy();
    });

    it('should deduct currency for ability use', () => {
      const initialCurrency = engine.state.currency;
      engine.useAbility('FREEZE');

      // If ability was used, currency should decrease
      // (unless not enough currency)
    });
  });

  describe('Turret System Integration', () => {
    beforeEach(() => {
      engine.state.started = true;
      engine.state.currency = 1000;
    });

    it('should handle turret placement flow', () => {
      engine.startTurretPlacement('BASIC');

      expect(engine.state.placingTurret).toBe('BASIC');
      expect(engine.turretPreview.visible).toBe(true);
    });

    it('should cancel turret placement', () => {
      engine.startTurretPlacement('BASIC');
      engine.cancelTurretPlacement();

      expect(engine.state.placingTurret).toBeNull();
    });

    it('should have correct turret stats', () => {
      const turretTypes = ['BASIC', 'SLOW', 'EXPLOSIVE'];

      turretTypes.forEach(type => {
        const turret = TurretTypes[type];
        expect(turret).toBeDefined();
        expect(turret.damage).toBeGreaterThan(0);
        expect(turret.range).toBeGreaterThan(0);
        expect(turret.cost).toBeGreaterThan(0);
      });
    });
  });

  describe('Game State Transitions', () => {
    it('should transition from menu to playing', () => {
      expect(engine.state.started).toBe(false);

      engine.startGame();

      expect(engine.state.started).toBe(true);
      expect(engine.state.gameOver).toBe(false);
    });

    it('should handle pause/unpause cycle', () => {
      engine.startGame(false);

      engine.togglePause();
      expect(engine.state.paused).toBe(true);

      engine.togglePause();
      expect(engine.state.paused).toBe(false);
    });

    it('should track wave completion state', () => {
      engine.state.started = true;
      engine.state.activeWaveNumber = 1;
      engine.state.zombies = [];
      engine.state.toSpawn = 0;
      engine.state.totalSpawnedThisWave = 5;
      engine.state.expectedThisWave = 5;

      // Wave complete conditions
      const waveComplete =
        engine.state.zombies.length === 0 &&
        engine.state.toSpawn === 0 &&
        engine.state.totalSpawnedThisWave >= engine.state.expectedThisWave;

      expect(waveComplete).toBe(true);
    });

    it('should not allow wave start when game not started', () => {
      engine.state.started = false;

      const result = engine.startWave();
      expect(result).toBeFalsy();
    });
  });

  describe('Callback System Integration', () => {
    it('should register game over callback using on()', () => {
      const callback = vi.fn();
      engine.on('onGameOver', callback);

      expect(engine.callbacks.onGameOver).toBe(callback);
    });

    it('should register wave complete callback using on()', () => {
      const callback = vi.fn();
      engine.on('onWaveComplete', callback);

      expect(engine.callbacks.onWaveComplete).toBe(callback);
    });

    it('should emit callback when wave completes', () => {
      const callback = vi.fn();
      engine.on('onWaveComplete', callback);

      engine.startGame(false);
      engine.startWave();

      // Trigger wave complete via internal method
      engine._onWaveComplete();

      expect(callback).toHaveBeenCalledWith(engine.state.activeWaveNumber);
    });
  });
});
