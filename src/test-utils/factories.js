/**
 * Test Factories
 *
 * Factory functions to create consistent test data
 */

import { Vector3 } from '../engine/__tests__/__mocks__/three.js';

let idCounter = 0;

/**
 * Generate a unique ID for test objects
 */
export function generateId(prefix = 'test') {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

/**
 * Reset the ID counter (call in beforeEach)
 */
export function resetIdCounter() {
  idCounter = 0;
}

// ============================================
// POSITION FACTORIES
// ============================================

/**
 * Create a Vector3 position
 */
export function createPosition(x = 0, y = 0, z = 0) {
  return new Vector3(x, y, z);
}

/**
 * Create a random position within bounds
 */
export function createRandomPosition(bounds = { min: -50, max: 50 }) {
  return new Vector3(
    bounds.min + Math.random() * (bounds.max - bounds.min),
    0,
    bounds.min + Math.random() * (bounds.max - bounds.min)
  );
}

// ============================================
// PIECE FACTORIES
// ============================================

/**
 * Create a mock piece for BuildingValidator/DamageManager tests
 */
export function createMockPiece(overrides = {}) {
  const id = overrides.id ?? generateId('piece');
  return {
    id,
    position: overrides.position ?? createPosition(10, 0, 10),
    isGrounded: overrides.isGrounded ?? true,
    type: overrides.type ?? 'turret',
    health: overrides.health ?? 100,
    maxHealth: overrides.maxHealth ?? 100,
    mesh: overrides.mesh ?? null,
    ...overrides
  };
}

/**
 * Create multiple pieces in a grid pattern
 */
export function createPieceGrid(count, spacing = 3, startPos = { x: 5, z: 5 }) {
  const pieces = [];
  const cols = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    pieces.push(
      createMockPiece({
        position: createPosition(
          startPos.x + col * spacing,
          0,
          startPos.z + row * spacing
        )
      })
    );
  }

  return pieces;
}

// ============================================
// TURKEY FACTORIES
// ============================================

/**
 * Create a mock turkey entity
 */
export function createMockTurkey(overrides = {}) {
  const typeDefaults = {
    STANDARD: { hp: 35, speed: 1.0, damage: 8, value: 10 },
    RUNNER: { hp: 22, speed: 1.8, damage: 6, value: 12 },
    TANK: { hp: 120, speed: 0.6, damage: 20, value: 30 },
    HEALER: { hp: 40, speed: 0.9, damage: 5, value: 20 },
    SPLITTER: { hp: 60, speed: 1.0, damage: 12, value: 25 },
    BOSS: { hp: 800, speed: 0.5, damage: 40, value: 200 }
  };

  const type = overrides.type ?? 'STANDARD';
  const defaults = typeDefaults[type] ?? typeDefaults.STANDARD;

  return {
    id: overrides.id ?? generateId('turkey'),
    type,
    pos: overrides.pos ?? overrides.position ?? createPosition(30, 0, 30),
    hp: overrides.hp ?? defaults.hp,
    maxHp: overrides.maxHp ?? defaults.hp,
    speed: overrides.speed ?? defaults.speed,
    damage: overrides.damage ?? defaults.damage,
    value: overrides.value ?? defaults.value,
    slowed: overrides.slowed ?? 0,
    mesh: overrides.mesh ?? createMockMesh(),
    attackCooldown: overrides.attackCooldown ?? 0,
    ...overrides
  };
}

/**
 * Create a wave of turkeys
 */
export function createTurkeyWave(composition = { STANDARD: 5, RUNNER: 2 }) {
  const turkeys = [];

  for (const [type, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) {
      turkeys.push(
        createMockTurkey({
          type,
          pos: createRandomPosition({ min: 35, max: 50 })
        })
      );
    }
  }

  return turkeys;
}

// ============================================
// PROJECTILE FACTORIES
// ============================================

/**
 * Create a mock projectile
 */
export function createMockProjectile(overrides = {}) {
  const weaponDefaults = {
    PITCHFORK: { damage: 28, speed: 32, pierce: 2, splash: 0 },
    CORN_CANNON: { damage: 45, speed: 26, pierce: 0, splash: 3.2 },
    EGG_BLASTER: { damage: 12, speed: 38, pierce: 0, splash: 0 },
    PUMPKIN_MORTAR: { damage: 90, speed: 14, pierce: 0, splash: 5.5 }
  };

  const weapon = overrides.weapon ?? 'PITCHFORK';
  const defaults = weaponDefaults[weapon] ?? weaponDefaults.PITCHFORK;

  return {
    id: overrides.id ?? generateId('projectile'),
    weapon,
    pos: overrides.pos ?? overrides.position ?? createPosition(0, 1, 10),
    dir: overrides.dir ?? overrides.direction ?? createPosition(0, 0, 1).normalize(),
    damage: overrides.damage ?? defaults.damage,
    speed: overrides.speed ?? defaults.speed,
    pierce: overrides.pierce ?? defaults.pierce,
    pierceCount: overrides.pierceCount ?? 0,
    splash: overrides.splash ?? defaults.splash,
    mesh: overrides.mesh ?? createMockMesh(),
    ...overrides
  };
}

