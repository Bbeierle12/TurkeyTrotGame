/**
 * Spatial Combat Integration Tests
 *
 * Tests the interaction between:
 * - SpatialHashGrid2D for efficient collision detection
 * - Combat system for damage application
 * - Turkey AI and movement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpatialHashGrid2D } from '../../SpatialHashGrid2D.js';
import { createMockTurkey, createMockProjectile, createPosition, resetIdCounter } from '../../../test-utils/factories.js';

describe('Spatial Combat Integration', () => {
  let grid;

  beforeEach(() => {
    resetIdCounter();
    grid = new SpatialHashGrid2D(5);
  });

  describe('Turkey Spatial Queries', () => {
    it('should find nearby turkeys for splash damage', () => {
      // Place turkeys in a cluster
      const turkey1 = createMockTurkey({ pos: createPosition(10, 0, 10) });
      const turkey2 = createMockTurkey({ pos: createPosition(12, 0, 10) });
      const turkey3 = createMockTurkey({ pos: createPosition(10, 0, 12) });
      const farTurkey = createMockTurkey({ pos: createPosition(50, 0, 50) });

      grid.insert(turkey1, turkey1.pos);
      grid.insert(turkey2, turkey2.pos);
      grid.insert(turkey3, turkey3.pos);
      grid.insert(farTurkey, farTurkey.pos);

      // Query for splash radius
      const splashRadius = 5;
      const splashCenter = createPosition(11, 0, 11);
      const nearby = grid.queryRadius(splashCenter, splashRadius);

      expect(nearby).toContain(turkey1);
      expect(nearby).toContain(turkey2);
      expect(nearby).toContain(turkey3);
      expect(nearby).not.toContain(farTurkey);
    });

    it('should handle turkeys moving between cells', () => {
      const turkey = createMockTurkey({ pos: createPosition(0, 0, 0) });

      grid.insert(turkey, turkey.pos);

      // Move turkey to new position
      const newPos = createPosition(20, 0, 20);
      grid.update(turkey, newPos);
      turkey.pos = newPos;

      // Should be findable at new position
      const nearby = grid.queryRadius(newPos, 5);
      expect(nearby).toContain(turkey);

      // Should not be at old position
      const oldNearby = grid.queryRadius(createPosition(0, 0, 0), 3);
      expect(oldNearby).not.toContain(turkey);
    });

    it('should efficiently handle many turkeys', () => {
      const turkeys = [];

      // Add 100 turkeys in a spread pattern
      for (let i = 0; i < 100; i++) {
        const turkey = createMockTurkey({
          pos: createPosition(
            Math.random() * 100 - 50,
            0,
            Math.random() * 100 - 50
          )
        });
        turkeys.push(turkey);
        grid.insert(turkey, turkey.pos);
      }

      // Query should return subset, not all
      const queryCenter = createPosition(0, 0, 0);
      const nearby = grid.queryRadius(queryCenter, 10);

      // Should not return all turkeys (unless extremely unlucky distribution)
      expect(nearby.length).toBeLessThan(100);
    });

    it('should remove dead turkeys from grid', () => {
      const turkey = createMockTurkey({ pos: createPosition(10, 0, 10) });
      grid.insert(turkey, turkey.pos);

      // Verify turkey is in grid
      let nearby = grid.queryRadius(turkey.pos, 5);
      expect(nearby).toContain(turkey);

      // Remove turkey
      grid.remove(turkey);

      // Should no longer find it
      nearby = grid.queryRadius(turkey.pos, 5);
      expect(nearby).not.toContain(turkey);
    });
  });

  describe('Projectile-Turkey Collision', () => {
    it('should detect projectile hitting turkey', () => {
      const turkey = createMockTurkey({
        pos: createPosition(20, 0, 20),
        hp: 100
      });

      const projectile = createMockProjectile({
        pos: createPosition(20, 1, 20),
        damage: 30
      });

      grid.insert(turkey, turkey.pos);

      // Check for collision
      const hitRadius = 1.5; // Turkey hitbox
      const nearby = grid.queryRadius(projectile.pos, hitRadius);

      expect(nearby).toContain(turkey);
    });

    it('should support pierce mechanic across multiple turkeys', () => {
      // Line of turkeys
      const turkey1 = createMockTurkey({ pos: createPosition(10, 0, 10) });
      const turkey2 = createMockTurkey({ pos: createPosition(12, 0, 10) });
      const turkey3 = createMockTurkey({ pos: createPosition(14, 0, 10) });

      grid.insert(turkey1, turkey1.pos);
      grid.insert(turkey2, turkey2.pos);
      grid.insert(turkey3, turkey3.pos);

      // Projectile path
      const projectileStart = createPosition(10, 1, 10);

      // Query along path
      const nearby1 = grid.queryRadius(createPosition(10, 1, 10), 1.5);
      const nearby2 = grid.queryRadius(createPosition(12, 1, 10), 1.5);
      const nearby3 = grid.queryRadius(createPosition(14, 1, 10), 1.5);

      expect(nearby1).toContain(turkey1);
      expect(nearby2).toContain(turkey2);
      expect(nearby3).toContain(turkey3);
    });

    it('should support splash damage radius query', () => {
      // Cluster of turkeys
      const turkeys = [];
      for (let i = 0; i < 5; i++) {
        const turkey = createMockTurkey({
          pos: createPosition(
            25 + (Math.random() * 4 - 2),
            0,
            25 + (Math.random() * 4 - 2)
          )
        });
        turkeys.push(turkey);
        grid.insert(turkey, turkey.pos);
      }

      // Splash center
      const splashCenter = createPosition(25, 0, 25);
      const splashRadius = 5;

      const affected = grid.queryRadius(splashCenter, splashRadius);

      // All should be affected by splash
      turkeys.forEach(turkey => {
        expect(affected).toContain(turkey);
      });
    });
  });

  describe('Turkey-Barn Proximity', () => {
    it('should detect turkeys near barn', () => {
      const barnPos = createPosition(0, 0, 0);

      // Turkey approaching barn
      const nearTurkey = createMockTurkey({ pos: createPosition(3, 0, 0) });
      const farTurkey = createMockTurkey({ pos: createPosition(30, 0, 30) });

      grid.insert(nearTurkey, nearTurkey.pos);
      grid.insert(farTurkey, farTurkey.pos);

      // Attack range query
      const attackRange = 5;
      const nearBarn = grid.queryRadius(barnPos, attackRange);

      expect(nearBarn).toContain(nearTurkey);
      expect(nearBarn).not.toContain(farTurkey);
    });
  });

  describe('Turret Range Queries', () => {
    it('should find turkeys in turret range', () => {
      const turretPos = createPosition(15, 0, 15);
      const turretRange = 8;

      // Turkeys at various distances
      const inRange1 = createMockTurkey({ pos: createPosition(18, 0, 15) }); // 3 units
      const inRange2 = createMockTurkey({ pos: createPosition(15, 0, 22) }); // 7 units
      const outOfRange = createMockTurkey({ pos: createPosition(15, 0, 30) }); // 15 units

      grid.insert(inRange1, inRange1.pos);
      grid.insert(inRange2, inRange2.pos);
      grid.insert(outOfRange, outOfRange.pos);

      const targets = grid.queryRadius(turretPos, turretRange);

      expect(targets).toContain(inRange1);
      expect(targets).toContain(inRange2);
      expect(targets).not.toContain(outOfRange);
    });

    it('should prioritize closest turkey for targeting', () => {
      const turretPos = createPosition(0, 0, 0);

      const close = createMockTurkey({ pos: createPosition(3, 0, 0) });
      const medium = createMockTurkey({ pos: createPosition(6, 0, 0) });
      const far = createMockTurkey({ pos: createPosition(9, 0, 0) });

      grid.insert(close, close.pos);
      grid.insert(medium, medium.pos);
      grid.insert(far, far.pos);

      const targets = grid.queryRadius(turretPos, 10);

      // All should be found
      expect(targets.length).toBe(3);

      // Sort by distance (simulating turret targeting logic)
      targets.sort((a, b) => {
        const distA = Math.hypot(a.pos.x - turretPos.x, a.pos.z - turretPos.z);
        const distB = Math.hypot(b.pos.x - turretPos.x, b.pos.z - turretPos.z);
        return distA - distB;
      });

      expect(targets[0]).toBe(close);
      expect(targets[1]).toBe(medium);
      expect(targets[2]).toBe(far);
    });
  });

  describe('Cell Boundary Handling', () => {
    it('should find objects near cell boundaries', () => {
      // Objects at cell size 5 boundary
      const obj1 = createMockTurkey({ pos: createPosition(4.9, 0, 0) });
      const obj2 = createMockTurkey({ pos: createPosition(5.1, 0, 0) });

      grid.insert(obj1, obj1.pos);
      grid.insert(obj2, obj2.pos);

      // Query that spans boundary
      const nearby = grid.queryRadius(createPosition(5, 0, 0), 1);

      expect(nearby).toContain(obj1);
      expect(nearby).toContain(obj2);
    });

    it('should handle objects at negative coordinates', () => {
      const negObj = createMockTurkey({ pos: createPosition(-10, 0, -10) });

      grid.insert(negObj, negObj.pos);

      const nearby = grid.queryRadius(createPosition(-10, 0, -10), 5);
      expect(nearby).toContain(negObj);
    });

    it('should handle objects at origin', () => {
      const originObj = createMockTurkey({ pos: createPosition(0, 0, 0) });

      grid.insert(originObj, originObj.pos);

      const nearby = grid.queryRadius(createPosition(0, 0, 0), 1);
      expect(nearby).toContain(originObj);
    });
  });

  describe('Grid Clear and Reset', () => {
    it('should clear all objects from grid', () => {
      // Add several objects
      for (let i = 0; i < 10; i++) {
        const obj = createMockTurkey({
          pos: createPosition(i * 5, 0, i * 5)
        });
        grid.insert(obj, obj.pos);
      }

      // Clear grid
      grid.clear();

      // Should find nothing
      const nearby = grid.queryRadius(createPosition(0, 0, 0), 100);
      expect(nearby.length).toBe(0);
    });

    it('should allow re-insertion after clear', () => {
      const obj = createMockTurkey({ pos: createPosition(10, 0, 10) });

      grid.insert(obj, obj.pos);
      grid.clear();

      // Re-insert
      grid.insert(obj, obj.pos);

      const nearby = grid.queryRadius(obj.pos, 5);
      expect(nearby).toContain(obj);
    });
  });
});
