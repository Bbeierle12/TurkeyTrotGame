/**
 * BuildingValidator - Structural validation for turret placement
 * 
 * Adapted from the skills blueprint (HeuristicValidator) for Homestead Siege.
 * Validates turret placement based on distance rules and optional structural support.
 */

import * as THREE from 'three';

/**
 * Validation modes
 */
export const ValidationMode = {
  SIMPLE: 'simple',       // Distance-based only (current game)
  HEURISTIC: 'heuristic'  // Full structural validation (future expansion)
};

/**
 * Placement validation codes for UI feedback.
 */
export const ValidationCode = Object.freeze({
  NO_POSITION: 'NO_POSITION',
  TOO_CLOSE: 'TOO_CLOSE',
  TOO_FAR: 'TOO_FAR',
  BLOCKED: 'BLOCKED',
  NO_SUPPORT: 'NO_SUPPORT'
});

/**
 * Support graph for tracking piece relationships
 */
class SupportGraph {
  constructor() {
    this.pieces = new Map();
    this.supports = new Map();
    this.supportedBy = new Map();
    this.groundedPieces = new Set();
  }

  addPiece(piece) {
    this.pieces.set(piece.id, piece);
    this.supports.set(piece.id, new Set());
    this.supportedBy.set(piece.id, new Set());

    if (piece.isGrounded) {
      this.groundedPieces.add(piece.id);
    }
  }

  removePiece(piece) {
    const id = piece.id;

    for (const supporter of this.supportedBy.get(id) || []) {
      this.supports.get(supporter.id)?.delete(piece);
    }

    for (const supported of this.supports.get(id) || []) {
      this.supportedBy.get(supported.id)?.delete(piece);
    }

    this.pieces.delete(id);
    this.supports.delete(id);
    this.supportedBy.delete(id);
    this.groundedPieces.delete(id);
  }

  addSupportRelation(supporter, supported) {
    this.supports.get(supporter.id)?.add(supported);
    this.supportedBy.get(supported.id)?.add(supporter);
  }

  getSupports(piece) {
    return Array.from(this.supportedBy.get(piece.id) || []);
  }

  getSupportedPieces(piece) {
    return Array.from(this.supports.get(piece.id) || []);
  }

  isGrounded(piece) {
    return this.groundedPieces.has(piece.id);
  }

  hasPathToGround(piece) {
    if (this.isGrounded(piece)) return true;

    const visited = new Set();
    const queue = [piece];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (this.isGrounded(current)) return true;

      for (const supporter of this.getSupports(current)) {
        if (!visited.has(supporter.id)) {
          queue.push(supporter);
        }
      }
    }

    return false;
  }

  findDisconnectedAfterRemoval(piece) {
    const supported = this.getSupportedPieces(piece);
    const potentiallyAffected = new Set();
    const queue = [...supported];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === piece || potentiallyAffected.has(current)) continue;
      potentiallyAffected.add(current);

      for (const s of this.getSupportedPieces(current)) {
        queue.push(s);
      }
    }

    const disconnected = [];
    for (const affected of potentiallyAffected) {
      if (!this.hasPathToGroundExcluding(affected, piece)) {
        disconnected.push(affected);
      }
    }

    return disconnected;
  }

  hasPathToGroundExcluding(piece, excluded) {
    if (piece === excluded) return false;
    if (this.isGrounded(piece)) return true;

    const visited = new Set([excluded.id]);
    const queue = [piece];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (this.isGrounded(current)) return true;

      for (const supporter of this.getSupports(current)) {
        if (!visited.has(supporter.id)) {
          queue.push(supporter);
        }
      }
    }

    return false;
  }

  getAllPieces() {
    return Array.from(this.pieces.values());
  }

  clear() {
    this.pieces.clear();
    this.supports.clear();
    this.supportedBy.clear();
    this.groundedPieces.clear();
  }

  serialize() {
    return {
      pieces: Array.from(this.pieces.entries()).map(([id, piece]) => ({
        id,
        position: piece.position ? { x: piece.position.x, y: piece.position.y, z: piece.position.z } : null,
        type: piece.type,
        isGrounded: piece.isGrounded
      })),
      supports: Array.from(this.supports.entries()).map(([id, set]) => ({
        id,
        supports: Array.from(set).map(p => p.id)
      })),
      groundedPieces: Array.from(this.groundedPieces)
    };
  }

  deserialize(data) {
    this.clear();
    
    if (!data) return;

    // Restore pieces
    for (const pieceData of data.pieces || []) {
      const piece = {
        id: pieceData.id,
        position: pieceData.position ? new THREE.Vector3(
          pieceData.position.x,
          pieceData.position.y,
          pieceData.position.z
        ) : null,
        type: pieceData.type,
        isGrounded: pieceData.isGrounded
      };
      this.addPiece(piece);
    }

    // Restore support relations
    for (const supportData of data.supports || []) {
      const supporter = this.pieces.get(supportData.id);
      if (!supporter) continue;

      for (const supportedId of supportData.supports) {
        const supported = this.pieces.get(supportedId);
        if (supported) {
          this.addSupportRelation(supporter, supported);
        }
      }
    }
  }
}

