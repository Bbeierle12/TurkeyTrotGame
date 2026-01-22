/**
 * BuildingValidator Unit Tests
 *
 * Tests for structural validation, support graphs, and placement rules.
 * ~60 tests covering all validation scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuildingValidator, ValidationMode, ValidationCode } from '../../BuildingValidator.js';
import { Vector3 } from '../__mocks__/three.js';
import {
  createMockPiece,
  createPieceGrid,
  createPosition,
  resetIdCounter
} from '../../../test-utils/index.js';

describe('BuildingValidator', () => {
  let validator;

  beforeEach(() => {
    resetIdCounter();
    validator = new BuildingValidator();
  });

  afterEach(() => {
    validator.clear();
  });

  // ============================================
  // CONSTRUCTION TESTS
  // ============================================
  describe('Construction', () => {
    it('should create with default options', () => {
      const v = new BuildingValidator();
      expect(v.mode).toBe(ValidationMode.SIMPLE);
      expect(v.minDistanceFromBarn).toBe(5);
      expect(v.maxDistanceFromBarn).toBe(35);
      expect(v.snapTolerance).toBe(0.15);
    });

    it('should accept custom options', () => {
      const customBarnPos = createPosition(10, 0, 10);
      const v = new BuildingValidator({
        mode: ValidationMode.HEURISTIC,
        minDistanceFromBarn: 3,
        maxDistanceFromBarn: 50,
        barnPosition: customBarnPos,
        snapTolerance: 0.2
      });

      expect(v.mode).toBe(ValidationMode.HEURISTIC);
      expect(v.minDistanceFromBarn).toBe(3);
      expect(v.maxDistanceFromBarn).toBe(50);
      expect(v.barnPosition).toBe(customBarnPos);
      expect(v.snapTolerance).toBe(0.2);
    });

    it('should initialize with empty support graph', () => {
      expect(validator.getAllPieces()).toEqual([]);
    });

    it('should initialize with empty stability cache', () => {
      expect(validator.stabilityCache.size).toBe(0);
    });
  });

  // ============================================
  // VALIDATION MODE TESTS
  // ============================================
  describe('ValidationMode', () => {
    it('should have SIMPLE mode', () => {
      expect(ValidationMode.SIMPLE).toBe('simple');
    });

    it('should have HEURISTIC mode', () => {
      expect(ValidationMode.HEURISTIC).toBe('heuristic');
    });

    it('should switch modes via setMode', () => {
      validator.setMode(ValidationMode.HEURISTIC);
      expect(validator.mode).toBe(ValidationMode.HEURISTIC);

      validator.setMode(ValidationMode.SIMPLE);
      expect(validator.mode).toBe(ValidationMode.SIMPLE);
    });

    it('should clear stability cache when switching modes', () => {
      // Start in HEURISTIC mode where stability is actually cached
      validator.setMode(ValidationMode.HEURISTIC);

      const piece = createMockPiece({ position: createPosition(10, 0, 10) });
      validator.addPiece(piece);
      validator.getStability(piece);

      expect(validator.stabilityCache.size).toBeGreaterThan(0);

      validator.setMode(ValidationMode.SIMPLE);
      expect(validator.stabilityCache.size).toBe(0);
    });
  });

  // ============================================
  // ADD PIECE TESTS
  // ============================================
  describe('addPiece', () => {
    it('should add a piece to the graph', () => {
      const piece = createMockPiece();
      validator.addPiece(piece);

      expect(validator.getAllPieces()).toContain(piece);
    });

    it('should set isGrounded to true by default', () => {
      const piece = createMockPiece({ isGrounded: undefined });
      delete piece.isGrounded;

      validator.addPiece(piece);
      expect(piece.isGrounded).toBe(true);
    });

    it('should preserve existing isGrounded value', () => {
      const piece = createMockPiece({ isGrounded: false });
      validator.addPiece(piece);

      expect(piece.isGrounded).toBe(false);
    });

    it('should return the added piece', () => {
      const piece = createMockPiece();
      const result = validator.addPiece(piece);

      expect(result).toBe(piece);
    });

    it('should add multiple pieces', () => {
      const pieces = createPieceGrid(5);
      pieces.forEach(p => validator.addPiece(p));

      expect(validator.getAllPieces()).toHaveLength(5);
    });
  });

  // ============================================
  // REMOVE PIECE TESTS
  // ============================================
  describe('removePiece', () => {
    it('should remove a piece from the graph', () => {
      const piece = createMockPiece();
      validator.addPiece(piece);
      validator.removePiece(piece);

      expect(validator.getAllPieces()).not.toContain(piece);
    });

    it('should return empty array in SIMPLE mode', () => {
      const piece = createMockPiece();
      validator.addPiece(piece);

      const collapsed = validator.removePiece(piece);
      expect(collapsed).toEqual([]);
    });

    it('should clear stability cache for removed piece', () => {
      validator.setMode(ValidationMode.HEURISTIC);

      const piece = createMockPiece({ position: createPosition(10, 0, 10) });
      validator.addPiece(piece);
      validator.getStability(piece);

      expect(validator.stabilityCache.has(piece.id)).toBe(true);

      validator.removePiece(piece);
      expect(validator.stabilityCache.has(piece.id)).toBe(false);
    });

    describe('in HEURISTIC mode', () => {
      beforeEach(() => {
        validator.setMode(ValidationMode.HEURISTIC);
      });

      it('should find disconnected pieces after removal', () => {
        // Create a support chain: ground -> piece1 -> piece2
        const piece1 = createMockPiece({
          id: 'ground',
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        const piece2 = createMockPiece({
          id: 'supported',
          position: createPosition(10, 1, 10),
          isGrounded: false
        });

        validator.addPiece(piece1);
        validator.addPiece(piece2);

        // Manually add support relation for testing
        validator.graph.addSupportRelation(piece1, piece2);

        const collapsed = validator.removePiece(piece1);
        // piece2 should be disconnected after piece1 removal
        expect(collapsed).toContain(piece2);
      });
    });
  });

  // ============================================
  // VALIDATE PLACEMENT TESTS
  // ============================================
  describe('validatePlacement', () => {
    describe('position validation', () => {
      it('should reject piece with no position', () => {
        const piece = { id: 'test', position: null };
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.NO_POSITION);
      });

      it('should reject piece with undefined position', () => {
        const piece = { id: 'test' };
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.NO_POSITION);
      });
    });

    describe('distance from barn', () => {
      it('should reject piece too close to barn', () => {
        const piece = createMockPiece({
          position: createPosition(3, 0, 0) // Distance = 3, min = 5
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.TOO_CLOSE);
      });

      it('should reject piece at barn position', () => {
        const piece = createMockPiece({
          position: createPosition(0, 0, 0)
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.TOO_CLOSE);
      });

      it('should reject piece too far from barn', () => {
        const piece = createMockPiece({
          position: createPosition(40, 0, 0) // Distance = 40, max = 35
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.TOO_FAR);
      });

      it('should accept piece at minimum distance', () => {
        const piece = createMockPiece({
          position: createPosition(5, 0, 0) // Distance = 5, min = 5
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });

      it('should accept piece at maximum distance', () => {
        const piece = createMockPiece({
          position: createPosition(35, 0, 0) // Distance = 35, max = 35
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });

      it('should accept piece in valid range', () => {
        const piece = createMockPiece({
          position: createPosition(15, 0, 15) // Distance ~21.2
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });

      it('should use custom barn position', () => {
        const customValidator = new BuildingValidator({
          barnPosition: createPosition(10, 0, 10)
        });

        // 5 units from custom barn position
        const piece = createMockPiece({
          position: createPosition(15, 0, 10)
        });
        const result = customValidator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });
    });

    describe('overlapping pieces', () => {
      it('should reject piece too close to existing piece', () => {
        const existing = createMockPiece({
          position: createPosition(10, 0, 10)
        });
        validator.addPiece(existing);

        const newPiece = createMockPiece({
          position: createPosition(10.5, 0, 10.5) // Distance < 1.5
        });
        const result = validator.validatePlacement(newPiece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.BLOCKED);
      });

      it('should accept piece at minimum spacing', () => {
        const existing = createMockPiece({
          position: createPosition(10, 0, 10)
        });
        validator.addPiece(existing);

        const newPiece = createMockPiece({
          position: createPosition(11.5, 0, 10) // Distance = 1.5
        });
        const result = validator.validatePlacement(newPiece);

        expect(result.ok).toBe(true);
      });

      it('should check against all existing pieces', () => {
        const pieces = [
          createMockPiece({ position: createPosition(10, 0, 10) }),
          createMockPiece({ position: createPosition(15, 0, 15) }),
          createMockPiece({ position: createPosition(20, 0, 20) })
        ];
        pieces.forEach(p => validator.addPiece(p));

        // Too close to second piece
        const newPiece = createMockPiece({
          position: createPosition(15.5, 0, 15.5)
        });
        const result = validator.validatePlacement(newPiece);

        expect(result.ok).toBe(false);
      });

      it('should handle pieces without position gracefully', () => {
        const existing = createMockPiece({ position: null });
        validator.graph.addPiece(existing);

        const newPiece = createMockPiece({
          position: createPosition(10, 0, 10)
        });
        const result = validator.validatePlacement(newPiece);

        expect(result.ok).toBe(true);
      });
    });

    describe('structural support (HEURISTIC mode)', () => {
      beforeEach(() => {
        validator.setMode(ValidationMode.HEURISTIC);
      });

      it('should accept grounded pieces without support', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });

      it('should reject non-grounded pieces without support', () => {
        const piece = createMockPiece({
          position: createPosition(10, 5, 10), // Elevated
          isGrounded: false
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(false);
        expect(result.reasons[0].code).toBe(ValidationCode.NO_SUPPORT);
      });

      it('should accept non-grounded pieces with support', () => {
        const support = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        validator.addPiece(support);

        // Position piece far enough to pass overlap check (>1.5) but close enough
        // to find support (<3 units) and be above the support (y > support.y)
        const piece = createMockPiece({
          position: createPosition(11.6, 2, 10), // ~1.6 horizontal, 2 vertical = ~2.56 total distance
          isGrounded: false
        });
        const result = validator.validatePlacement(piece);

        expect(result.ok).toBe(true);
      });
    });

    describe('result structure', () => {
      it('should return valid result with stability', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10)
        });
        const result = validator.validatePlacement(piece);

        expect(result).toHaveProperty('ok', true);
        expect(result).toHaveProperty('stability', 1.0);
        expect(result).toHaveProperty('reasons');
        expect(result.reasons).toHaveLength(0);
      });

      it('should return invalid result with reason', () => {
        const piece = createMockPiece({
          position: createPosition(1, 0, 1)
        });
        const result = validator.validatePlacement(piece);

        expect(result).toHaveProperty('ok', false);
        expect(result).toHaveProperty('stability', 1.0);
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.reasons[0].message).toBeTruthy();
      });
    });
  });

  // ============================================
  // FIND POTENTIAL SUPPORTS TESTS
  // ============================================
  describe('findPotentialSupports', () => {
    it('should return empty array when no pieces exist', () => {
      const piece = createMockPiece({
        position: createPosition(10, 5, 10)
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).toEqual([]);
    });

    it('should find pieces below within range', () => {
      const support = createMockPiece({
        position: createPosition(10, 0, 10)
      });
      validator.addPiece(support);

      const piece = createMockPiece({
        position: createPosition(10, 2, 10) // 2 units above, within range
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).toContain(support);
    });

    it('should not include pieces at same height', () => {
      const adjacent = createMockPiece({
        position: createPosition(11, 0, 10)
      });
      validator.addPiece(adjacent);

      const piece = createMockPiece({
        position: createPosition(10, 0, 10)
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).not.toContain(adjacent);
    });

    it('should not include pieces above', () => {
      const above = createMockPiece({
        position: createPosition(10, 5, 10)
      });
      validator.addPiece(above);

      const piece = createMockPiece({
        position: createPosition(10, 0, 10)
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).not.toContain(above);
    });

    it('should not include pieces too far away', () => {
      const farBelow = createMockPiece({
        position: createPosition(15, 0, 15) // > 3 units away
      });
      validator.addPiece(farBelow);

      const piece = createMockPiece({
        position: createPosition(10, 2, 10)
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).not.toContain(farBelow);
    });

    it('should find multiple supports', () => {
      const support1 = createMockPiece({
        position: createPosition(10, 0, 10)
      });
      const support2 = createMockPiece({
        position: createPosition(11, 0, 10)
      });
      validator.addPiece(support1);
      validator.addPiece(support2);

      const piece = createMockPiece({
        position: createPosition(10.5, 2, 10)
      });
      const supports = validator.findPotentialSupports(piece);

      expect(supports).toHaveLength(2);
      expect(supports).toContain(support1);
      expect(supports).toContain(support2);
    });
  });

  // ============================================
  // GET STABILITY TESTS
  // ============================================
  describe('getStability', () => {
    describe('in SIMPLE mode', () => {
      it('should always return 1.0', () => {
        const piece = createMockPiece();
        validator.addPiece(piece);

        expect(validator.getStability(piece)).toBe(1.0);
      });

      it('should return 1.0 even for non-grounded pieces', () => {
        const piece = createMockPiece({ isGrounded: false });
        validator.addPiece(piece);

        expect(validator.getStability(piece)).toBe(1.0);
      });
    });

    describe('in HEURISTIC mode', () => {
      beforeEach(() => {
        validator.setMode(ValidationMode.HEURISTIC);
      });

      it('should return 1.0 for grounded pieces', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        validator.addPiece(piece);

        expect(validator.getStability(piece)).toBe(1.0);
      });

      it('should return 0 for non-grounded pieces without support', () => {
        const piece = createMockPiece({
          position: createPosition(10, 5, 10),
          isGrounded: false
        });
        validator.addPiece(piece);

        expect(validator.getStability(piece)).toBe(0);
      });

      it('should return 1.0 for pieces with path to ground', () => {
        const ground = createMockPiece({
          id: 'ground',
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        const floating = createMockPiece({
          id: 'floating',
          position: createPosition(10, 2, 10),
          isGrounded: false
        });

        validator.addPiece(ground);
        validator.addPiece(floating);
        validator.graph.addSupportRelation(ground, floating);

        expect(validator.getStability(floating)).toBe(1.0);
      });

      it('should cache stability values', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        validator.addPiece(piece);

        validator.getStability(piece);
        expect(validator.stabilityCache.has(piece.id)).toBe(true);
      });

      it('should return cached value on subsequent calls', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        validator.addPiece(piece);

        const first = validator.getStability(piece);
        const second = validator.getStability(piece);

        expect(first).toBe(second);
      });
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================
  describe('Serialization', () => {
    it('should serialize empty graph', () => {
      const data = validator.serializeGraph();

      expect(data.pieces).toEqual([]);
      expect(data.supports).toEqual([]);
      expect(data.groundedPieces).toEqual([]);
    });

    it('should serialize pieces with positions', () => {
      const piece = createMockPiece({
        id: 'test-piece',
        position: createPosition(10, 5, 15),
        type: 'turret',
        isGrounded: true
      });
      validator.addPiece(piece);

      const data = validator.serializeGraph();

      expect(data.pieces).toHaveLength(1);
      expect(data.pieces[0].id).toBe('test-piece');
      expect(data.pieces[0].position).toEqual({ x: 10, y: 5, z: 15 });
      expect(data.pieces[0].type).toBe('turret');
      expect(data.pieces[0].isGrounded).toBe(true);
    });

    it('should serialize grounded pieces set', () => {
      const grounded = createMockPiece({
        id: 'grounded',
        isGrounded: true
      });
      validator.addPiece(grounded);

      const data = validator.serializeGraph();

      expect(data.groundedPieces).toContain('grounded');
    });

    it('should deserialize pieces', () => {
      const data = {
        pieces: [
          {
            id: 'restored-piece',
            position: { x: 20, y: 0, z: 20 },
            type: 'turret',
            isGrounded: true
          }
        ],
        supports: [],
        groundedPieces: ['restored-piece']
      };

      validator.deserializeGraph(data);

      const pieces = validator.getAllPieces();
      expect(pieces).toHaveLength(1);
      expect(pieces[0].id).toBe('restored-piece');
    });

    it('should deserialize support relations', () => {
      const data = {
        pieces: [
          { id: 'base', position: { x: 10, y: 0, z: 10 }, type: 'turret', isGrounded: true },
          { id: 'top', position: { x: 10, y: 2, z: 10 }, type: 'turret', isGrounded: false }
        ],
        supports: [
          { id: 'base', supports: ['top'] }
        ],
        groundedPieces: ['base']
      };

      validator.deserializeGraph(data);

      const base = validator.graph.pieces.get('base');
      const top = validator.graph.pieces.get('top');

      expect(validator.graph.getSupportedPieces(base)).toContain(top);
    });

    it('should handle null data gracefully', () => {
      validator.addPiece(createMockPiece());
      validator.deserializeGraph(null);

      expect(validator.getAllPieces()).toHaveLength(0);
    });

    it('should clear existing data before deserializing', () => {
      validator.addPiece(createMockPiece({ id: 'old-piece' }));

      validator.deserializeGraph({
        pieces: [{ id: 'new-piece', position: { x: 10, y: 0, z: 10 }, isGrounded: true }],
        supports: [],
        groundedPieces: []
      });

      const pieces = validator.getAllPieces();
      expect(pieces).toHaveLength(1);
      expect(pieces[0].id).toBe('new-piece');
    });
  });

  // ============================================
  // CLEAR TESTS
  // ============================================
  describe('clear', () => {
    it('should remove all pieces', () => {
      const pieces = createPieceGrid(5);
      pieces.forEach(p => validator.addPiece(p));

      validator.clear();

      expect(validator.getAllPieces()).toHaveLength(0);
    });

    it('should clear stability cache', () => {
      validator.setMode(ValidationMode.HEURISTIC);
      const piece = createMockPiece({ position: createPosition(10, 0, 10) });
      validator.addPiece(piece);
      validator.getStability(piece);

      validator.clear();

      expect(validator.stabilityCache.size).toBe(0);
    });
  });

  // ============================================
  // SUPPORT GRAPH INTERNAL TESTS
  // ============================================
  describe('SupportGraph (internal)', () => {
    describe('hasPathToGround', () => {
      beforeEach(() => {
        validator.setMode(ValidationMode.HEURISTIC);
      });

      it('should return true for grounded pieces', () => {
        const piece = createMockPiece({
          position: createPosition(10, 0, 10),
          isGrounded: true
        });
        validator.addPiece(piece);

        expect(validator.graph.hasPathToGround(piece)).toBe(true);
      });

      it('should return false for isolated non-grounded pieces', () => {
        const piece = createMockPiece({
          position: createPosition(10, 5, 10),
          isGrounded: false
        });
        validator.addPiece(piece);

        expect(validator.graph.hasPathToGround(piece)).toBe(false);
      });

      it('should find path through chain of supports', () => {
        const ground = createMockPiece({ id: 'g', isGrounded: true });
        const mid = createMockPiece({ id: 'm', isGrounded: false });
        const top = createMockPiece({ id: 't', isGrounded: false });

        validator.addPiece(ground);
        validator.addPiece(mid);
        validator.addPiece(top);

        validator.graph.addSupportRelation(ground, mid);
        validator.graph.addSupportRelation(mid, top);

        expect(validator.graph.hasPathToGround(top)).toBe(true);
      });
    });

    describe('findDisconnectedAfterRemoval', () => {
      beforeEach(() => {
        validator.setMode(ValidationMode.HEURISTIC);
      });

      it('should find all pieces that lose path to ground', () => {
        const ground = createMockPiece({ id: 'g', isGrounded: true });
        const mid = createMockPiece({ id: 'm', isGrounded: false });
        const top = createMockPiece({ id: 't', isGrounded: false });

        validator.addPiece(ground);
        validator.addPiece(mid);
        validator.addPiece(top);

        validator.graph.addSupportRelation(ground, mid);
        validator.graph.addSupportRelation(mid, top);

        const disconnected = validator.graph.findDisconnectedAfterRemoval(ground);
        expect(disconnected).toContain(mid);
        expect(disconnected).toContain(top);
      });

      it('should not include pieces with alternative paths', () => {
        const ground1 = createMockPiece({ id: 'g1', isGrounded: true });
        const ground2 = createMockPiece({ id: 'g2', isGrounded: true });
        const bridge = createMockPiece({ id: 'b', isGrounded: false });

        validator.addPiece(ground1);
        validator.addPiece(ground2);
        validator.addPiece(bridge);

        validator.graph.addSupportRelation(ground1, bridge);
        validator.graph.addSupportRelation(ground2, bridge);

        const disconnected = validator.graph.findDisconnectedAfterRemoval(ground1);
        expect(disconnected).not.toContain(bridge);
      });
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    it('should handle pieces with exact boundary distances', () => {
      // Exactly at min distance
      const pieceAtMin = createMockPiece({
        position: createPosition(5, 0, 0)
      });
      expect(validator.validatePlacement(pieceAtMin).ok).toBe(true);

      // Exactly at max distance
      const pieceAtMax = createMockPiece({
        position: createPosition(35, 0, 0)
      });
      expect(validator.validatePlacement(pieceAtMax).ok).toBe(true);
    });

    it('should handle diagonal distances correctly', () => {
      // Diagonal distance calculation: sqrt(7^2 + 7^2) = ~9.9 (valid)
      const diagonal = createMockPiece({
        position: createPosition(7, 0, 7)
      });
      expect(validator.validatePlacement(diagonal).ok).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negative = createMockPiece({
        position: createPosition(-10, 0, -10)
      });
      const result = validator.validatePlacement(negative);

      expect(result.ok).toBe(true);
    });

    it('should handle very large piece counts', () => {
      const pieces = createPieceGrid(100, 3, { x: 5, z: 5 });

      let addedCount = 0;
      for (const piece of pieces) {
        const result = validator.validatePlacement(piece);
        if (result.ok) {
          validator.addPiece(piece);
          addedCount++;
        }
      }

      expect(addedCount).toBeGreaterThan(0);
      expect(validator.getAllPieces().length).toBe(addedCount);
    });

    it('should handle repeated add/remove cycles', () => {
      const piece = createMockPiece({ position: createPosition(10, 0, 10) });

      for (let i = 0; i < 10; i++) {
        validator.addPiece(piece);
        expect(validator.getAllPieces()).toContain(piece);

        validator.removePiece(piece);
        expect(validator.getAllPieces()).not.toContain(piece);
      }
    });

    it('should handle pieces with same position as barn with custom config', () => {
      const customValidator = new BuildingValidator({
        barnPosition: createPosition(50, 0, 50),
        minDistanceFromBarn: 0 // Allow pieces at barn
      });

      const pieceAtBarn = createMockPiece({
        position: createPosition(50, 0, 50)
      });
      const result = customValidator.validatePlacement(pieceAtBarn);

      expect(result.ok).toBe(true);
    });
  });
});
