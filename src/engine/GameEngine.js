/**
 * GameEngine - Decoupled game state manager
 * 
 * This class manages all game state independently of React,
 * preparing the architecture for the skills-based systems.
 */

import * as THREE from 'three';
import { SpatialHashGrid2D } from './SpatialHashGrid2D.js';
import { BuildingValidator } from './BuildingValidator.js';
import { DamageManager } from './DamageManager.js';

/**
 * Game state snapshot for serialization
 */
export class StateSnapshot {
  constructor(state) {
    this.timestamp = Date.now();
    this.wave = state.wave;
    this.score = state.score;
    this.currency = state.currency;
    this.barnHealth = state.barn.health;
    this.barnMaxHealth = state.barn.maxHealth;
    this.playerPos = state.player.pos.clone();
    this.turretCount = state.turrets.length;
    this.turkeyCount = state.turkeys.length;
    this.projectileCount = state.projectiles.length;
  }
}

/**
 * Main game engine class
 */
export class GameEngine {
  constructor(options = {}) {
    // Configuration
    this.config = {
      spatialCellSize: 5,      // Cell size for spatial hashing
      maxTurkeys: 500,         // Max turkeys before performance warning
      maxProjectiles: 200,     // Max projectiles
      collisionRadius: 2.0,    // Query radius for collisions
      turretMinDistance: 5,    // Min distance from barn for turrets
      turretMaxDistance: 35,   // Max distance from barn for turrets
      ...options
    };

    // Core state
    this.state = {
      started: false,
      gameOver: false,
      paused: false,
      endlessMode: false,
      
      player: {
        pos: new THREE.Vector3(0, 0, 10),
        rot: 0,
        pitch: 0
      },
      
      barn: {
        health: 175,
        maxHealth: 175,
        pos: new THREE.Vector3(0, 0, 0)
      },
      
      turkeys: [],
      projectiles: [],
      turretProjectiles: [],
      turrets: [],
      
      wave: 0,
      toSpawn: 0,
      spawnTimer: 0,
      currency: 100,
      score: 0,
      
      currentWeapon: 'PITCHFORK',
      lastFire: 0,
      shootTimer: 0,
      
      input: {
        w: false, a: false, s: false, d: false,
        firing: false,
        panUp: false, panDown: false, panLeft: false, panRight: false
      },
      
      aim: new THREE.Vector3(),
      shakeIntensity: 0,
      shakeDuration: 0,
      
      waveComplete: false,
      waveComp: {},
      waveStartHealth: 175,
      globalFreeze: 0,
      rageActive: 0,
      pendingAirstrike: null,
      
      upgrades: {
        barnArmor: 0,
        weaponDamage: 0,
        fireRate: 0,
        maxHealth: 0
      }
    };

    // Spatial indexing for turkeys (O(1) collision queries)
    this.turkeyGrid = new SpatialHashGrid2D(this.config.spatialCellSize);
    
    // Spatial indexing for turrets
    this.turretGrid = new SpatialHashGrid2D(this.config.spatialCellSize);
    
    // Building validation system
    this.buildingValidator = new BuildingValidator({
      minDistanceFromBarn: this.config.turretMinDistance,
      maxDistanceFromBarn: this.config.turretMaxDistance
    });
    
    // Damage management system
    this.damageManager = new DamageManager(this.buildingValidator);
    
    // Performance metrics
    this.metrics = {
      entityCount: 0,
      collisionChecks: 0,
      lastFrameTime: 0,
      avgFrameTime: 0,
      spatialQueries: 0
    };

    // Event callbacks
    this.callbacks = {
      onTurkeyKilled: null,
      onBarnDamaged: null,
      onGameOver: null,
      onWaveComplete: null,
      onTurretDestroyed: null,
      onTurretPlaced: null
    };
  }

