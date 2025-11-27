/**
 * DamageManager - Damage states and cascading destruction for turrets
 * 
 * Adapted from the skills blueprint (DamageSystem) for Turkey Trot Defense.
 * Handles turret damage states, visual feedback, and destruction cascades.
 */

import * as THREE from 'three';

/**
 * Damage states
 */
export const DamageState = {
  PRISTINE: 'pristine',     // 100-61% health
  DAMAGED: 'damaged',       // 60-26% health
  CRITICAL: 'critical',     // 25-1% health
  DESTROYED: 'destroyed'    // 0% health
};

/**
 * Damage types
 */
export const DamageType = {
  PHYSICAL: 'physical',
  EXPLOSIVE: 'explosive',
  STRUCTURAL: 'structural'
};

/**
 * Damageable wrapper for turrets
 */
class DamageablePiece {
  constructor(piece, options = {}) {
    this.piece = piece;
    this.maxHealth = options.maxHealth ?? 100;
    this.health = this.maxHealth;
    this.damageState = DamageState.PRISTINE;
    this.damageHistory = [];
  }

  takeDamage(amount, type = DamageType.PHYSICAL, source = null) {
    const actualDamage = amount;
    this.health = Math.max(0, this.health - actualDamage);
    this.updateDamageState();

    this.damageHistory.push({
      amount: actualDamage,
      type,
      source,
      timestamp: Date.now(),
      healthAfter: this.health
    });

    return {
      damageDealt: actualDamage,
      newHealth: this.health,
      newState: this.damageState,
      destroyed: this.damageState === DamageState.DESTROYED
    };
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateDamageState();
    return this.health;
  }

  updateDamageState() {
    const healthPercent = this.health / this.maxHealth;

    if (healthPercent <= 0) {
      this.damageState = DamageState.DESTROYED;
    } else if (healthPercent <= 0.25) {
      this.damageState = DamageState.CRITICAL;
    } else if (healthPercent <= 0.6) {
      this.damageState = DamageState.DAMAGED;
    } else {
      this.damageState = DamageState.PRISTINE;
    }
  }

  getStabilityModifier() {
    switch (this.damageState) {
      case DamageState.PRISTINE: return 1.0;
      case DamageState.DAMAGED: return 0.85;
      case DamageState.CRITICAL: return 0.6;
      default: return 0;
    }
  }

  getHealthPercent() {
    return this.health / this.maxHealth;
  }
}

/**
 * Collapse animation
 */
class CollapseAnimation {
  constructor(piece, options = {}) {
    this.piece = piece;
    this.mesh = piece.mesh || piece;
    this.startTime = performance.now();
    this.delay = options.delay ?? 0;
    this.duration = options.duration ?? 800 + Math.random() * 400;
    
    this.startPosition = this.mesh.position.clone();
    this.startRotation = this.mesh.rotation.clone();
    this.startScale = this.mesh.scale.clone();
    
    this.velocity = options.velocity ?? new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 2 - 1,
      (Math.random() - 0.5) * 3
    );
    this.angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    this.gravity = options.gravity ?? -15;
    
    this.phase = 'waiting';
    this.progress = 0;
    this.complete = false;
  }

  update(deltaTime) {
    const elapsed = performance.now() - this.startTime;

    if (this.phase === 'waiting') {
      if (elapsed >= this.delay) {
        this.phase = 'falling';
        this.fallStart = performance.now();
      }
      return false;
    }

    const fallElapsed = performance.now() - this.fallStart;
    this.progress = Math.min(fallElapsed / this.duration, 1);
    const t = this.progress;

    const dt = t;
    
    this.mesh.position.x = this.startPosition.x + this.velocity.x * dt * 2;
    this.mesh.position.y = this.startPosition.y + this.velocity.y * dt * 2 + 0.5 * this.gravity * dt * dt * 4;
    this.mesh.position.z = this.startPosition.z + this.velocity.z * dt * 2;

    this.mesh.rotation.x = this.startRotation.x + this.angularVelocity.x * t;
    this.mesh.rotation.y = this.startRotation.y + this.angularVelocity.y * t;
    this.mesh.rotation.z = this.startRotation.z + this.angularVelocity.z * t;

    const scale = 1 - t * 0.3;
    this.mesh.scale.setScalar(scale);

    if (this.mesh.material) {
      if (!this.mesh.material.transparent) {
        this.mesh.material = this.mesh.material.clone();
        this.mesh.material.transparent = true;
      }
      this.mesh.material.opacity = 1 - t;
    }

    if (this.progress >= 1) {
      this.complete = true;
      return true;
    }

    return false;
  }
}

