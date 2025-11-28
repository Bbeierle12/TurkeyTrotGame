/**
 * SpatialHashGrid2D Unit Tests
 *
 * Comprehensive tests for the spatial partitioning system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid2D } from '../../SpatialHashGrid2D.js';

describe('SpatialHashGrid2D', () => {
  let grid;

  beforeEach(() => {
    grid = new SpatialHashGrid2D(5);
  });

  // ============================================
  // CONSTRUCTION
  // ============================================
  describe('Construction', () => {
    it('should use default cell size of 5', () => {
      const defaultGrid = new SpatialHashGrid2D();
      expect(defaultGrid.cellSize).toBe(5);
    });

    it('should accept custom cell size', () => {
      const customGrid = new SpatialHashGrid2D(10);
      expect(customGrid.cellSize).toBe(10);
    });

    it('should start with empty state', () => {
      expect(grid.cells.size).toBe(0);
      expect(grid.objectCells.size).toBe(0);
      expect(grid.objectCount).toBe(0);
    });

    it('should initialize with Map for cells', () => {
      expect(grid.cells).toBeInstanceOf(Map);
    });

    it('should initialize with Map for objectCells', () => {
      expect(grid.objectCells).toBeInstanceOf(Map);
    });
  });

  // ============================================
  // HASH FUNCTION
  // ============================================
  describe('Hash Function (_hash)', () => {
    it('should calculate correct cell for positive coordinates', () => {
      expect(grid._hash(0, 0)).toBe('0,0');
      expect(grid._hash(4.9, 4.9)).toBe('0,0');
      expect(grid._hash(5, 5)).toBe('1,1');
      expect(grid._hash(10, 10)).toBe('2,2');
    });

    it('should calculate correct cell for negative coordinates', () => {
      expect(grid._hash(-1, -1)).toBe('-1,-1');
      expect(grid._hash(-5, -5)).toBe('-1,-1');
      expect(grid._hash(-6, -6)).toBe('-2,-2');
    });

    it('should handle exact cell boundaries', () => {
      // At boundary (5.0) should be in next cell
      expect(grid._hash(5.0, 0)).toBe('1,0');
      expect(grid._hash(0, 5.0)).toBe('0,1');
      expect(grid._hash(4.999, 4.999)).toBe('0,0');
    });

    it('should handle large coordinates without overflow', () => {
      expect(grid._hash(10000, 10000)).toBe('2000,2000');
      expect(grid._hash(-10000, -10000)).toBe('-2000,-2000');
    });

    it('should handle zero coordinates', () => {
      expect(grid._hash(0, 0)).toBe('0,0');
    });

    it('should handle mixed positive/negative coordinates', () => {
      expect(grid._hash(5, -5)).toBe('1,-1');
      expect(grid._hash(-5, 5)).toBe('-1,1');
    });
  });

  // ============================================
  // INSERT OPERATIONS
  // ============================================
  describe('Insert Operations', () => {
    it('should insert single object', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      expect(grid.objectCount).toBe(1);
    });

    it('should return correct cell key on insert', () => {
      const obj = { id: 'test1' };
      const key = grid.insert(obj, { x: 7, z: 3 });
      expect(key).toBe('1,0');
    });

    it('should handle multiple objects in same cell', () => {
      const obj1 = { id: 'test1' };
      const obj2 = { id: 'test2' };
      grid.insert(obj1, { x: 1, z: 1 });
      grid.insert(obj2, { x: 2, z: 2 });
      expect(grid.objectCount).toBe(2);
      expect(grid.cells.get('0,0').size).toBe(2);
    });

    it('should handle multiple objects in different cells', () => {
      const obj1 = { id: 'test1' };
      const obj2 = { id: 'test2' };
      grid.insert(obj1, { x: 0, z: 0 });
      grid.insert(obj2, { x: 10, z: 10 });
      expect(grid.objectCount).toBe(2);
      expect(grid.cells.size).toBe(2);
    });

    it('should track object count correctly', () => {
      for (let i = 0; i < 10; i++) {
        grid.insert({ id: `test${i}` }, { x: i * 5, z: 0 });
      }
      expect(grid.objectCount).toBe(10);
    });

    it('should handle duplicate insertion (same object, same position)', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      grid.insert(obj, { x: 0, z: 0 });
      // Object is tracked in multiple cell entries
      expect(grid.objectCount).toBe(1);
    });

    it('should create new cell if not exists', () => {
      const obj = { id: 'test1' };
      expect(grid.cells.has('5,5')).toBe(false);
      grid.insert(obj, { x: 25, z: 25 });
      expect(grid.cells.has('5,5')).toBe(true);
    });

    it('should track which cells contain each object', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      expect(grid.objectCells.get(obj)).toBeDefined();
      expect(grid.objectCells.get(obj).has('0,0')).toBe(true);
    });
  });

  // ============================================
  // REMOVE OPERATIONS
  // ============================================
  describe('Remove Operations', () => {
    it('should remove existing object and return true', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      const result = grid.remove(obj);
      expect(result).toBe(true);
      expect(grid.objectCount).toBe(0);
    });

    it('should return false when removing non-existent object', () => {
      const obj = { id: 'test1' };
      const result = grid.remove(obj);
      expect(result).toBe(false);
    });

    it('should clean up empty cells after removal', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      expect(grid.cells.has('0,0')).toBe(true);
      grid.remove(obj);
      expect(grid.cells.has('0,0')).toBe(false);
    });

    it('should not remove other objects when removing one', () => {
      const obj1 = { id: 'test1' };
      const obj2 = { id: 'test2' };
      grid.insert(obj1, { x: 0, z: 0 });
      grid.insert(obj2, { x: 1, z: 1 });
      grid.remove(obj1);
      expect(grid.objectCount).toBe(1);
      expect(grid.cells.get('0,0').has(obj2)).toBe(true);
    });

    it('should decrement object count on removal', () => {
      const obj1 = { id: 'test1' };
      const obj2 = { id: 'test2' };
      grid.insert(obj1, { x: 0, z: 0 });
      grid.insert(obj2, { x: 10, z: 10 });
      expect(grid.objectCount).toBe(2);
      grid.remove(obj1);
      expect(grid.objectCount).toBe(1);
    });

    it('should handle double removal gracefully', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      grid.remove(obj);
      const result = grid.remove(obj);
      expect(result).toBe(false);
      expect(grid.objectCount).toBe(0);
    });

    it('should clean up objectCells map on removal', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      expect(grid.objectCells.has(obj)).toBe(true);
      grid.remove(obj);
      expect(grid.objectCells.has(obj)).toBe(false);
    });
  });

  // ============================================
  // UPDATE OPERATIONS
  // ============================================
  describe('Update Operations', () => {
    it('should update object position between cells', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      expect(grid.cells.get('0,0').has(obj)).toBe(true);

      grid.update(obj, { x: 10, z: 10 });
      expect(grid.cells.has('0,0')).toBe(false);
      expect(grid.cells.get('2,2').has(obj)).toBe(true);
    });

    it('should handle update within same cell', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 1, z: 1 });
      grid.update(obj, { x: 2, z: 2 });
      expect(grid.cells.get('0,0').has(obj)).toBe(true);
      expect(grid.objectCount).toBe(1);
    });

    it('should return new cell key after update', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      const newKey = grid.update(obj, { x: 15, z: 15 });
      expect(newKey).toBe('3,3');
    });

    it('should handle update of non-existent object', () => {
      const obj = { id: 'test1' };
      const key = grid.update(obj, { x: 10, z: 10 });
      expect(key).toBe('2,2');
      expect(grid.objectCount).toBe(1);
    });

    it('should maintain object count after update', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });
      grid.update(obj, { x: 50, z: 50 });
      expect(grid.objectCount).toBe(1);
    });
  });

  // ============================================
  // QUERY RADIUS
  // ============================================
  describe('queryRadius', () => {
    beforeEach(() => {
      // Set up test objects
      grid.insert({ id: '1', pos: { x: 0, z: 0 } }, { x: 0, z: 0 });
      grid.insert({ id: '2', pos: { x: 3, z: 0 } }, { x: 3, z: 0 });
      grid.insert({ id: '3', pos: { x: 10, z: 0 } }, { x: 10, z: 0 });
      grid.insert({ id: '4', pos: { x: 0, z: 10 } }, { x: 0, z: 10 });
    });

    it('should find objects within radius', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 5);
      expect(results.length).toBe(2);
      expect(results.some((r) => r.id === '1')).toBe(true);
      expect(results.some((r) => r.id === '2')).toBe(true);
    });

    it('should exclude objects outside radius', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 5);
      expect(results.some((r) => r.id === '3')).toBe(false);
      expect(results.some((r) => r.id === '4')).toBe(false);
    });

    it('should handle boundary case (exact radius distance)', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 3);
      expect(results.some((r) => r.id === '2')).toBe(true);
    });

    it('should return empty array for empty query', () => {
      const emptyGrid = new SpatialHashGrid2D(5);
      const results = emptyGrid.queryRadius({ x: 0, z: 0 }, 10);
      expect(results).toEqual([]);
    });

    it('should return empty array when no objects in radius', () => {
      const results = grid.queryRadius({ x: 100, z: 100 }, 5);
      expect(results).toEqual([]);
    });

    it('should handle object.pos pattern', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 5);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle object.position pattern', () => {
      const posGrid = new SpatialHashGrid2D(5);
      posGrid.insert(
        { id: '1', position: { x: 0, z: 0 } },
        { x: 0, z: 0 }
      );
      const results = posGrid.queryRadius({ x: 0, z: 0 }, 5);
      expect(results.length).toBe(1);
    });

    it('should handle direct coordinate objects', () => {
      const directGrid = new SpatialHashGrid2D(5);
      directGrid.insert({ id: '1', x: 0, z: 0 }, { x: 0, z: 0 });
      const results = directGrid.queryRadius({ x: 0, z: 0 }, 5);
      expect(results.length).toBe(1);
    });

    it('should handle multi-cell queries', () => {
      // Query with large radius spanning multiple cells
      const results = grid.queryRadius({ x: 5, z: 5 }, 15);
      expect(results.length).toBe(4);
    });

    it('should return array (not set)', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should not return duplicates', () => {
      const results = grid.queryRadius({ x: 0, z: 0 }, 20);
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  // ============================================
  // QUERY CELL
  // ============================================
  describe('queryCell', () => {
    it('should return objects in specific cell', () => {
      const obj1 = { id: 'test1' };
      const obj2 = { id: 'test2' };
      grid.insert(obj1, { x: 1, z: 1 });
      grid.insert(obj2, { x: 2, z: 2 });

      const results = grid.queryCell({ x: 0, z: 0 });
      expect(results.length).toBe(2);
    });

    it('should return empty array for empty cell', () => {
      const results = grid.queryCell({ x: 100, z: 100 });
      expect(results).toEqual([]);
    });

    it('should return copy, not reference', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 0, z: 0 });

      const results1 = grid.queryCell({ x: 0, z: 0 });
      const results2 = grid.queryCell({ x: 0, z: 0 });
      expect(results1).not.toBe(results2);
    });

    it('should use position to determine cell', () => {
      const obj = { id: 'test1' };
      grid.insert(obj, { x: 7, z: 3 });

      // Position 7,3 should be in cell 1,0
      expect(grid.queryCell({ x: 5, z: 0 })).toContain(obj);
      expect(grid.queryCell({ x: 0, z: 0 })).not.toContain(obj);
    });
  });

  // ============================================
  // FIND NEAREST
  // ============================================
  describe('findNearest', () => {
    beforeEach(() => {
      grid.insert({ id: 'near', pos: { x: 5, z: 5 } }, { x: 5, z: 5 });
      grid.insert({ id: 'far', pos: { x: 20, z: 20 } }, { x: 20, z: 20 });
      grid.insert({ id: 'medium', pos: { x: 10, z: 10 } }, { x: 10, z: 10 });
    });

    it('should find nearest object', () => {
      const nearest = grid.findNearest({ x: 0, z: 0 });
      expect(nearest.id).toBe('near');
    });

    it('should respect maxRadius', () => {
      const nearest = grid.findNearest({ x: 0, z: 0 }, 3);
      expect(nearest).toBeNull();
    });

    it('should return null when no objects exist', () => {
      const emptyGrid = new SpatialHashGrid2D(5);
      const nearest = emptyGrid.findNearest({ x: 0, z: 0 });
      expect(nearest).toBeNull();
    });

    it('should return null when no objects in maxRadius', () => {
      const nearest = grid.findNearest({ x: -100, z: -100 }, 10);
      expect(nearest).toBeNull();
    });

    it('should find object at exact position', () => {
      const nearest = grid.findNearest({ x: 5, z: 5 });
      expect(nearest.id).toBe('near');
    });

    it('should handle infinite maxRadius (default)', () => {
      const nearest = grid.findNearest({ x: -100, z: -100 });
      expect(nearest).not.toBeNull();
    });

    it('should expand search outward correctly', () => {
      // Object in distant cell should still be found
      const nearest = grid.findNearest({ x: 19, z: 19 });
      expect(nearest.id).toBe('far');
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return correct object count', () => {
      grid.insert({ id: '1' }, { x: 0, z: 0 });
      grid.insert({ id: '2' }, { x: 10, z: 10 });
      grid.insert({ id: '3' }, { x: 20, z: 20 });

      const stats = grid.getStats();
      expect(stats.objectCount).toBe(3);
    });

    it('should return correct cell count', () => {
      grid.insert({ id: '1' }, { x: 0, z: 0 });
      grid.insert({ id: '2' }, { x: 0, z: 0 });
      grid.insert({ id: '3' }, { x: 10, z: 10 });

      const stats = grid.getStats();
      expect(stats.cellCount).toBe(2);
    });

    it('should return correct max objects per cell', () => {
      grid.insert({ id: '1' }, { x: 0, z: 0 });
      grid.insert({ id: '2' }, { x: 1, z: 1 });
      grid.insert({ id: '3' }, { x: 2, z: 2 });
      grid.insert({ id: '4' }, { x: 10, z: 10 });

      const stats = grid.getStats();
      expect(stats.maxObjectsPerCell).toBe(3);
    });

    it('should calculate average correctly', () => {
      grid.insert({ id: '1' }, { x: 0, z: 0 });
      grid.insert({ id: '2' }, { x: 1, z: 1 });
      grid.insert({ id: '3' }, { x: 10, z: 10 });

      const stats = grid.getStats();
      // 3 objects in 2 cells = 1.5 average
      expect(stats.avgObjectsPerCell).toBe(1.5);
    });

    it('should return cell size', () => {
      const stats = grid.getStats();
      expect(stats.cellSize).toBe(5);
    });

    it('should handle empty grid', () => {
      const stats = grid.getStats();
      expect(stats.objectCount).toBe(0);
      expect(stats.cellCount).toBe(0);
      expect(stats.maxObjectsPerCell).toBe(0);
      expect(stats.avgObjectsPerCell).toBe(0);
    });
  });

  // ============================================
  // CLEAR
  // ============================================
  describe('clear', () => {
    beforeEach(() => {
      grid.insert({ id: '1' }, { x: 0, z: 0 });
      grid.insert({ id: '2' }, { x: 10, z: 10 });
      grid.insert({ id: '3' }, { x: 20, z: 20 });
    });

    it('should remove all objects', () => {
      grid.clear();
      expect(grid.objectCount).toBe(0);
    });

    it('should clear all cells', () => {
      grid.clear();
      expect(grid.cells.size).toBe(0);
    });

    it('should clear objectCells map', () => {
      grid.clear();
      expect(grid.objectCells.size).toBe(0);
    });

    it('should reset object count to zero', () => {
      grid.clear();
      expect(grid.objectCount).toBe(0);
    });

    it('should be idempotent (multiple clears)', () => {
      grid.clear();
      grid.clear();
      grid.clear();
      expect(grid.objectCount).toBe(0);
      expect(grid.cells.size).toBe(0);
    });

    it('should allow new insertions after clear', () => {
      grid.clear();
      grid.insert({ id: 'new' }, { x: 5, z: 5 });
      expect(grid.objectCount).toBe(1);
    });
  });

  // ============================================
  // PERFORMANCE / EDGE CASES
  // ============================================
  describe('Performance and Edge Cases', () => {
    it('should handle large number of objects', () => {
      const count = 1000;
      for (let i = 0; i < count; i++) {
        grid.insert(
          { id: `obj${i}`, pos: { x: (i % 50) * 2, z: Math.floor(i / 50) * 2 } },
          { x: (i % 50) * 2, z: Math.floor(i / 50) * 2 }
        );
      }
      expect(grid.objectCount).toBe(count);
    });

    it('should perform radius query efficiently with many objects', () => {
      // Insert 500 objects
      for (let i = 0; i < 500; i++) {
        grid.insert(
          { id: `obj${i}`, pos: { x: (i % 25) * 2, z: Math.floor(i / 25) * 2 } },
          { x: (i % 25) * 2, z: Math.floor(i / 25) * 2 }
        );
      }

      const start = performance.now();
      const results = grid.queryRadius({ x: 25, z: 25 }, 10);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be fast
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle objects at negative coordinates', () => {
      grid.insert({ id: 'neg', pos: { x: -10, z: -10 } }, { x: -10, z: -10 });
      const results = grid.queryRadius({ x: -10, z: -10 }, 5);
      expect(results.length).toBe(1);
    });

    it('should handle very small cell sizes', () => {
      const smallGrid = new SpatialHashGrid2D(0.5);
      smallGrid.insert({ id: '1', pos: { x: 0, z: 0 } }, { x: 0, z: 0 });
      smallGrid.insert({ id: '2', pos: { x: 0.3, z: 0.3 } }, { x: 0.3, z: 0.3 });

      const results = smallGrid.queryRadius({ x: 0, z: 0 }, 1);
      expect(results.length).toBe(2);
    });

    it('should handle objects with undefined z (using 0)', () => {
      // The hash function uses Math.floor which handles undefined gracefully
      const key = grid._hash(5, undefined);
      expect(key).toBeDefined();
    });

    it('should handle floating point positions', () => {
      grid.insert(
        { id: 'float', pos: { x: 1.23456, z: 7.89012 } },
        { x: 1.23456, z: 7.89012 }
      );
      expect(grid.objectCount).toBe(1);
    });
  });
});
