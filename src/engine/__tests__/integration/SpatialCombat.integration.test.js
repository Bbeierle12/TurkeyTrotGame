/**
 * Spatial Combat Integration Tests
 *
 * Tests the interaction between:
 * - SpatialHashGrid2D for efficient collision detection
 * - Combat system for damage application
 * - Zombie AI and movement (Homestead Siege theme)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpatialHashGrid2D } from '../../SpatialHashGrid2D.js';
import { createMockZombie, createMockProjectile, createPosition, resetIdCounter } from '../../../test-utils/factories.js';

describe('Spatial Combat Integration', () => {
  let grid;

  beforeEach(() => {
    resetIdCounter();
    grid = new SpatialHashGrid2D(5);
  });

  describe('Zombie Spatial Queries', () => {
    it('should find nearby zombies for splash damage', () => {
      // Place zombies in a cluster
      const zombie1 = createMockZombie({ pos: createPosition(10, 0, 10) });
      const zombie2 = createMockZombie({ pos: createPosition(12, 0, 10) });
      const zombie3 = createMockZombie({ pos: createPosition(10, 0, 12) });
      const farZombie = createMockZombie({ pos: createPosition(50, 0, 50) });

      grid.insert(zombie1, zombie1.pos);
      grid.insert(zombie2, zombie2.pos);
      grid.insert(zombie3, zombie3.pos);
      grid.insert(farZombie, farZombie.pos);

      // Query for splash radius
      const splashRadius = 5;
      const splashCenter = createPosition(11, 0, 11);
      const nearby = grid.queryRadius(splashCenter, splashRadius);

      expect(nearby).toContain(zombie1);
      expect(nearby).toContain(zombie2);
      expect(nearby).toContain(zombie3);
      expect(nearby).not.toContain(farZombie);
    });

    it('should handle zombies moving between cells', () => {
      const zombie = createMockZombie({ pos: createPosition(0, 0, 0) });

      grid.insert(zombie, zombie.pos);

      // Move zombie to new position
      const newPos = createPosition(20, 0, 20);
      grid.update(zombie, newPos);
      zombie.pos = newPos;

      // Should be findable at new position
      const nearby = grid.queryRadius(newPos, 5);
      expect(nearby).toContain(zombie);

      // Should not be at old position
      const oldNearby = grid.queryRadius(createPosition(0, 0, 0), 3);
      expect(oldNearby).not.toContain(zombie);
    });

    it('should efficiently handle many zombies', () => {
      const zombies = [];

      // Add 100 zombies in a spread pattern
      for (let i = 0; i < 100; i++) {
        const zombie = createMockZombie({
          pos: createPosition(
            Math.random() * 100 - 50,
            0,
            Math.random() * 100 - 50
          )
        });
        zombies.push(zombie);
        grid.insert(zombie, zombie.pos);
      }

      // Query should return subset, not all
      const queryCenter = createPosition(0, 0, 0);
      const nearby = grid.queryRadius(queryCenter, 10);

      // Should not return all zombies (unless extremely unlucky distribution)
      expect(nearby.length).toBeLessThan(100);
    });

    it('should remove dead zombies from grid', () => {
      const zombie = createMockZombie({ pos: createPosition(10, 0, 10) });
      grid.insert(zombie, zombie.pos);

      // Verify zombie is in grid
      let nearby = grid.queryRadius(zombie.pos, 5);
      expect(nearby).toContain(zombie);

      // Remove zombie
      grid.remove(zombie);

      // Should no longer find it
      nearby = grid.queryRadius(zombie.pos, 5);
      expect(nearby).not.toContain(zombie);
    });
  });

  describe('Projectile-Zombie Collision', () => {
    it('should detect projectile hitting zombie', () => {
      const zombie = createMockZombie({
        pos: createPosition(20, 0, 20),
        hp: 100
      });

      const projectile = createMockProjectile({
        pos: createPosition(20, 1, 20),
        damage: 30
      });

      grid.insert(zombie, zombie.pos);

      // Check for collision
      const hitRadius = 1.5; // Zombie hitbox
      const nearby = grid.queryRadius(projectile.pos, hitRadius);

      expect(nearby).toContain(zombie);
    });

    it('should support pierce mechanic across multiple zombies', () => {
      // Line of zombies
      const zombie1 = createMockZombie({ pos: createPosition(10, 0, 10) });
      const zombie2 = createMockZombie({ pos: createPosition(12, 0, 10) });
      const zombie3 = createMockZombie({ pos: createPosition(14, 0, 10) });

      grid.insert(zombie1, zombie1.pos);
      grid.insert(zombie2, zombie2.pos);
      grid.insert(zombie3, zombie3.pos);

      // Projectile path
      const projectileStart = createPosition(10, 1, 10);

      // Query along path
      const nearby1 = grid.queryRadius(createPosition(10, 1, 10), 1.5);
      const nearby2 = grid.queryRadius(createPosition(12, 1, 10), 1.5);
      const nearby3 = grid.queryRadius(createPosition(14, 1, 10), 1.5);

      expect(nearby1).toContain(zombie1);
      expect(nearby2).toContain(zombie2);
      expect(nearby3).toContain(zombie3);
    });

    it('should support splash damage radius query', () => {
      // Cluster of zombies
      const zombies = [];
      for (let i = 0; i < 5; i++) {
        const zombie = createMockZombie({
          pos: createPosition(
            25 + (Math.random() * 4 - 2),
            0,
            25 + (Math.random() * 4 - 2)
          )
        });
        zombies.push(zombie);
        grid.insert(zombie, zombie.pos);
      }

      // Splash center
      const splashCenter = createPosition(25, 0, 25);
      const splashRadius = 5;

      const affected = grid.queryRadius(splashCenter, splashRadius);

      // All should be affected by splash
      zombies.forEach(zombie => {
        expect(affected).toContain(zombie);
      });
    });
  });

  describe('Zombie-Barn Proximity', () => {
    it('should detect zombies near barn', () => {
      const barnPos = createPosition(0, 0, 0);

      // Zombie approaching barn
      const nearZombie = createMockZombie({ pos: createPosition(3, 0, 0) });
      const farZombie = createMockZombie({ pos: createPosition(30, 0, 30) });

      grid.insert(nearZombie, nearZombie.pos);
      grid.insert(farZombie, farZombie.pos);

      // Attack range query
      const attackRange = 5;
      const nearBarn = grid.queryRadius(barnPos, attackRange);

      expect(nearBarn).toContain(nearZombie);
      expect(nearBarn).not.toContain(farZombie);
    });
  });

  describe('Turret Range Queries', () => {
    it('should find zombies in turret range', () => {
      const turretPos = createPosition(15, 0, 15);
      const turretRange = 8;

      // Zombies at various distances
      const inRange1 = createMockZombie({ pos: createPosition(18, 0, 15) }); // 3 units
      const inRange2 = createMockZombie({ pos: createPosition(15, 0, 22) }); // 7 units
      const outOfRange = createMockZombie({ pos: createPosition(15, 0, 30) }); // 15 units

      grid.insert(inRange1, inRange1.pos);
      grid.insert(inRange2, inRange2.pos);
      grid.insert(outOfRange, outOfRange.pos);

      const targets = grid.queryRadius(turretPos, turretRange);

      expect(targets).toContain(inRange1);
      expect(targets).toContain(inRange2);
      expect(targets).not.toContain(outOfRange);
    });

    it('should prioritize closest zombie for targeting', () => {
      const turretPos = createPosition(0, 0, 0);

      const close = createMockZombie({ pos: createPosition(3, 0, 0) });
      const medium = createMockZombie({ pos: createPosition(6, 0, 0) });
      const far = createMockZombie({ pos: createPosition(9, 0, 0) });

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
      const obj1 = createMockZombie({ pos: createPosition(4.9, 0, 0) });
      const obj2 = createMockZombie({ pos: createPosition(5.1, 0, 0) });

      grid.insert(obj1, obj1.pos);
      grid.insert(obj2, obj2.pos);

      // Query that spans boundary
      const nearby = grid.queryRadius(createPosition(5, 0, 0), 1);

      expect(nearby).toContain(obj1);
      expect(nearby).toContain(obj2);
    });

    it('should handle objects at negative coordinates', () => {
      const negObj = createMockZombie({ pos: createPosition(-10, 0, -10) });

      grid.insert(negObj, negObj.pos);

      const nearby = grid.queryRadius(createPosition(-10, 0, -10), 5);
      expect(nearby).toContain(negObj);
    });

    it('should handle objects at origin', () => {
      const originObj = createMockZombie({ pos: createPosition(0, 0, 0) });

      grid.insert(originObj, originObj.pos);

      const nearby = grid.queryRadius(createPosition(0, 0, 0), 1);
      expect(nearby).toContain(originObj);
    });
  });

  describe('Grid Clear and Reset', () => {
    it('should clear all objects from grid', () => {
      // Add several objects
      for (let i = 0; i < 10; i++) {
        const obj = createMockZombie({
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
      const obj = createMockZombie({ pos: createPosition(10, 0, 10) });

      grid.insert(obj, obj.pos);
      grid.clear();

      // Re-insert
      grid.insert(obj, obj.pos);

      const nearby = grid.queryRadius(obj.pos, 5);
      expect(nearby).toContain(obj);
    });
  });
});