// ============================================
// TURRET FACTORIES
// ============================================

/**
 * Create a mock turret
 */
export function createMockTurret(overrides = {}) {
  const typeDefaults = {
    BASIC: { damage: 15, fireRate: 1.5, range: 8, health: 80 },
    SLOW: { damage: 5, fireRate: 2.0, range: 6, health: 60 },
    EXPLOSIVE: { damage: 40, fireRate: 0.5, range: 10, health: 100 }
  };

  const type = overrides.type ?? 'BASIC';
  const defaults = typeDefaults[type] ?? typeDefaults.BASIC;

  return {
    id: overrides.id ?? generateId('turret'),
    type,
    pos: overrides.pos ?? overrides.position ?? createPosition(10, 0, 10),
    damage: overrides.damage ?? defaults.damage,
    fireRate: overrides.fireRate ?? defaults.fireRate,
    range: overrides.range ?? defaults.range,
    health: overrides.health ?? defaults.health,
    maxHealth: overrides.maxHealth ?? defaults.health,
    fireTimer: overrides.fireTimer ?? 0,
    mesh: overrides.mesh ?? createMockMesh(),
    ...overrides
  };
}

// ============================================
// MESH FACTORIES
// ============================================

/**
 * Create a mock rotation object with clone method
 */
function createMockRotation(overrides = {}) {
  const rot = {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    z: overrides.z ?? 0
  };
  rot.clone = function() { return createMockRotation({ x: this.x, y: this.y, z: this.z }); };
  return rot;
}

/**
 * Create a mock scale object with clone and setScalar methods
 */
function createMockScale(overrides = {}) {
  const scale = {
    x: overrides.x ?? 1,
    y: overrides.y ?? 1,
    z: overrides.z ?? 1
  };
  scale.setScalar = function(s) { this.x = this.y = this.z = s; };
  scale.clone = function() { return createMockScale({ x: this.x, y: this.y, z: this.z }); };
  return scale;
}

/**
 * Create a mock color object with clone, copy, lerp methods
 */
function createMockColor(hex = 0xffffff) {
  const color = {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255
  };
  color.clone = function() { return createMockColor(); };
  color.copy = function(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; };
  color.lerp = function(c, t) { return this; };
  return color;
}

/**
 * Create a mock Three.js mesh
 */
export function createMockMesh(overrides = {}) {
  const position = overrides.position ?? createPosition();
  const rotation = overrides.rotation ? createMockRotation(overrides.rotation) : createMockRotation();
  const scale = overrides.scale ? createMockScale(overrides.scale) : createMockScale();

  return {
    position,
    rotation,
    scale,
    material: {
      color: createMockColor(),
      opacity: 1,
      transparent: false,
      clone: function() {
        return {
          color: createMockColor(),
          opacity: this.opacity,
          transparent: this.transparent,
          clone: this.clone
        };
      },
      ...overrides.material
    },
    parent: overrides.parent ?? null,
    visible: overrides.visible ?? true,
    userData: overrides.userData ?? {},
    ...overrides
  };
}

// ============================================
// GAME STATE FACTORIES
// ============================================

/**
 * Create a mock game state
 */
export function createMockGameState(overrides = {}) {
  return {
    started: overrides.started ?? false,
    gameOver: overrides.gameOver ?? false,
    paused: overrides.paused ?? false,
    endlessMode: overrides.endlessMode ?? false,

    player: {
      pos: createPosition(0, 0, 10),
      rot: 0,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      isInside: false,
      invulnTimer: 0,
      ...overrides.player
    },

    barn: {
      health: 175,
      maxHealth: 175,
      pos: createPosition(0, 0, 0),
      ...overrides.barn
    },

    house: {
      pos: createPosition(0, 0, 0),
      doors: [],
      windows: [],
      ...overrides.house
    },

    turkeys: overrides.turkeys ?? [],
    projectiles: overrides.projectiles ?? [],
    turretProjectiles: overrides.turretProjectiles ?? [],
    turrets: overrides.turrets ?? [],

    wave: overrides.wave ?? 0,
    toSpawn: overrides.toSpawn ?? 0,
    totalSpawnedThisWave: overrides.totalSpawnedThisWave ?? 0,
    expectedThisWave: overrides.expectedThisWave ?? 0,
    spawnTimer: overrides.spawnTimer ?? 0,
    currency: overrides.currency ?? 100,
    score: overrides.score ?? 0,

    currentWeapon: overrides.currentWeapon ?? 'PITCHFORK',
    shootTimer: overrides.shootTimer ?? 0,

    input: {
      w: false, a: false, s: false, d: false,
      firing: false,
      panUp: false, panDown: false, panLeft: false, panRight: false,
      ...overrides.input
    },

    aim: overrides.aim ?? createPosition(),
    shakeIntensity: overrides.shakeIntensity ?? 0,
    shakeDuration: overrides.shakeDuration ?? 0,

    waveComplete: overrides.waveComplete ?? false,
    waveComp: overrides.waveComp ?? {},
    waveStartHealth: overrides.waveStartHealth ?? 175,
    globalFreeze: overrides.globalFreeze ?? 0,
    rageActive: overrides.rageActive ?? 0,
    pendingAirstrike: overrides.pendingAirstrike ?? null,

    upgrades: {
      houseArmor: 0,
      weaponDamage: 0,
      fireRate: 0,
      playerHealth: 0,
      houseLevel: 0,
      ...overrides.upgrades
    },

    placingTurret: overrides.placingTurret ?? null,

    ...overrides
  };
}