/**
 * Main validator class
 */
export class BuildingValidator {
  constructor(options = {}) {
    this.mode = options.mode ?? ValidationMode.SIMPLE;
    this.minDistanceFromBarn = options.minDistanceFromBarn ?? 5;
    this.maxDistanceFromBarn = options.maxDistanceFromBarn ?? 35;
    this.barnPosition = options.barnPosition ?? new THREE.Vector3(0, 0, 0);
    this.snapTolerance = options.snapTolerance ?? 0.15;

    this.graph = new SupportGraph();
    this.stabilityCache = new Map();
  }

  /**
   * Add a piece to the system
   */
  addPiece(piece) {
    piece.isGrounded = piece.isGrounded ?? true; // Turrets are grounded by default
    this.graph.addPiece(piece);
    return piece;
  }

  /**
   * Remove a piece and get pieces that would collapse
   */
  removePiece(piece) {
    if (this.mode === ValidationMode.SIMPLE) {
      this.graph.removePiece(piece);
      return []; // No cascading in simple mode
    }

    const toCollapse = this.graph.findDisconnectedAfterRemoval(piece);
    this.graph.removePiece(piece);
    this.stabilityCache.delete(piece.id);

    return toCollapse;
  }

  /**
   * Validate if a piece can be placed
   */
  validatePlacement(piece) {
    const result = {
      ok: false,
      stability: 1.0,
      reasons: [],
      debug: {}
    };

    const position = piece.position;
    if (!position) {
      result.reasons.push({
        code: ValidationCode.NO_POSITION,
        message: 'No position specified'
      });
      return result;
    }

    // Check distance from barn
    const distToBarn = position.distanceTo(this.barnPosition);
    result.debug.distanceToBarn = distToBarn;
    result.debug.minDistanceFromBarn = this.minDistanceFromBarn;
    result.debug.maxDistanceFromBarn = this.maxDistanceFromBarn;

    if (distToBarn < this.minDistanceFromBarn) {
      result.reasons.push({
        code: ValidationCode.TOO_CLOSE,
        message: `Too close to barn (min: ${this.minDistanceFromBarn} units)`,
        data: {
          minDistance: this.minDistanceFromBarn,
          distance: distToBarn
        }
      });
    }

    if (distToBarn > this.maxDistanceFromBarn) {
      result.reasons.push({
        code: ValidationCode.TOO_FAR,
        message: `Too far from barn (max: ${this.maxDistanceFromBarn} units)`,
        data: {
          maxDistance: this.maxDistanceFromBarn,
          distance: distToBarn
        }
      });
    }

    // Check for overlapping pieces
    const minSpacing = 1.5; // Minimum spacing between turrets
    const offenders = [];
    for (const existing of this.graph.getAllPieces()) {
      if (existing.position) {
        const dist = position.distanceTo(existing.position);
        if (dist < minSpacing) {
          offenders.push({
            id: existing.id,
            distance: dist
          });
        }
      }
    }
    if (offenders.length > 0) {
      result.reasons.push({
        code: ValidationCode.BLOCKED,
        message: 'Too close to another structure',
        data: {
          minSpacing,
          offenders
        }
      });
      result.debug.offendingIds = offenders.map(offender => offender.id);
    }

    // In heuristic mode, check structural support
    if (this.mode === ValidationMode.HEURISTIC) {
      const supports = this.findPotentialSupports(piece);
      if (supports.length === 0 && !piece.isGrounded) {
        result.reasons.push({
          code: ValidationCode.NO_SUPPORT,
          message: 'No support found'
        });
      }
    }

    result.ok = result.reasons.length === 0;
    return result;
  }

  /**
   * Find potential support pieces
   */
  findPotentialSupports(piece) {
    const supports = [];
    const position = piece.position;

    for (const other of this.graph.getAllPieces()) {
      if (!other.position) continue;

      const dist = position.distanceTo(other.position);
      if (dist < 3 && other.position.y < position.y) {
        supports.push(other);
      }
    }

    return supports;
  }

  /**
   * Get stability of a piece (always 1.0 in simple mode)
   */
  getStability(piece) {
    if (this.mode === ValidationMode.SIMPLE) {
      return 1.0;
    }

    if (this.stabilityCache.has(piece.id)) {
      return this.stabilityCache.get(piece.id);
    }

    const stability = this.graph.hasPathToGround(piece) ? 1.0 : 0;
    this.stabilityCache.set(piece.id, stability);
    return stability;
  }

  /**
   * Serialize the support graph
   */
  serializeGraph() {
    return this.graph.serialize();
  }

  /**
   * Deserialize the support graph
   */
  deserializeGraph(data) {
    this.graph.deserialize(data);
  }

  /**
   * Set validation mode
   */
  setMode(mode) {
    this.mode = mode;
    this.stabilityCache.clear();
  }

  /**
   * Get all pieces
   */
  getAllPieces() {
    return this.graph.getAllPieces();
  }

  /**
   * Clear all data
   */
  clear() {
    this.graph.clear();
    this.stabilityCache.clear();
  }
}

export default BuildingValidator;
