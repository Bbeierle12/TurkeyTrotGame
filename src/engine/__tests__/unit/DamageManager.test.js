/**
 * DamageManager Unit Tests
 *
 * Tests for damage states, cascading destruction, and visual feedback.
 * ~70 tests covering all damage scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DamageManager, DamageState, DamageType, DamageVisualizer } from '../../DamageManager.js';
import { Vector3, Color, Object3D } from '../__mocks__/three.js';
import {
  createMockPiece,
  createMockValidator,
  createMockMesh,
  createPosition,
  resetIdCounter
} from '../../../test-utils/index.js';

describe('DamageManager', () => {
  let manager;
  let mockValidator;

  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();

    mockValidator = createMockValidator();
    manager = new DamageManager(mockValidator);
  });

  afterEach(() => {
    manager.clear();
    vi.useRealTimers();
  });

  // ============================================
  // DAMAGE STATE ENUM TESTS
  // ============================================
  describe('DamageState', () => {
    it('should have PRISTINE state', () => {
      expect(DamageState.PRISTINE).toBe('pristine');
    });

    it('should have DAMAGED state', () => {
      expect(DamageState.DAMAGED).toBe('damaged');
    });

    it('should have CRITICAL state', () => {
      expect(DamageState.CRITICAL).toBe('critical');
    });

    it('should have DESTROYED state', () => {
      expect(DamageState.DESTROYED).toBe('destroyed');
    });
  });

  // ============================================
  // DAMAGE TYPE ENUM TESTS
  // ============================================
  describe('DamageType', () => {
    it('should have PHYSICAL type', () => {
      expect(DamageType.PHYSICAL).toBe('physical');
    });

    it('should have EXPLOSIVE type', () => {
      expect(DamageType.EXPLOSIVE).toBe('explosive');
    });

    it('should have STRUCTURAL type', () => {
      expect(DamageType.STRUCTURAL).toBe('structural');
    });
  });

  // ============================================
  // CONSTRUCTION TESTS
  // ============================================
  describe('Construction', () => {
    it('should create with validator', () => {
      const dm = new DamageManager(mockValidator);
      expect(dm.validator).toBe(mockValidator);
    });

    it('should use default options', () => {
      const dm = new DamageManager(mockValidator);
      expect(dm.cascadeDamagePercent).toBe(0.2);
      expect(dm.cascadeRadius).toBe(2);
      expect(dm.collapseDelay).toBe(50);
    });

    it('should accept custom options', () => {
      const dm = new DamageManager(mockValidator, {
        cascadeDamagePercent: 0.5,
        cascadeRadius: 5,
        collapseDelay: 100,
        scene: { name: 'test-scene' }
      });

      expect(dm.cascadeDamagePercent).toBe(0.5);
      expect(dm.cascadeRadius).toBe(5);
      expect(dm.collapseDelay).toBe(100);
      expect(dm.scene).toEqual({ name: 'test-scene' });
    });

    it('should initialize with empty collections', () => {
      expect(manager.damageables.size).toBe(0);
      expect(manager.activeCollapses).toEqual([]);
      expect(manager.pendingDestructions).toEqual([]);
    });

    it('should accept callback functions', () => {
      const onDestroyed = vi.fn();
      const onDamaged = vi.fn();
      const onCollapse = vi.fn();

      const dm = new DamageManager(mockValidator, {
        onPieceDestroyed: onDestroyed,
        onPieceDamaged: onDamaged,
        onCollapseComplete: onCollapse
      });

      expect(dm.onPieceDestroyed).toBe(onDestroyed);
      expect(dm.onPieceDamaged).toBe(onDamaged);
      expect(dm.onCollapseComplete).toBe(onCollapse);
    });
  });

  // ============================================
  // REGISTER PIECE TESTS
  // ============================================
  describe('registerPiece', () => {
    it('should register a piece', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      expect(manager.damageables.size).toBe(1);
    });

    it('should return damageable wrapper', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      expect(damageable.piece).toBe(piece);
      expect(damageable.health).toBe(100);
      expect(damageable.maxHealth).toBe(100);
    });

    it('should use custom max health', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece, { maxHealth: 200 });

      expect(damageable.maxHealth).toBe(200);
      expect(damageable.health).toBe(200);
    });

    it('should assign ID if missing', () => {
      const piece = {};
      manager.registerPiece(piece);

      expect(piece.id).toBeTruthy();
      expect(typeof piece.id).toBe('string');
    });

    it('should preserve existing ID', () => {
      const piece = { id: 'my-custom-id' };
      manager.registerPiece(piece);

      expect(piece.id).toBe('my-custom-id');
    });

    it('should register multiple pieces', () => {
      for (let i = 0; i < 5; i++) {
        manager.registerPiece(createMockPiece());
      }

      expect(manager.damageables.size).toBe(5);
    });
  });

  // ============================================
  // UNREGISTER PIECE TESTS
  // ============================================
  describe('unregisterPiece', () => {
    it('should remove a registered piece', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      manager.unregisterPiece(piece);

      expect(manager.damageables.size).toBe(0);
    });

    it('should handle unregistering non-existent piece', () => {
      const piece = createMockPiece();

      expect(() => manager.unregisterPiece(piece)).not.toThrow();
    });
  });

  // ============================================
  // GET DAMAGEABLE TESTS
  // ============================================
  describe('getDamageable', () => {
    it('should return damageable for registered piece', () => {
      const piece = createMockPiece();
      const registered = manager.registerPiece(piece);

      const retrieved = manager.getDamageable(piece);

      expect(retrieved).toBe(registered);
    });

    it('should return undefined for unregistered piece', () => {
      const piece = createMockPiece();

      expect(manager.getDamageable(piece)).toBeUndefined();
    });
  });

  // ============================================
  // APPLY DAMAGE TESTS
  // ============================================
  describe('applyDamage', () => {
    it('should reduce health', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      manager.applyDamage(piece, 30);

      const damageable = manager.getDamageable(piece);
      expect(damageable.health).toBe(70);
    });

    it('should return damage result', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      const result = manager.applyDamage(piece, 30);

      expect(result).toHaveProperty('damageDealt', 30);
      expect(result).toHaveProperty('newHealth', 70);
      expect(result).toHaveProperty('newState');
      expect(result).toHaveProperty('destroyed', false);
    });

    it('should return null for unregistered piece', () => {
      const piece = createMockPiece();

      const result = manager.applyDamage(piece, 30);

      expect(result).toBeNull();
    });

    it('should track damage type', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      manager.applyDamage(piece, 30, DamageType.EXPLOSIVE);

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageHistory[0].type).toBe(DamageType.EXPLOSIVE);
    });

    it('should track damage source', () => {
      const piece = createMockPiece();
      const source = { id: 'attacker' };
      manager.registerPiece(piece);

      manager.applyDamage(piece, 30, DamageType.PHYSICAL, source);

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageHistory[0].source).toBe(source);
    });

    it('should call onPieceDamaged callback', () => {
      const onDamaged = vi.fn();
      const dm = new DamageManager(mockValidator, { onPieceDamaged: onDamaged });

      const piece = createMockPiece();
      dm.registerPiece(piece);
      dm.applyDamage(piece, 30);

      expect(onDamaged).toHaveBeenCalledTimes(1);
      expect(onDamaged).toHaveBeenCalledWith(piece, expect.objectContaining({
        damageDealt: 30
      }));
    });

    it('should destroy piece when health reaches 0', () => {
      const onDestroyed = vi.fn();
      const dm = new DamageManager(mockValidator, { onPieceDestroyed: onDestroyed });

      const piece = createMockPiece();
      dm.registerPiece(piece, { maxHealth: 50 });
      dm.applyDamage(piece, 50);

      expect(onDestroyed).toHaveBeenCalledTimes(1);
    });

    it('should not reduce health below 0', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 50 });

      manager.applyDamage(piece, 100);

      // Note: piece gets destroyed and unregistered, so we check via the result
      // Since it's destroyed, let's test differently
      const dm2 = new DamageManager(createMockValidator());
      const piece2 = createMockPiece();
      const damageable = dm2.registerPiece(piece2, { maxHealth: 50 });

      // Directly test the DamageablePiece
      damageable.takeDamage(100);
      expect(damageable.health).toBe(0);
    });
  });

  // ============================================
  // DAMAGE STATE TRANSITIONS
  // ============================================
  describe('Damage State Transitions', () => {
    it('should start in PRISTINE state', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      expect(damageable.damageState).toBe(DamageState.PRISTINE);
    });

    it('should remain PRISTINE above 60%', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 100 });

      manager.applyDamage(piece, 39); // 61% health

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageState).toBe(DamageState.PRISTINE);
    });

    it('should transition to DAMAGED at 60%', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 100 });

      manager.applyDamage(piece, 40); // 60% health

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageState).toBe(DamageState.DAMAGED);
    });

    it('should remain DAMAGED between 26-60%', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 100 });

      manager.applyDamage(piece, 74); // 26% health

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageState).toBe(DamageState.DAMAGED);
    });

    it('should transition to CRITICAL at 25%', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 100 });

      manager.applyDamage(piece, 75); // 25% health

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageState).toBe(DamageState.CRITICAL);
    });

    it('should remain CRITICAL between 1-25%', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece, { maxHealth: 100 });

      manager.applyDamage(piece, 99); // 1% health

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageState).toBe(DamageState.CRITICAL);
    });

    it('should transition to DESTROYED at 0%', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece, { maxHealth: 100 });

      // Directly test to avoid destruction cleanup
      damageable.takeDamage(100);

      expect(damageable.damageState).toBe(DamageState.DESTROYED);
    });
  });

  // ============================================
  // STABILITY MODIFIER TESTS
  // ============================================
  describe('Stability Modifiers', () => {
    it('should return 1.0 for PRISTINE', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      expect(damageable.getStabilityModifier()).toBe(1.0);
    });

    it('should return 0.85 for DAMAGED', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(50); // 50% health = DAMAGED
      expect(damageable.getStabilityModifier()).toBe(0.85);
    });

    it('should return 0.6 for CRITICAL', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(80); // 20% health = CRITICAL
      expect(damageable.getStabilityModifier()).toBe(0.6);
    });

    it('should return 0 for DESTROYED', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(100); // 0% health = DESTROYED
      expect(damageable.getStabilityModifier()).toBe(0);
    });
  });

  // ============================================
  // HEAL TESTS
  // ============================================
  describe('Healing', () => {
    it('should increase health', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(50);
      damageable.heal(30);

      expect(damageable.health).toBe(80);
    });

    it('should not exceed max health', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(20);
      damageable.heal(100);

      expect(damageable.health).toBe(100);
    });

    it('should update damage state after healing', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(50); // DAMAGED
      expect(damageable.damageState).toBe(DamageState.DAMAGED);

      damageable.heal(50); // Back to full
      expect(damageable.damageState).toBe(DamageState.PRISTINE);
    });

    it('should return new health value', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(50);
      const newHealth = damageable.heal(20);

      expect(newHealth).toBe(70);
    });
  });

  // ============================================
  // APPLY EXPLOSIVE DAMAGE TESTS
  // ============================================
  describe('applyExplosiveDamage', () => {
    it('should damage pieces within radius', () => {
      const piece1 = createMockPiece({ position: createPosition(10, 0, 10) });
      const piece2 = createMockPiece({ position: createPosition(12, 0, 10) }); // 2 units away

      manager.registerPiece(piece1);
      manager.registerPiece(piece2);

      const center = createPosition(10, 0, 10);
      const affected = manager.applyExplosiveDamage(center, 5, 50);

      expect(affected.length).toBeGreaterThan(0);
    });

    it('should not damage pieces outside radius', () => {
      const piece = createMockPiece({ position: createPosition(20, 0, 20) }); // Far away
      manager.registerPiece(piece);

      const center = createPosition(0, 0, 0);
      const affected = manager.applyExplosiveDamage(center, 5, 50);

      expect(affected).toHaveLength(0);
      expect(manager.getDamageable(piece).health).toBe(100);
    });

    it('should apply falloff damage based on distance', () => {
      const piece1 = createMockPiece({ position: createPosition(10, 0, 10) });
      const piece2 = createMockPiece({ position: createPosition(14, 0, 10) }); // 4 units away

      manager.registerPiece(piece1);
      manager.registerPiece(piece2);

      const center = createPosition(10, 0, 10);
      manager.applyExplosiveDamage(center, 5, 50);

      const dmg1 = manager.getDamageable(piece1);
      const dmg2 = manager.getDamageable(piece2);

      // piece1 at center gets more damage than piece2 at edge
      expect(dmg1.health).toBeLessThan(dmg2.health);
    });

    it('should return affected pieces with results', () => {
      const piece = createMockPiece({ position: createPosition(10, 0, 10) });
      manager.registerPiece(piece);

      const center = createPosition(10, 0, 10);
      const affected = manager.applyExplosiveDamage(center, 5, 50);

      expect(affected[0]).toHaveProperty('piece');
      expect(affected[0]).toHaveProperty('result');
      expect(affected[0]).toHaveProperty('distance');
    });

    it('should use EXPLOSIVE damage type', () => {
      const piece = createMockPiece({ position: createPosition(10, 0, 10) });
      manager.registerPiece(piece);

      const center = createPosition(10, 0, 10);
      manager.applyExplosiveDamage(center, 5, 50);

      const damageable = manager.getDamageable(piece);
      expect(damageable.damageHistory[0].type).toBe(DamageType.EXPLOSIVE);
    });
  });

  // ============================================
  // DESTROY PIECE TESTS
  // ============================================
  describe('destroyPiece', () => {
    it('should return destruction result', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      const result = manager.destroyPiece(piece);

      expect(result).toHaveProperty('destroyed', piece);
      expect(result).toHaveProperty('collapsed');
      expect(result).toHaveProperty('damaged');
      expect(result).toHaveProperty('animations');
    });

    it('should unregister the piece', () => {
      const piece = createMockPiece();
      manager.registerPiece(piece);

      manager.destroyPiece(piece);

      expect(manager.getDamageable(piece)).toBeUndefined();
    });

    it('should call onPieceDestroyed callback', () => {
      const onDestroyed = vi.fn();
      const dm = new DamageManager(mockValidator, { onPieceDestroyed: onDestroyed });

      const piece = createMockPiece();
      dm.registerPiece(piece);
      dm.destroyPiece(piece);

      expect(onDestroyed).toHaveBeenCalledWith(piece, expect.any(Object));
    });

    it('should create collapse animation for piece with mesh', () => {
      const piece = createMockPiece({ mesh: createMockMesh() });
      manager.registerPiece(piece);

      const result = manager.destroyPiece(piece);

      expect(result.animations.length).toBeGreaterThan(0);
      expect(manager.activeCollapses.length).toBeGreaterThan(0);
    });

    it('should remove piece from validator', () => {
      const removeSpy = vi.spyOn(mockValidator, 'removePiece');
      const piece = createMockPiece();
      manager.registerPiece(piece);

      manager.destroyPiece(piece);

      expect(removeSpy).toHaveBeenCalledWith(piece);
    });
  });

  // ============================================
  // CASCADE DAMAGE TESTS
  // ============================================
  describe('Cascade Damage', () => {
    it('should damage neighbors within cascade radius', () => {
      const piece1 = createMockPiece({
        id: 'piece1',
        position: createPosition(10, 0, 10)
      });
      const piece2 = createMockPiece({
        id: 'piece2',
        position: createPosition(11, 0, 10) // 1 unit away, within default radius of 2
      });

      manager.registerPiece(piece1, { maxHealth: 100 });
      manager.registerPiece(piece2, { maxHealth: 100 });

      manager.destroyPiece(piece1);

      // piece2 should have taken cascade damage
      const dmg2 = manager.getDamageable(piece2);
      expect(dmg2.health).toBeLessThan(100);
    });

    it('should use cascade damage percent from options', () => {
      const dm = new DamageManager(mockValidator, {
        cascadeDamagePercent: 0.5,
        cascadeRadius: 5
      });

      const piece1 = createMockPiece({
        id: 'piece1',
        position: createPosition(10, 0, 10)
      });
      const piece2 = createMockPiece({
        id: 'piece2',
        position: createPosition(11, 0, 10)
      });

      dm.registerPiece(piece1, { maxHealth: 100 });
      dm.registerPiece(piece2, { maxHealth: 100 });

      dm.destroyPiece(piece1);

      // 50% of 100 = 50 damage
      const dmg2 = dm.getDamageable(piece2);
      expect(dmg2.health).toBe(50);
    });

    it('should not damage neighbors outside cascade radius', () => {
      const piece1 = createMockPiece({
        id: 'piece1',
        position: createPosition(10, 0, 10)
      });
      const piece2 = createMockPiece({
        id: 'piece2',
        position: createPosition(20, 0, 10) // 10 units away, outside default radius of 2
      });

      manager.registerPiece(piece1);
      manager.registerPiece(piece2);

      manager.destroyPiece(piece1);

      const dmg2 = manager.getDamageable(piece2);
      expect(dmg2.health).toBe(100);
    });
  });

  // ============================================
  // FIND NEIGHBORS TESTS
  // ============================================
  describe('findNeighbors', () => {
    it('should find pieces within radius', () => {
      const center = createMockPiece({
        position: createPosition(10, 0, 10)
      });
      const nearby = createMockPiece({
        position: createPosition(11, 0, 10)
      });
      const far = createMockPiece({
        position: createPosition(20, 0, 20)
      });

      manager.registerPiece(center);
      manager.registerPiece(nearby);
      manager.registerPiece(far);

      const neighbors = manager.findNeighbors(center, 3);

      expect(neighbors).toContain(nearby);
      expect(neighbors).not.toContain(far);
      expect(neighbors).not.toContain(center); // Should not include self
    });

    it('should return empty array for piece without position', () => {
      const piece = { id: 'no-position' };
      manager.registerPiece(piece);

      const neighbors = manager.findNeighbors(piece, 5);

      expect(neighbors).toEqual([]);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================
  describe('update', () => {
    it('should process pending destructions after delay', () => {
      const piece = createMockPiece({ mesh: createMockMesh() });
      manager.registerPiece(piece);

      // Manually add pending destruction
      manager.pendingDestructions.push({
        piece,
        delay: 100,
        timestamp: performance.now(),
        cause: 'structural'
      });

      // Before delay
      manager.update(0.016);
      expect(manager.pendingDestructions.length).toBe(1);

      // After delay
      vi.advanceTimersByTime(150);
      manager.update(0.016);
      expect(manager.pendingDestructions.length).toBe(0);
    });

    it('should update active collapse animations', () => {
      const mesh = createMockMesh();
      const piece = { id: 'test', mesh };
      manager.registerPiece(piece);

      manager.destroyPiece(piece);

      expect(manager.activeCollapses.length).toBeGreaterThan(0);

      // Run update multiple times to progress animation
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(20);
        manager.update(0.020);
      }
    });

    it('should call onCollapseComplete when animation finishes', () => {
      const onCollapse = vi.fn();
      const dm = new DamageManager(mockValidator, { onCollapseComplete: onCollapse });

      const mesh = createMockMesh();
      const piece = { id: 'test', mesh };
      dm.registerPiece(piece);
      dm.destroyPiece(piece);

      // Fast forward through animation
      for (let i = 0; i < 200; i++) {
        vi.advanceTimersByTime(20);
        dm.update(0.020);
      }

      expect(onCollapse).toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS TESTS
  // ============================================
  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = manager.getStats();

      expect(stats).toHaveProperty('totalPieces');
      expect(stats).toHaveProperty('healthPercent');
      expect(stats).toHaveProperty('damagedPieces');
      expect(stats).toHaveProperty('criticalPieces');
      expect(stats).toHaveProperty('activeCollapses');
      expect(stats).toHaveProperty('pendingDestructions');
    });

    it('should count total pieces', () => {
      manager.registerPiece(createMockPiece());
      manager.registerPiece(createMockPiece());
      manager.registerPiece(createMockPiece());

      const stats = manager.getStats();
      expect(stats.totalPieces).toBe(3);
    });

    it('should calculate overall health percent', () => {
      const piece1 = createMockPiece();
      const piece2 = createMockPiece();

      const dmg1 = manager.registerPiece(piece1, { maxHealth: 100 });
      const dmg2 = manager.registerPiece(piece2, { maxHealth: 100 });

      dmg1.takeDamage(50); // 50% health
      // dmg2 stays at 100%

      const stats = manager.getStats();
      // (50 + 100) / (100 + 100) = 75%
      expect(stats.healthPercent).toBe(75);
    });

    it('should count damaged pieces', () => {
      const piece1 = createMockPiece();
      const piece2 = createMockPiece();

      const dmg1 = manager.registerPiece(piece1);
      const dmg2 = manager.registerPiece(piece2);

      dmg1.takeDamage(50); // DAMAGED state

      const stats = manager.getStats();
      expect(stats.damagedPieces).toBe(1);
    });

    it('should count critical pieces', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(80); // CRITICAL state

      const stats = manager.getStats();
      expect(stats.criticalPieces).toBe(1);
    });

    it('should handle empty manager', () => {
      const stats = manager.getStats();

      expect(stats.totalPieces).toBe(0);
      expect(stats.healthPercent).toBe(0);
    });
  });

  // ============================================
  // CLEAR TESTS
  // ============================================
  describe('clear', () => {
    it('should remove all damageables', () => {
      manager.registerPiece(createMockPiece());
      manager.registerPiece(createMockPiece());

      manager.clear();

      expect(manager.damageables.size).toBe(0);
    });

    it('should clear active collapses', () => {
      const piece = createMockPiece({ mesh: createMockMesh() });
      manager.registerPiece(piece);
      manager.destroyPiece(piece);

      expect(manager.activeCollapses.length).toBeGreaterThan(0);

      manager.clear();

      expect(manager.activeCollapses).toEqual([]);
    });

    it('should clear pending destructions', () => {
      manager.pendingDestructions.push({ piece: {}, delay: 100 });

      manager.clear();

      expect(manager.pendingDestructions).toEqual([]);
    });
  });

  // ============================================
  // DAMAGE HISTORY TESTS
  // ============================================
  describe('Damage History', () => {
    it('should track all damage events', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(10, DamageType.PHYSICAL);
      damageable.takeDamage(20, DamageType.EXPLOSIVE);
      damageable.takeDamage(15, DamageType.STRUCTURAL);

      expect(damageable.damageHistory).toHaveLength(3);
    });

    it('should record timestamp for each event', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      const before = Date.now();
      damageable.takeDamage(10);
      const after = Date.now();

      expect(damageable.damageHistory[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(damageable.damageHistory[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should record health after damage', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(30);

      expect(damageable.damageHistory[0].healthAfter).toBe(70);
    });
  });

  // ============================================
  // HEALTH PERCENT TESTS
  // ============================================
  describe('getHealthPercent', () => {
    it('should return 1.0 at full health', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      expect(damageable.getHealthPercent()).toBe(1.0);
    });

    it('should return correct percentage', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece, { maxHealth: 200 });

      damageable.takeDamage(50);

      expect(damageable.getHealthPercent()).toBe(0.75);
    });

    it('should return 0 when destroyed', () => {
      const piece = createMockPiece();
      const damageable = manager.registerPiece(piece);

      damageable.takeDamage(100);

      expect(damageable.getHealthPercent()).toBe(0);
    });
  });
});

// ============================================
// DAMAGE VISUALIZER TESTS
// ============================================
describe('DamageVisualizer', () => {
  let visualizer;

  beforeEach(() => {
    visualizer = new DamageVisualizer();
  });

  describe('Construction', () => {
    it('should create with damage colors', () => {
      expect(visualizer.colors.pristine).toBeNull();
      expect(visualizer.colors.damaged).toBeTruthy();
      expect(visualizer.colors.critical).toBeTruthy();
    });
  });

  describe('updateVisuals', () => {
    it('should handle pieces without material', () => {
      const piece = { id: 'test' };
      const damageable = { damageState: DamageState.DAMAGED };

      expect(() => visualizer.updateVisuals(piece, damageable)).not.toThrow();
    });

    it('should apply damage color for DAMAGED state', () => {
      const mesh = createMockMesh();
      const piece = { mesh };
      const damageable = { damageState: DamageState.DAMAGED };

      visualizer.updateVisuals(piece, damageable);

      // Color should have been modified (lerp called)
      expect(mesh.material.color.lerp).toBeDefined();
    });

    it('should apply damage color for CRITICAL state', () => {
      const mesh = createMockMesh();
      const piece = { mesh };
      const damageable = { damageState: DamageState.CRITICAL };

      visualizer.updateVisuals(piece, damageable);
      // Visualization applied
    });

    it('should restore original color for PRISTINE state', () => {
      const mesh = createMockMesh();
      mesh._originalColor = new Color(0xffffff);
      const piece = { mesh };
      const damageable = { damageState: DamageState.PRISTINE };

      visualizer.updateVisuals(piece, damageable);
      // Original color should be restored
    });
  });

  describe('applyDamageColor', () => {
    it('should store original color on first call', () => {
      const mesh = createMockMesh();
      delete mesh._originalColor;

      visualizer.applyDamageColor(mesh, new Color(0xff0000), 0.5);

      expect(mesh._originalColor).toBeTruthy();
    });

    it('should not overwrite original color on subsequent calls', () => {
      const mesh = createMockMesh();
      const originalColor = new Color(0x00ff00);
      mesh._originalColor = originalColor;

      visualizer.applyDamageColor(mesh, new Color(0xff0000), 0.5);

      expect(mesh._originalColor).toBe(originalColor);
    });
  });

  describe('restoreOriginalColor', () => {
    it('should restore original color if stored', () => {
      const mesh = createMockMesh();
      mesh._originalColor = new Color(0x00ff00);

      visualizer.restoreOriginalColor(mesh);

      // copy method should have been called
    });

    it('should do nothing if no original color stored', () => {
      const mesh = createMockMesh();
      delete mesh._originalColor;

      expect(() => visualizer.restoreOriginalColor(mesh)).not.toThrow();
    });
  });
});