/**
 * Create a full upgraded game state
 */
export function createFullUpgradeState() {
  return createMockGameState({
    upgrades: {
      houseArmor: 5,
      weaponDamage: 5,
      fireRate: 5,
      playerHealth: 5,
      houseLevel: 4
    },
    currency: 10000,
    wave: 20
  });
}

// ============================================
// DAMAGEABLE FACTORIES
// ============================================

/**
 * Create a mock damageable piece for DamageManager tests
 */
export function createMockDamageable(overrides = {}) {
  const maxHealth = overrides.maxHealth ?? 100;
  const health = overrides.health ?? maxHealth;

  return {
    piece: overrides.piece ?? createMockPiece(),
    maxHealth,
    health,
    damageState: overrides.damageState ?? 'pristine',
    damageHistory: overrides.damageHistory ?? [],

    takeDamage(amount, type, source) {
      this.health = Math.max(0, this.health - amount);
      this.updateDamageState();
      this.damageHistory.push({ amount, type, source, timestamp: Date.now() });
      return { damageDealt: amount, newHealth: this.health, newState: this.damageState };
    },

    heal(amount) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      this.updateDamageState();
      return this.health;
    },

    updateDamageState() {
      const percent = this.health / this.maxHealth;
      if (percent <= 0) this.damageState = 'destroyed';
      else if (percent <= 0.25) this.damageState = 'critical';
      else if (percent <= 0.6) this.damageState = 'damaged';
      else this.damageState = 'pristine';
    },

    getHealthPercent() {
      return this.health / this.maxHealth;
    },

    getStabilityModifier() {
      const modifiers = { pristine: 1.0, damaged: 0.85, critical: 0.6, destroyed: 0 };
      return modifiers[this.damageState] ?? 1.0;
    },

    ...overrides
  };
}

// ============================================
// VALIDATOR/OPTIMIZER FACTORIES
// ============================================

/**
 * Create a mock BuildingValidator for tests
 */
export function createMockValidator(overrides = {}) {
  const pieces = new Map();

  return {
    mode: overrides.mode ?? 'simple',
    minDistanceFromBarn: overrides.minDistanceFromBarn ?? 5,
    maxDistanceFromBarn: overrides.maxDistanceFromBarn ?? 35,
    barnPosition: overrides.barnPosition ?? createPosition(0, 0, 0),

    graph: {
      pieces,
      getAllPieces: () => Array.from(pieces.values()),
      getSupports: () => [],
      ...overrides.graph
    },

    addPiece(piece) {
      pieces.set(piece.id, piece);
      return piece;
    },

    removePiece(piece) {
      pieces.delete(piece.id);
      return [];
    },

    validatePlacement(piece) {
      return { valid: true, stability: 1.0, reason: null };
    },

    getStability() {
      return 1.0;
    },

    calculateStability: overrides.calculateStability,

    ...overrides
  };
}

// ============================================
// SPATIAL GRID FACTORIES
// ============================================

/**
 * Create a populated spatial grid for testing
 */
export function createPopulatedGrid(objectCount = 10, cellSize = 5) {
  // Import at runtime to avoid circular dependencies
  const { SpatialHashGrid2D } = require('../../engine/SpatialHashGrid2D.js');

  const grid = new SpatialHashGrid2D(cellSize);
  const objects = [];

  for (let i = 0; i < objectCount; i++) {
    const obj = {
      id: generateId('gridObj'),
      pos: createRandomPosition({ min: -25, max: 25 })
    };
    objects.push(obj);
    grid.insert(obj, obj.pos);
  }

  return { grid, objects };
}

export default {
  generateId,
  resetIdCounter,
  createPosition,
  createRandomPosition,
  createMockPiece,
  createPieceGrid,
  createMockTurkey,
  createTurkeyWave,
  createMockProjectile,
  createMockTurret,
  createMockMesh,
  createMockGameState,
  createFullUpgradeState,
  createMockDamageable,
  createMockValidator,
  createPopulatedGrid
};
