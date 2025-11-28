/**
 * StabilityOptimizer Unit Tests
 *
 * Tests for caching, priority queues, dependency tracking, and zone optimization.
 * ~55 tests covering all optimization scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StabilityOptimizer,
  ZonedStabilityOptimizer,
  UpdatePriority
} from '../../StabilityOptimizer.js';
import {
  createMockPiece,
  createMockValidator,
  createPosition,
  resetIdCounter
} from '../../../test-utils/index.js';

describe('StabilityOptimizer', () => {
  let optimizer;
  let mockValidator;

  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();

    // Create validator with a graph that has pieces
    mockValidator = createMockValidator();
    mockValidator.graph = {
      pieces: new Map(),
      getSupports: () => []
    };

    optimizer = new StabilityOptimizer(mockValidator);
  });

  afterEach(() => {
    optimizer.clear();
    vi.useRealTimers();
  });

  // ============================================
  // UPDATE PRIORITY ENUM TESTS
  // ============================================
  describe('UpdatePriority', () => {
    it('should have IMMEDIATE priority (0)', () => {
      expect(UpdatePriority.IMMEDIATE).toBe(0);
    });

    it('should have HIGH priority (1)', () => {
      expect(UpdatePriority.HIGH).toBe(1);
    });

    it('should have NORMAL priority (2)', () => {
      expect(UpdatePriority.NORMAL).toBe(2);
    });

    it('should have LOW priority (3)', () => {
      expect(UpdatePriority.LOW).toBe(3);
    });

    it('should have BACKGROUND priority (4)', () => {
      expect(UpdatePriority.BACKGROUND).toBe(4);
    });

    it('should have priorities in correct order', () => {
      expect(UpdatePriority.IMMEDIATE).toBeLessThan(UpdatePriority.HIGH);
      expect(UpdatePriority.HIGH).toBeLessThan(UpdatePriority.NORMAL);
      expect(UpdatePriority.NORMAL).toBeLessThan(UpdatePriority.LOW);
      expect(UpdatePriority.LOW).toBeLessThan(UpdatePriority.BACKGROUND);
    });
  });

  // ============================================
  // CONSTRUCTION TESTS
  // ============================================
  describe('Construction', () => {
    it('should create with validator', () => {
      const opt = new StabilityOptimizer(mockValidator);
      expect(opt.validator).toBe(mockValidator);
    });

    it('should use default options', () => {
      const opt = new StabilityOptimizer(mockValidator);
      expect(opt.maxCacheAge).toBe(5000);
      expect(opt.maxCacheSize).toBe(10000);
      expect(opt.batchSize).toBe(50);
      expect(opt.immediateBatchSize).toBe(10);
      expect(opt.enableProfiling).toBe(false);
    });

    it('should accept custom options', () => {
      const opt = new StabilityOptimizer(mockValidator, {
        maxCacheAge: 10000,
        maxCacheSize: 5000,
        batchSize: 100,
        immediateBatchSize: 20,
        enableProfiling: true
      });

      expect(opt.maxCacheAge).toBe(10000);
      expect(opt.maxCacheSize).toBe(5000);
      expect(opt.batchSize).toBe(100);
      expect(opt.immediateBatchSize).toBe(20);
      expect(opt.enableProfiling).toBe(true);
    });

    it('should initialize with empty cache', () => {
      expect(optimizer.cache.size).toBe(0);
    });

    it('should initialize stats', () => {
      expect(optimizer.stats.cacheHits).toBe(0);
      expect(optimizer.stats.cacheMisses).toBe(0);
      expect(optimizer.stats.recalculations).toBe(0);
    });
  });

  // ============================================
  // GET STABILITY TESTS
  // ============================================
  describe('getStability', () => {
    it('should calculate stability for piece', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      const stability = optimizer.getStability(piece);

      expect(typeof stability).toBe('number');
    });

    it('should cache stability value', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);

      expect(optimizer.cache.has(piece.id)).toBe(true);
    });

    it('should return cached value on subsequent calls', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      const first = optimizer.getStability(piece);
      const second = optimizer.getStability(piece);

      expect(first).toBe(second);
      expect(optimizer.stats.cacheHits).toBe(1);
    });

    it('should recalculate when cache is stale', () => {
      const opt = new StabilityOptimizer(mockValidator, { maxCacheAge: 100 });
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      opt.getStability(piece);
      expect(opt.stats.cacheMisses).toBe(1);

      // Advance time past cache age
      vi.advanceTimersByTime(150);

      opt.getStability(piece);
      expect(opt.stats.cacheMisses).toBe(2);
    });

    it('should track cache misses', () => {
      const piece = createMockPiece({ id: 'test-piece' });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);

      expect(optimizer.stats.cacheMisses).toBe(1);
    });

    it('should return 1.0 for grounded pieces', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      const stability = optimizer.getStability(piece);

      expect(stability).toBe(1.0);
    });

    it('should return 0.0 for non-grounded pieces without support', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: false });
      mockValidator.graph.pieces.set(piece.id, piece);

      const stability = optimizer.getStability(piece);

      expect(stability).toBe(0.0);
    });
  });

  // ============================================
  // QUEUE UPDATE TESTS
  // ============================================
  describe('queueUpdate', () => {
    it('should add piece to update queue', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      optimizer.queueUpdate(piece);

      expect(optimizer.getPendingCount()).toBe(1);
    });

    it('should invalidate cache when queuing', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      expect(optimizer.cache.has(piece.id)).toBe(true);

      optimizer.queueUpdate(piece);
      expect(optimizer.cache.has(piece.id)).toBe(false);
    });

    it('should accept priority parameter', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      optimizer.queueUpdate(piece, UpdatePriority.IMMEDIATE);

      const stats = optimizer.getStats();
      expect(stats.pendingImmediate).toBe(1);
    });

    it('should upgrade priority if already queued', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      optimizer.queueUpdate(piece, UpdatePriority.LOW);
      optimizer.queueUpdate(piece, UpdatePriority.HIGH);

      const stats = optimizer.getStats();
      expect(stats.pendingHigh).toBe(1);
    });
  });

  // ============================================
  // QUEUE BULK UPDATE TESTS
  // ============================================
  describe('queueBulkUpdate', () => {
    it('should queue multiple pieces', () => {
      const pieces = [
        createMockPiece({ id: 'piece1' }),
        createMockPiece({ id: 'piece2' }),
        createMockPiece({ id: 'piece3' })
      ];

      optimizer.queueBulkUpdate(pieces);

      expect(optimizer.getPendingCount()).toBe(3);
    });

    it('should invalidate cache for all pieces', () => {
      const pieces = [
        createMockPiece({ id: 'piece1', isGrounded: true }),
        createMockPiece({ id: 'piece2', isGrounded: true })
      ];

      pieces.forEach(p => {
        mockValidator.graph.pieces.set(p.id, p);
        optimizer.getStability(p);
      });

      expect(optimizer.cache.size).toBe(2);

      optimizer.queueBulkUpdate(pieces);

      expect(optimizer.cache.size).toBe(0);
    });
  });

  // ============================================
  // UPDATE IMMEDIATE TESTS
  // ============================================
  describe('updateImmediate', () => {
    it('should immediately recalculate stability', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      const stability = optimizer.updateImmediate(piece);

      expect(stability).toBe(1.0);
    });

    it('should invalidate old cache', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      const oldEntry = optimizer.cache.get(piece.id);

      vi.advanceTimersByTime(100);

      optimizer.updateImmediate(piece);
      const newEntry = optimizer.cache.get(piece.id);

      expect(newEntry.timestamp).toBeGreaterThan(oldEntry.timestamp);
    });
  });

  // ============================================
  // PROCESS UPDATES TESTS
  // ============================================
  describe('processUpdates', () => {
    it('should process queued updates', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.queueUpdate(piece, UpdatePriority.IMMEDIATE);
      expect(optimizer.getPendingCount()).toBe(1);

      optimizer.processUpdates();

      expect(optimizer.getPendingCount()).toBe(0);
    });

    it('should increment frame count', () => {
      expect(optimizer.frameCount).toBe(0);

      optimizer.processUpdates();
      expect(optimizer.frameCount).toBe(1);

      optimizer.processUpdates();
      expect(optimizer.frameCount).toBe(2);
    });

    it('should track total process time', () => {
      optimizer.processUpdates();

      expect(optimizer.stats.totalProcessTime).toBeGreaterThanOrEqual(0);
    });

    it('should process immediate priority first', () => {
      const immediatePiece = createMockPiece({ id: 'immediate', isGrounded: true });
      const lowPiece = createMockPiece({ id: 'low', isGrounded: true });

      mockValidator.graph.pieces.set(immediatePiece.id, immediatePiece);
      mockValidator.graph.pieces.set(lowPiece.id, lowPiece);

      optimizer.queueUpdate(lowPiece, UpdatePriority.LOW);
      optimizer.queueUpdate(immediatePiece, UpdatePriority.IMMEDIATE);

      optimizer.processUpdates();

      // Immediate should be processed
      expect(optimizer.cache.has(immediatePiece.id)).toBe(true);
    });

    it('should respect time budget', () => {
      // Queue many updates
      for (let i = 0; i < 100; i++) {
        const piece = createMockPiece({ id: `piece-${i}`, isGrounded: true });
        mockValidator.graph.pieces.set(piece.id, piece);
        optimizer.queueUpdate(piece, UpdatePriority.NORMAL);
      }

      optimizer.processUpdates(0.1); // Very small time budget

      // Should not process all updates in one frame
      expect(optimizer.getPendingCount()).toBeGreaterThan(0);
    });
  });

  // ============================================
  // INVALIDATE CACHE TESTS
  // ============================================
  describe('invalidateCache', () => {
    it('should remove cache entry', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      expect(optimizer.cache.has(piece.id)).toBe(true);

      optimizer.invalidateCache(piece.id);
      expect(optimizer.cache.has(piece.id)).toBe(false);
    });

    it('should handle non-existent entry gracefully', () => {
      expect(() => optimizer.invalidateCache('non-existent')).not.toThrow();
    });
  });

  // ============================================
  // EVENT HANDLERS TESTS
  // ============================================
  describe('onPiecePlaced', () => {
    it('should queue update with IMMEDIATE priority', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      optimizer.onPiecePlaced(piece);

      expect(optimizer.getStats().pendingImmediate).toBe(1);
    });
  });

  describe('onPieceDestroyed', () => {
    it('should invalidate cache for destroyed piece', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      expect(optimizer.cache.has(piece.id)).toBe(true);

      optimizer.onPieceDestroyed(piece);
      expect(optimizer.cache.has(piece.id)).toBe(false);
    });

    it('should remove piece from update queue', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      optimizer.queueUpdate(piece);
      expect(optimizer.getPendingCount()).toBe(1);

      optimizer.onPieceDestroyed(piece);
      expect(optimizer.getPendingCount()).toBe(0);
    });

    it('should return affected pieces', () => {
      const piece = createMockPiece({ id: 'test-piece' });

      const affected = optimizer.onPieceDestroyed(piece);

      expect(Array.isArray(affected)).toBe(true);
    });
  });

  // ============================================
  // PRECOMPUTE REGION TESTS
  // ============================================
  describe('precomputeRegion', () => {
    it('should calculate stability for all pieces', () => {
      const pieces = [
        createMockPiece({ id: 'piece1', position: createPosition(0, 0, 0), isGrounded: true }),
        createMockPiece({ id: 'piece2', position: createPosition(0, 1, 0), isGrounded: true }),
        createMockPiece({ id: 'piece3', position: createPosition(0, 2, 0), isGrounded: true })
      ];

      pieces.forEach(p => mockValidator.graph.pieces.set(p.id, p));

      optimizer.precomputeRegion(pieces);

      expect(optimizer.cache.size).toBe(3);
    });

    it('should process bottom to top', () => {
      const order = [];
      const originalCalc = optimizer.calculateAndCache.bind(optimizer);
      optimizer.calculateAndCache = (piece) => {
        order.push(piece.id);
        return originalCalc(piece);
      };

      const pieces = [
        createMockPiece({ id: 'top', position: createPosition(0, 10, 0), isGrounded: true }),
        createMockPiece({ id: 'bottom', position: createPosition(0, 0, 0), isGrounded: true }),
        createMockPiece({ id: 'middle', position: createPosition(0, 5, 0), isGrounded: true })
      ];

      pieces.forEach(p => mockValidator.graph.pieces.set(p.id, p));

      optimizer.precomputeRegion(pieces);

      expect(order).toEqual(['bottom', 'middle', 'top']);
    });
  });

  // ============================================
  // STATS TESTS
  // ============================================
  describe('getStats', () => {
    it('should return comprehensive stats object', () => {
      const stats = optimizer.getStats();

      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('recalculations');
      expect(stats).toHaveProperty('batchesProcessed');
      expect(stats).toHaveProperty('totalProcessTime');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('pendingUpdates');
    });

    it('should calculate hit rate correctly', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece); // Miss
      optimizer.getStability(piece); // Hit
      optimizer.getStability(piece); // Hit
      optimizer.getStability(piece); // Hit

      const stats = optimizer.getStats();
      expect(stats.hitRate).toBe('75%'); // 3 hits / 4 total
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      optimizer.getStability(piece);

      optimizer.resetStats();

      expect(optimizer.stats.cacheHits).toBe(0);
      expect(optimizer.stats.cacheMisses).toBe(0);
      expect(optimizer.stats.recalculations).toBe(0);
    });
  });

  // ============================================
  // CLEAR TESTS
  // ============================================
  describe('clear', () => {
    it('should clear cache', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);
      expect(optimizer.cache.size).toBe(1);

      optimizer.clear();
      expect(optimizer.cache.size).toBe(0);
    });

    it('should clear update queue', () => {
      optimizer.queueUpdate(createMockPiece({ id: 'piece1' }));
      optimizer.queueUpdate(createMockPiece({ id: 'piece2' }));

      optimizer.clear();

      expect(optimizer.getPendingCount()).toBe(0);
    });

    it('should reset stats', () => {
      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      optimizer.getStability(piece);

      optimizer.clear();

      expect(optimizer.stats.cacheMisses).toBe(0);
    });
  });

  // ============================================
  // PENDING COUNT TESTS
  // ============================================
  describe('getPendingCount', () => {
    it('should return 0 when empty', () => {
      expect(optimizer.getPendingCount()).toBe(0);
    });

    it('should count all priorities', () => {
      optimizer.queueUpdate(createMockPiece({ id: 'p1' }), UpdatePriority.IMMEDIATE);
      optimizer.queueUpdate(createMockPiece({ id: 'p2' }), UpdatePriority.HIGH);
      optimizer.queueUpdate(createMockPiece({ id: 'p3' }), UpdatePriority.NORMAL);

      expect(optimizer.getPendingCount()).toBe(3);
    });
  });

  describe('hasPendingUpdates', () => {
    it('should return false when empty', () => {
      expect(optimizer.hasPendingUpdates()).toBe(false);
    });

    it('should return true when updates pending', () => {
      optimizer.queueUpdate(createMockPiece({ id: 'piece1' }));

      expect(optimizer.hasPendingUpdates()).toBe(true);
    });
  });

  // ============================================
  // CACHE EVICTION TESTS
  // ============================================
  describe('evictStaleEntries', () => {
    it('should evict entries past max age', () => {
      const opt = new StabilityOptimizer(mockValidator, { maxCacheAge: 100 });

      const piece = createMockPiece({ id: 'test-piece', isGrounded: true });
      mockValidator.graph.pieces.set(piece.id, piece);

      opt.getStability(piece);
      expect(opt.cache.size).toBe(1);

      vi.advanceTimersByTime(150);
      opt.evictStaleEntries();

      expect(opt.cache.size).toBe(0);
    });

    it('should evict LRU entries when cache full', () => {
      const opt = new StabilityOptimizer(mockValidator, {
        maxCacheSize: 5,
        maxCacheAge: 100000 // Long cache age so entries aren't stale
      });

      // Fill cache
      for (let i = 0; i < 10; i++) {
        const piece = createMockPiece({ id: `piece-${i}`, isGrounded: true });
        mockValidator.graph.pieces.set(piece.id, piece);
        opt.getStability(piece);
      }

      opt.evictStaleEntries();

      // Should be reduced below max
      expect(opt.cache.size).toBeLessThanOrEqual(5);
    });
  });
});

// ============================================
// ZONED STABILITY OPTIMIZER TESTS
// ============================================
describe('ZonedStabilityOptimizer', () => {
  let optimizer;
  let mockValidator;

  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();

    mockValidator = createMockValidator();
    mockValidator.graph = {
      pieces: new Map(),
      getSupports: () => []
    };

    optimizer = new ZonedStabilityOptimizer(mockValidator, {
      zoneSize: 10,
      activeZoneRadius: 1
    });
  });

  afterEach(() => {
    optimizer.clear();
    vi.useRealTimers();
  });

  describe('Construction', () => {
    it('should extend StabilityOptimizer', () => {
      expect(optimizer).toBeInstanceOf(StabilityOptimizer);
    });

    it('should have zone-specific options', () => {
      expect(optimizer.zoneSize).toBe(10);
      expect(optimizer.activeZoneRadius).toBe(1);
    });

    it('should use default zone options', () => {
      const opt = new ZonedStabilityOptimizer(mockValidator);
      expect(opt.zoneSize).toBe(100);
      expect(opt.activeZoneRadius).toBe(2);
    });
  });

  describe('getZoneKey', () => {
    it('should return zone key for position', () => {
      const key = optimizer.getZoneKey(createPosition(5, 0, 5));
      expect(key).toBe('0,0');
    });

    it('should handle different zones', () => {
      const key1 = optimizer.getZoneKey(createPosition(15, 0, 15));
      const key2 = optimizer.getZoneKey(createPosition(25, 0, 25));

      expect(key1).toBe('1,1');
      expect(key2).toBe('2,2');
    });

    it('should handle negative coordinates', () => {
      const key = optimizer.getZoneKey(createPosition(-15, 0, -15));
      expect(key).toBe('-2,-2');
    });
  });

  describe('registerPiece', () => {
    it('should add piece to zone', () => {
      const piece = createMockPiece({
        id: 'test-piece',
        position: createPosition(5, 0, 5)
      });

      optimizer.registerPiece(piece);

      expect(optimizer.zones.get('0,0').has(piece.id)).toBe(true);
    });

    it('should create zone if not exists', () => {
      const piece = createMockPiece({
        id: 'test-piece',
        position: createPosition(15, 0, 15)
      });

      expect(optimizer.zones.has('1,1')).toBe(false);

      optimizer.registerPiece(piece);

      expect(optimizer.zones.has('1,1')).toBe(true);
    });
  });

  describe('unregisterPiece', () => {
    it('should remove piece from zone', () => {
      const piece = createMockPiece({
        id: 'test-piece',
        position: createPosition(5, 0, 5)
      });

      optimizer.registerPiece(piece);
      optimizer.unregisterPiece(piece);

      expect(optimizer.zones.get('0,0').has(piece.id)).toBe(false);
    });
  });

  describe('setPlayerPosition', () => {
    it('should update player position', () => {
      const pos = createPosition(50, 0, 50);
      optimizer.setPlayerPosition(pos);

      expect(optimizer.playerPosition).toBe(pos);
    });

    it('should update active zones', () => {
      optimizer.setPlayerPosition(createPosition(15, 0, 15)); // Zone 1,1

      // With radius 1, should have 9 active zones (3x3)
      expect(optimizer.activeZones.size).toBe(9);
      expect(optimizer.activeZones.has('1,1')).toBe(true); // Center
      expect(optimizer.activeZones.has('0,0')).toBe(true); // Corner
      expect(optimizer.activeZones.has('2,2')).toBe(true); // Corner
    });
  });

  describe('getZoneStats', () => {
    it('should return zone statistics', () => {
      const piece1 = createMockPiece({
        id: 'piece1',
        position: createPosition(5, 0, 5)
      });
      const piece2 = createMockPiece({
        id: 'piece2',
        position: createPosition(15, 0, 15)
      });

      optimizer.registerPiece(piece1);
      optimizer.registerPiece(piece2);
      optimizer.setPlayerPosition(createPosition(5, 0, 5));

      const stats = optimizer.getZoneStats();

      expect(stats.totalZones).toBe(2);
      expect(stats.totalPieces).toBe(2);
      expect(stats.zoneSize).toBe(10);
      expect(stats.activeRadius).toBe(1);
    });

    it('should count active pieces correctly', () => {
      // Register piece in zone 0,0
      optimizer.registerPiece(createMockPiece({
        id: 'active',
        position: createPosition(5, 0, 5)
      }));

      // Register piece in far zone
      optimizer.registerPiece(createMockPiece({
        id: 'inactive',
        position: createPosition(500, 0, 500)
      }));

      // Player at 0,0
      optimizer.setPlayerPosition(createPosition(5, 0, 5));

      const stats = optimizer.getZoneStats();

      expect(stats.totalPieces).toBe(2);
      expect(stats.activePieces).toBe(1);
    });
  });
});