/**
 * Main damage manager
 */
export class DamageManager {
  constructor(validator, options = {}) {
    this.validator = validator;
    
    this.cascadeDamagePercent = options.cascadeDamagePercent ?? 0.2;
    this.cascadeRadius = options.cascadeRadius ?? 2;
    this.collapseDelay = options.collapseDelay ?? 50;
    
    this.damageables = new Map();
    this.activeCollapses = [];
    this.pendingDestructions = [];
    this.scene = options.scene ?? null;
    
    this.onPieceDestroyed = options.onPieceDestroyed ?? null;
    this.onPieceDamaged = options.onPieceDamaged ?? null;
    this.onCollapseComplete = options.onCollapseComplete ?? null;
  }

  registerPiece(piece, options = {}) {
    const id = piece.id || `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    piece.id = id;
    const damageable = new DamageablePiece(piece, options);
    this.damageables.set(id, damageable);
    return damageable;
  }

  unregisterPiece(piece) {
    this.damageables.delete(piece.id);
  }

  getDamageable(piece) {
    return this.damageables.get(piece.id);
  }

  applyDamage(piece, amount, type = DamageType.PHYSICAL, source = null) {
    const damageable = this.getDamageable(piece);
    if (!damageable) return null;

    const result = damageable.takeDamage(amount, type, source);

    if (this.onPieceDamaged) {
      this.onPieceDamaged(piece, result);
    }

    if (result.destroyed) {
      this.destroyPiece(piece, { damageType: type, source });
    }

    return result;
  }

  applyExplosiveDamage(center, radius, baseDamage) {
    const affected = [];
    
    for (const [id, damageable] of this.damageables) {
      const piece = damageable.piece;
      const position = piece.pos || piece.position || piece.mesh?.position;
      if (!position) continue;
      
      const distance = position.distanceTo(center);
      
      if (distance <= radius) {
        const falloff = 1 - (distance / radius);
        const damage = baseDamage * falloff * falloff;
        
        const result = this.applyDamage(piece, damage, DamageType.EXPLOSIVE, center);
        affected.push({ piece, result, distance });
      }
    }

    return affected;
  }

  destroyPiece(piece, options = {}) {
    const damageable = this.getDamageable(piece);
    
    const result = {
      destroyed: piece,
      collapsed: [],
      damaged: [],
      animations: []
    };

    if (piece.mesh || piece instanceof THREE.Object3D) {
      const anim = new CollapseAnimation(piece, { delay: 0 });
      this.activeCollapses.push(anim);
      result.animations.push(anim);
    }

    const unstable = this.validator.removePiece(piece);
    
    for (let i = 0; i < unstable.length; i++) {
      const unstablePiece = unstable[i];
      
      this.pendingDestructions.push({
        piece: unstablePiece,
        delay: (i + 1) * this.collapseDelay,
        timestamp: performance.now(),
        cause: 'structural'
      });
    }

    result.collapsed = unstable;

    const neighbors = this.findNeighbors(piece, this.cascadeRadius);
    for (const neighbor of neighbors) {
      if (neighbor === piece || unstable.includes(neighbor)) continue;
      
      const cascadeDamage = (damageable?.maxHealth ?? 100) * this.cascadeDamagePercent;
      const damageResult = this.applyDamage(neighbor, cascadeDamage, DamageType.STRUCTURAL, piece);
      
      if (damageResult && !damageResult.destroyed) {
        result.damaged.push({ piece: neighbor, damage: cascadeDamage });
      }
    }

    this.unregisterPiece(piece);

    if (this.onPieceDestroyed) {
      this.onPieceDestroyed(piece, result);
    }

    return result;
  }

  findNeighbors(piece, radius) {
    const neighbors = [];
    const position = piece.pos || piece.position || piece.mesh?.position;
    if (!position) return neighbors;

    for (const [id, damageable] of this.damageables) {
      if (damageable.piece === piece) continue;
      
      const neighborPos = damageable.piece.pos || damageable.piece.position || damageable.piece.mesh?.position;
      if (!neighborPos) continue;
      
      const dist = neighborPos.distanceTo(position);
      if (dist <= radius) {
        neighbors.push(damageable.piece);
      }
    }

    return neighbors;
  }

  update(deltaTime) {
    const now = performance.now();

    for (let i = this.pendingDestructions.length - 1; i >= 0; i--) {
      const pending = this.pendingDestructions[i];
      
      if (now - pending.timestamp >= pending.delay) {
        this.pendingDestructions.splice(i, 1);
        
        const piece = pending.piece;
        if (piece.mesh || piece instanceof THREE.Object3D) {
          const anim = new CollapseAnimation(piece, {
            delay: 0,
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * -2,
              (Math.random() - 0.5) * 2
            )
          });
          this.activeCollapses.push(anim);
        }

        this.unregisterPiece(piece);
        this.validator.removePiece(piece);
      }
    }

    for (let i = this.activeCollapses.length - 1; i >= 0; i--) {
      const anim = this.activeCollapses[i];
      const complete = anim.update(deltaTime);

      if (complete) {
        this.activeCollapses.splice(i, 1);
        
        if (this.scene && anim.mesh.parent) {
          anim.mesh.parent.remove(anim.mesh);
        }

        if (this.onCollapseComplete) {
          this.onCollapseComplete(anim.piece);
        }
      }
    }
  }

  getStats() {
    let totalHealth = 0;
    let totalMaxHealth = 0;
    let damagedCount = 0;
    let criticalCount = 0;

    for (const [id, damageable] of this.damageables) {
      totalHealth += damageable.health;
      totalMaxHealth += damageable.maxHealth;
      
      if (damageable.damageState === DamageState.DAMAGED) damagedCount++;
      if (damageable.damageState === DamageState.CRITICAL) criticalCount++;
    }

    return {
      totalPieces: this.damageables.size,
      healthPercent: totalMaxHealth > 0 ? Math.round(totalHealth / totalMaxHealth * 100) : 0,
      damagedPieces: damagedCount,
      criticalPieces: criticalCount,
      activeCollapses: this.activeCollapses.length,
      pendingDestructions: this.pendingDestructions.length
    };
  }

  clear() {
    this.damageables.clear();
    this.activeCollapses = [];
    this.pendingDestructions = [];
  }
}

/**
 * Visual damage feedback
 */
export class DamageVisualizer {
  constructor() {
    this.colors = {
      pristine: null,
      damaged: new THREE.Color(0xaa8866),
      critical: new THREE.Color(0x884422)
    };
  }

  updateVisuals(piece, damageable) {
    const mesh = piece.mesh || piece;
    if (!mesh.material) return;

    switch (damageable.damageState) {
      case DamageState.DAMAGED:
        this.applyDamageColor(mesh, this.colors.damaged, 0.3);
        break;
      case DamageState.CRITICAL:
        this.applyDamageColor(mesh, this.colors.critical, 0.6);
        break;
      default:
        this.restoreOriginalColor(mesh);
    }
  }

  applyDamageColor(mesh, color, intensity) {
    if (!mesh._originalColor) {
      mesh._originalColor = mesh.material.color.clone();
    }
    mesh.material.color.copy(mesh._originalColor).lerp(color, intensity);
  }

  restoreOriginalColor(mesh) {
    if (mesh._originalColor) {
      mesh.material.color.copy(mesh._originalColor);
    }
  }
}

export default DamageManager;