  /**
   * Reset game state for new game
   */
  reset() {
    this.state.turkeys = [];
    this.state.projectiles = [];
    this.state.turretProjectiles = [];
    this.state.turrets = [];
    
    this.state.wave = 0;
    this.state.toSpawn = 0;
    this.state.currency = 100;
    this.state.score = 0;
    this.state.barn.health = 175;
    this.state.barn.maxHealth = 175;
    this.state.gameOver = false;
    this.state.waveComplete = false;
    this.state.currentWeapon = 'PITCHFORK';
    
    this.state.player.pos.set(0, 0, 10);
    this.state.globalFreeze = 0;
    this.state.rageActive = 0;
    
    this.state.upgrades = {
      barnArmor: 0,
      weaponDamage: 0,
      fireRate: 0,
      maxHealth: 0
    };
    
    // Clear spatial indices
    this.turkeyGrid.clear();
    this.turretGrid.clear();
    
    // Clear building systems
    this.buildingValidator.clear();
    this.damageManager.clear();
    
    this.resetMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      entityCount: 0,
      collisionChecks: 0,
      lastFrameTime: 0,
      avgFrameTime: 16.67,
      spatialQueries: 0
    };
  }

  // ========================================
  // TURKEY MANAGEMENT
  // ========================================

  /**
   * Add turkey to the game with spatial indexing
   */
  addTurkey(turkey) {
    this.state.turkeys.push(turkey);
    this.turkeyGrid.insert(turkey, turkey.pos);
  }

  /**
   * Remove turkey from the game
   */
  removeTurkey(turkey) {
    const idx = this.state.turkeys.indexOf(turkey);
    if (idx !== -1) {
      this.state.turkeys.splice(idx, 1);
      this.turkeyGrid.remove(turkey);
    }
  }

  /**
   * Update turkey position in spatial grid
   */
  updateTurkeyPosition(turkey) {
    this.turkeyGrid.update(turkey, turkey.pos);
  }

  /**
   * Query nearby turkeys using spatial hash (O(1) average case)
   */
  queryNearbyTurkeys(position, radius) {
    this.metrics.spatialQueries++;
    return this.turkeyGrid.queryRadius(position, radius);
  }

  // ========================================
  // COLLISION DETECTION (Optimized)
  // ========================================

  /**
   * Check projectile-turkey collisions using spatial indexing
   * This replaces the O(N²) nested loop with O(N) with O(1) spatial queries
   */
  checkProjectileCollisions(projectile, collisionRadius = 0.7) {
    // Use spatial hash to get only nearby turkeys
    const nearbyCandidates = this.queryNearbyTurkeys(
      projectile.mesh.position,
      this.config.collisionRadius
    );
    
    const hits = [];
    
    for (const turkey of nearbyCandidates) {
      if (projectile.hits.has(turkey) || turkey.dead) continue;
      
      // Precise distance check (only for nearby candidates)
      const dx = projectile.mesh.position.x - turkey.pos.x;
      const dz = projectile.mesh.position.z - turkey.pos.z;
      const distSq = dx * dx + dz * dz;
      const hitRadius = collisionRadius * turkey.scale;
      
      if (distSq < hitRadius * hitRadius) {
        hits.push(turkey);
        this.metrics.collisionChecks++;
      }
    }
    
    return hits;
  }

  /**
   * Find closest turkey to a position (for turret targeting)
   */
  findClosestTurkey(position, maxRange) {
    const candidates = this.queryNearbyTurkeys(position, maxRange);
    
    let closest = null;
    let closestDist = maxRange;
    
    for (const turkey of candidates) {
      if (turkey.dead) continue;
      
      const dist = turkey.pos.distanceTo(position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = turkey;
      }
    }
    
    return closest;
  }

  // ========================================
  // TURRET MANAGEMENT
  // ========================================

  /**
   * Validate and place a turret
   */
  placeTurret(turret, position) {
    // Use building validator for structural validation
    const validation = this.buildingValidator.validatePlacement({
      id: turret.id || `turret_${Date.now()}`,
      position: position.clone(),
      type: 'turret',
      turretType: turret.type
    });
    
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }
    
    // Add to state
    turret.pos = position.clone();
    this.state.turrets.push(turret);
    
    // Add to spatial index
    this.turretGrid.insert(turret, position);
    
    // Register with building validator
    this.buildingValidator.addPiece({
      id: turret.id || `turret_${Date.now()}`,
      position: position.clone(),
      type: 'turret',
      turretType: turret.type,
      isGrounded: true
    });
    
    // Register with damage system
    this.damageManager.registerPiece(turret, {
      maxHealth: turret.maxHealth || 100
    });
    
    // Callback
    if (this.callbacks.onTurretPlaced) {
      this.callbacks.onTurretPlaced(turret);
    }
    
    return { success: true };
  }

  /**
   * Damage a turret
   */
  damageTurret(turret, damage, damageType = 'physical') {
    const result = this.damageManager.applyDamage(turret, damage, damageType);
    
    if (result && result.destroyed) {
      this.removeTurret(turret);
      
      if (this.callbacks.onTurretDestroyed) {
        this.callbacks.onTurretDestroyed(turret, result);
      }
    }
    
    return result;
  }

  /**
   * Remove a turret
   */
  removeTurret(turret) {
    const idx = this.state.turrets.indexOf(turret);
    if (idx !== -1) {
      this.state.turrets.splice(idx, 1);
      this.turretGrid.remove(turret);
      this.buildingValidator.removePiece(turret);
      this.damageManager.unregisterPiece(turret);
    }
  }

  // ========================================
  // PROJECTILE MANAGEMENT
  // ========================================

  /**
   * Add projectile
   */
  addProjectile(projectile, fromTurret = false) {
    if (fromTurret) {
      this.state.turretProjectiles.push(projectile);
    } else {
      this.state.projectiles.push(projectile);
    }
  }

  /**
   * Remove projectile
   */
  removeProjectile(projectile, fromTurret = false) {
    const arr = fromTurret ? this.state.turretProjectiles : this.state.projectiles;
    const idx = arr.indexOf(projectile);
    if (idx !== -1) {
      arr.splice(idx, 1);
    }
  }

  // ========================================
  // GAME LOOP HELPERS
  // ========================================

  /**
   * Sync spatial indices with current turkey positions
   * Call this after moving all turkeys
   */
  syncSpatialIndices() {
    // Rebuild turkey grid (more efficient than individual updates for many turkeys)
    this.turkeyGrid.clear();
    for (const turkey of this.state.turkeys) {
      if (!turkey.dead) {
        this.turkeyGrid.insert(turkey, turkey.pos);
      }
    }
  }

  /**
   * Update damage system (fire, decay, collapse animations)
   */
  updateDamageSystem(deltaTime) {
    this.damageManager.update(deltaTime);
  }

  /**
   * Get current entity count
   */
  getEntityCount() {
    return {
      turkeys: this.state.turkeys.length,
      projectiles: this.state.projectiles.length + this.state.turretProjectiles.length,
      turrets: this.state.turrets.length,
      total: this.state.turkeys.length + 
             this.state.projectiles.length + 
             this.state.turretProjectiles.length + 
             this.state.turrets.length
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const entityCount = this.getEntityCount();
    return {
      ...this.metrics,
      ...entityCount,
      spatialGridStats: this.turkeyGrid.getStats()
    };
  }

  // ========================================
  // SERIALIZATION
  // ========================================

  /**
   * Create a state snapshot for saving
   */
  createSnapshot() {
    return new StateSnapshot(this.state);
  }

  /**
   * Serialize building data for save
   */
  serializeBuildingData() {
    return {
      turrets: this.state.turrets.map(t => ({
        id: t.id,
        type: t.type,
        position: { x: t.pos.x, y: t.pos.y, z: t.pos.z },
        health: this.damageManager.getDamageable(t)?.health || 100
      })),
      supportGraph: this.buildingValidator.serializeGraph()
    };
  }

  /**
   * Deserialize building data from save
   */
  deserializeBuildingData(data) {
    if (!data) return;
    
    // Restore support graph first
    if (data.supportGraph) {
      this.buildingValidator.deserializeGraph(data.supportGraph);
    }
    
    // Turrets will be recreated by the renderer
    return data.turrets;
  }
}

export default GameEngine;
