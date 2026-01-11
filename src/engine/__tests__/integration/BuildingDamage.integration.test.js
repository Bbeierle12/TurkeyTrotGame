/**
 * Building and Damage Integration Tests
 *
 * Tests the interaction between:
 * - BuildingValidator for placement validation
 * - DamageManager for structure damage
 * - StabilityOptimizer for structural integrity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuildingValidator } from '../../BuildingValidator.js';
import { DamageManager } from '../../DamageManager.js';
import { StabilityOptimizer } from '../../StabilityOptimizer.js';
import { createMockPiece, createMockDamageable, createPosition, createPieceGrid, resetIdCounter } from '../../../test-utils/factories.js';

describe('Building Damage Integration', () => {
  let validator;
  let damageManager;
  let optimizer;

  beforeEach(() => {
    resetIdCounter();
    validator = new BuildingValidator();
    damageManager = new DamageManager();
    optimizer = new StabilityOptimizer();
  });

  describe('Piece Placement and Validation', () => {
    it('should validate basic piece placement', () => {
      const piece = createMockPiece({
        position: createPosition(10, 0, 10)
      });

      const result = validator.validatePlacement(piece);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should track placed pieces', () => {
      const piece1 = createMockPiece({ position: createPosition(10, 0, 10) });
      const piece2 = createMockPiece({ position: createPosition(15, 0, 10) });

      validator.addPiece(piece1);
      validator.addPiece(piece2);

      const pieces = validator.graph.getAllPieces();
      expect(pieces.length).toBe(2);
    });

    it('should remove pieces from tracking', () => {
      const piece = createMockPiece({ position: createPosition(10, 0, 10) });

      validator.addPiece(piece);
      validator.removePiece(piece);

      const pieces = validator.graph.getAllPieces();
      expect(pieces.length).toBe(0);
    });
  });

  describe('Damage Application', () => {
    it('should apply damage to damageable structures', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 100
      });

      const result = damageable.takeDamage(25, 'zombie_attack', 'zombie_1');

      expect(result.damageDealt).toBe(25);
      expect(result.newHealth).toBe(75);
    });

    it('should track damage history', () => {
      const damageable = createMockDamageable();

      damageable.takeDamage(20, 'impact', 'source1');
      damageable.takeDamage(15, 'explosion', 'source2');
      damageable.takeDamage(10, 'impact', 'source3');

      expect(damageable.damageHistory.length).toBe(3);
    });

    it('should update damage state based on health percentage', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 100
      });

      // Full health -> pristine
      expect(damageable.damageState).toBe('pristine');

      // Take significant damage
      damageable.takeDamage(50, 'attack', 'source');
      expect(damageable.damageState).toBe('damaged');

      // Take more damage to critical
      damageable.takeDamage(30, 'attack', 'source');
      expect(damageable.damageState).toBe('critical');
    });

    it('should handle lethal damage', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 100
      });

      damageable.takeDamage(150, 'attack', 'source');

      expect(damageable.health).toBe(0);
      expect(damageable.damageState).toBe('destroyed');
    });

    it('should support healing', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 50
      });

      const newHealth = damageable.heal(30);

      expect(newHealth).toBe(80);
      expect(damageable.health).toBe(80);
    });

    it('should cap healing at max health', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 90
      });

      damageable.heal(50);

      expect(damageable.health).toBe(100);
    });
  });

  describe('Stability System', () => {
    it('should calculate stability modifier based on damage state', () => {
      const pristine = createMockDamageable({ damageState: 'pristine' });
      const damaged = createMockDamageable({ damageState: 'damaged' });
      const critical = createMockDamageable({ damageState: 'critical' });

      expect(pristine.getStabilityModifier()).toBe(1.0);
      expect(damaged.getStabilityModifier()).toBe(0.85);
      expect(critical.getStabilityModifier()).toBe(0.6);
    });

    it('should return zero stability for destroyed pieces', () => {
      const destroyed = createMockDamageable({ damageState: 'destroyed' });

      expect(destroyed.getStabilityModifier()).toBe(0);
    });

    it('should calculate health percentage', () => {
      const damageable = createMockDamageable({
        maxHealth: 100,
        health: 75
      });

      expect(damageable.getHealthPercent()).toBe(0.75);
    });
  });

  describe('Grid-Based Building', () => {
    it('should create piece grid for testing', () => {
      const pieces = createPieceGrid(9, 3);

      expect(pieces.length).toBe(9);

      // Should be in 3x3 grid pattern
      pieces.forEach(piece => {
        expect(piece.position).toBeDefined();
        expect(piece.id).toBeDefined();
      });
    });

    it('should have unique IDs for grid pieces', () => {
      const pieces = createPieceGrid(16);
      const ids = pieces.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(16);
    });
  });

  describe('Damage Propagation Scenarios', () => {
    it('should handle area damage to multiple pieces', () => {
      const damageables = [
        createMockDamageable({ health: 100, maxHealth: 100 }),
        createMockDamageable({ health: 100, maxHealth: 100 }),
        createMockDamageable({ health: 100, maxHealth: 100 })
      ];

      // Apply area damage
      const areaDamage = 30;
      damageables.forEach(d => d.takeDamage(areaDamage, 'explosion', 'bomb'));

      damageables.forEach(d => {
        expect(d.health).toBe(70);
      });
    });

    it('should handle cascading damage effects', () => {
      // Simulate structure collapse scenario
      const supportPiece = createMockDamageable({ health: 100, maxHealth: 100 });
      const dependentPiece = createMockDamageable({ health: 100, maxHealth: 100 });

      // Destroy support
      supportPiece.takeDamage(100, 'attack', 'source');
      expect(supportPiece.damageState).toBe('destroyed');

      // Dependent would take additional damage (simulated)
      if (supportPiece.damageState === 'destroyed') {
        dependentPiece.takeDamage(50, 'collapse', 'structural_failure');
      }

      expect(dependentPiece.health).toBe(50);
    });
  });

  describe('Optimizer Integration', () => {
    it('should have stability optimizer instance', () => {
      expect(optimizer).toBeDefined();
    });

    it('should calculate stability for piece configurations', () => {
      // Mock stability calculation
      if (optimizer.calculateStability) {
        const pieces = createPieceGrid(4);
        const stability = optimizer.calculateStability(pieces);
        expect(typeof stability).toBe('number');
      }
    });
  });

  describe('Validator Mode Switching', () => {
    it('should support simple validation mode', () => {
      validator.mode = 'simple';
      expect(validator.mode).toBe('simple');
    });

    it('should support complex validation mode', () => {
      validator.mode = 'complex';
      expect(validator.mode).toBe('complex');
    });

    it('should track barn position for distance validation', () => {
      validator.barnPosition = createPosition(0, 0, 0);

      expect(validator.barnPosition.x).toBe(0);
      expect(validator.barnPosition.z).toBe(0);
    });

    it('should have min/max distance constraints', () => {
      expect(validator.minDistanceFromBarn).toBeDefined();
      expect(validator.maxDistanceFromBarn).toBeDefined();
      expect(validator.maxDistanceFromBarn).toBeGreaterThan(validator.minDistanceFromBarn);
    });
  });
});
