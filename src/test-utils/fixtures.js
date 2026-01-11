/**
 * Test Fixtures
 *
 * Reusable test data and scenarios
 */

// ============================================
// WAVE COMPOSITIONS
// ============================================

/**
 * Standard wave compositions by wave number
 */
export const waveCompositions = {
  wave1: { STANDARD: 3 },
  wave2: { STANDARD: 4, RUNNER: 1 },
  wave3: { STANDARD: 4, RUNNER: 2 },
  wave5: { STANDARD: 5, RUNNER: 3, TANK: 1 },
  wave7: { STANDARD: 6, RUNNER: 4, HEALER: 1 },
  wave10: { STANDARD: 8, RUNNER: 5, TANK: 2, HEALER: 2, BOSS: 1 },
  wave15: { STANDARD: 10, RUNNER: 6, TANK: 3, HEALER: 3, SPLITTER: 2 },
  wave20: { STANDARD: 12, RUNNER: 8, TANK: 4, HEALER: 4, SPLITTER: 3, BOSS: 1 }
};

/**
 * Empty wave (for testing wave completion)
 */
export const emptyWave = {};

/**
 * Boss-only wave
 */
export const bossWave = { BOSS: 1 };

/**
 * High difficulty wave for stress testing
 */
export const stressTestWave = {
  STANDARD: 50,
  RUNNER: 30,
  TANK: 20,
  HEALER: 10,
  SPLITTER: 10,
  BOSS: 5
};

// ============================================
// WEAPON STATS
// ============================================

export const weaponStats = {
  PITCHFORK: {
    name: 'Pitchfork Launcher',
    damage: 28,
    fireRate: 2.2,
    speed: 32,
    pierce: 2,
    splash: 0,
    slow: 0
  },
  CORN_CANNON: {
    name: 'Corn Cannon',
    damage: 45,
    fireRate: 0.9,
    speed: 26,
    pierce: 0,
    splash: 3.2,
    slow: 0
  },
  EGG_BLASTER: {
    name: 'Egg Blaster',
    damage: 12,
    fireRate: 5.5,
    speed: 38,
    pierce: 0,
    splash: 0,
    slow: 0.45
  },
  PUMPKIN_MORTAR: {
    name: 'Pumpkin Mortar',
    damage: 90,
    fireRate: 0.35,
    speed: 14,
    pierce: 0,
    splash: 5.5,
    slow: 0
  }
};

// ============================================
// ZOMBIE STATS
// ============================================

export const zombieStats = {
  STANDARD: { hp: 35, speed: 1.0, damage: 8, value: 10 },
  RUNNER: { hp: 22, speed: 1.8, damage: 6, value: 12 },
  TANK: { hp: 120, speed: 0.6, damage: 20, value: 30 },
  HEALER: { hp: 40, speed: 0.9, damage: 5, value: 20, heals: true },
  SPLITTER: { hp: 60, speed: 1.0, damage: 12, value: 25, splits: true },
  BOSS: { hp: 800, speed: 0.5, damage: 40, value: 200, phases: 3 }
};

// ============================================
// TURRET STATS
// ============================================

export const turretStats = {
  BASIC: {
    name: 'Scarecrow Turret',
    cost: 100,
    damage: 15,
    fireRate: 1.5,
    range: 8,
    health: 80
  },
  SLOW: {
    name: 'Frost Sprinkler',
    cost: 150,
    damage: 5,
    fireRate: 2.0,
    range: 6,
    slow: 0.5,
    slowDuration: 2,
    health: 60
  },
  EXPLOSIVE: {
    name: 'Corn Silo',
    cost: 200,
    damage: 40,
    fireRate: 0.5,
    range: 10,
    splash: 3,
    health: 100
  }
};

// ============================================
// HOUSE UPGRADE STATS
// ============================================

export const houseStats = {
  BASIC: {
    level: 0,
    name: 'Starter Cabin',
    cost: 0,
    width: 5.5,
    depth: 7,
    height: 4,
    doors: 1,
    windows: 2,
    doorHealth: 50,
    windowHealth: 30
  },
  COTTAGE: {
    level: 1,
    name: 'Cottage',
    cost: 200,
    width: 7,
    depth: 9,
    height: 4.5,
    doors: 1,
    windows: 4,
    doorHealth: 75,
    windowHealth: 45
  },
  FARMHOUSE: {
    level: 2,
    name: 'Farmhouse',
    cost: 400,
    width: 9,
    depth: 11,
    height: 5,
    doors: 2,
    windows: 6,
    doorHealth: 100,
    windowHealth: 60
  },
  MANOR: {
    level: 3,
    name: 'Manor',
    cost: 700,
    width: 12,
    depth: 14,
    height: 6,
    doors: 2,
    windows: 8,
    doorHealth: 150,
    windowHealth: 80
  },
  FORTRESS: {
    level: 4,
    name: 'Fortress',
    cost: 1000,
    width: 15,
    depth: 17,
    height: 7,
    doors: 3,
    windows: 10,
    doorHealth: 200,
    windowHealth: 100
  }
};

// ============================================
// ABILITY STATS
// ============================================

export const abilityStats = {
  AIRSTRIKE: {
    name: 'Artillery Strike',
    cooldown: 45,
    duration: 0,
    damage: 150,
    radius: 8
  },
  FREEZE: {
    name: 'Frost Nova',
    cooldown: 30,
    duration: 5,
    slowAmount: 0.9
  },
  RAGE: {
    name: 'Survival Fury',
    cooldown: 40,
    duration: 10,
    damageMultiplier: 2,
    fireRateMultiplier: 2
  },
  REPAIR: {
    name: 'Emergency Repair',
    cooldown: 60,
    duration: 0,
    healPercent: 0.5
  }
};

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

export const achievementDefinitions = {
  FIRST_BLOOD: { name: 'First Blood', threshold: { totalKills: 1 } },
  ZOMBIE_HUNTER: { name: 'Zombie Hunter', threshold: { totalKills: 100 } },
  ZOMBIE_SLAYER: { name: 'Zombie Slayer', threshold: { totalKills: 500 } },
  WAVE_5: { name: 'Getting Started', threshold: { highestWave: 5 } },
  WAVE_10: { name: 'Veteran Defender', threshold: { highestWave: 10 } },
  WAVE_20: { name: 'Master Defender', threshold: { highestWave: 20 } },
  BOSS_KILLER: { name: 'Boss Slayer', threshold: { bossKills: 1 } },
  BOSS_MASTER: { name: 'Boss Master', threshold: { bossKills: 5 } },
  RICH_FARMER: { name: 'Rich Farmer', threshold: { maxCurrency: 500 } },
  TURRET_MASTER: { name: 'Turret Master', threshold: { turretsPlaced: 10 } },
  ABILITY_USER: { name: 'Ability User', threshold: { abilitiesUsed: 20 } }
};

// ============================================
// DAMAGE STATE THRESHOLDS
// ============================================

export const damageStateThresholds = {
  PRISTINE: { min: 0.61, max: 1.0, modifier: 1.0 },
  DAMAGED: { min: 0.26, max: 0.60, modifier: 0.85 },
  CRITICAL: { min: 0.01, max: 0.25, modifier: 0.6 },
  DESTROYED: { min: 0, max: 0, modifier: 0 }
};

// ============================================
// SPATIAL GRID TEST SCENARIOS
// ============================================

export const spatialGridScenarios = {
  emptyGrid: {
    objects: [],
    cellSize: 5
  },
  singleObject: {
    objects: [{ id: '1', pos: { x: 0, z: 0 } }],
    cellSize: 5
  },
  clustered: {
    objects: [
      { id: '1', pos: { x: 0, z: 0 } },
      { id: '2', pos: { x: 1, z: 1 } },
      { id: '3', pos: { x: 2, z: 2 } },
      { id: '4', pos: { x: 3, z: 3 } },
      { id: '5', pos: { x: 4, z: 4 } }
    ],
    cellSize: 5
  },
  distributed: {
    objects: [
      { id: '1', pos: { x: 0, z: 0 } },
      { id: '2', pos: { x: 10, z: 0 } },
      { id: '3', pos: { x: 0, z: 10 } },
      { id: '4', pos: { x: 10, z: 10 } },
      { id: '5', pos: { x: -10, z: -10 } }
    ],
    cellSize: 5
  },
  negativeCoords: {
    objects: [
      { id: '1', pos: { x: -5, z: -5 } },
      { id: '2', pos: { x: -10, z: -10 } },
      { id: '3', pos: { x: -15, z: -15 } }
    ],
    cellSize: 5
  },
  boundary: {
    objects: [
      { id: '1', pos: { x: 4.99, z: 0 } },  // Just inside cell 0
      { id: '2', pos: { x: 5.0, z: 0 } },   // Just inside cell 1
      { id: '3', pos: { x: 5.01, z: 0 } }   // Just inside cell 1
    ],
    cellSize: 5
  }
};

// ============================================
// VALIDATION TEST SCENARIOS
// ============================================

export const validationScenarios = {
  validPlacements: [
    { x: 10, y: 0, z: 0 },   // Min distance
    { x: 20, y: 0, z: 0 },   // Mid range
    { x: 34, y: 0, z: 0 },   // Near max
    { x: 0, y: 0, z: 15 },   // Different direction
    { x: -15, y: 0, z: -15 } // Negative coords
  ],
  invalidPlacements: {
    tooClose: { x: 3, y: 0, z: 0 },      // < 5 units
    tooFar: { x: 40, y: 0, z: 0 },       // > 35 units
    atBarn: { x: 0, y: 0, z: 0 },        // At barn
    nearBarn: { x: 2, y: 0, z: 2 }       // Too close
  }
};

// ============================================
// COLLISION TEST SCENARIOS
// ============================================

export const collisionScenarios = {
  directHit: {
    projectilePos: { x: 10, y: 1, z: 9 },
    zombiePos: { x: 10, y: 0, z: 10 },
    expected: true
  },
  nearMiss: {
    projectilePos: { x: 10, y: 1, z: 5 },
    zombiePos: { x: 10, y: 0, z: 10 },
    expected: false
  },
  splashHit: {
    explosionCenter: { x: 10, y: 0, z: 10 },
    splashRadius: 3,
    targets: [
      { pos: { x: 10, y: 0, z: 10 }, expected: true },  // Center
      { pos: { x: 12, y: 0, z: 10 }, expected: true },  // Within radius
      { pos: { x: 15, y: 0, z: 10 }, expected: false }  // Outside radius
    ]
  }
};

// ============================================
// PERFORMANCE TEST THRESHOLDS
// ============================================

export const performanceThresholds = {
  spatialQuery: {
    maxTimeMs: 5,
    objectCount: 1000
  },
  collisionCheck: {
    maxTimeMs: 16.67, // One frame at 60fps
    entityCount: 500
  },
  stabilityCalculation: {
    maxTimeMs: 2,
    pieceCount: 100
  }
};

// ============================================
// GAME BALANCE CONSTANTS
// ============================================

export const balanceConstants = {
  startingCurrency: 100,
  startingHealth: 100,
  barnMaxHealth: 175,
  maxWave: 20, // Victory condition
  killCurrencyBase: 10,
  waveBonus: 50,
  playerMoveSpeed: 6,
  playerBoundary: 45
};

export default {
  waveCompositions,
  emptyWave,
  bossWave,
  stressTestWave,
  weaponStats,
  zombieStats,
  turretStats,
  houseStats,
  abilityStats,
  achievementDefinitions,
  damageStateThresholds,
  spatialGridScenarios,
  validationScenarios,
  collisionScenarios,
  performanceThresholds,
  balanceConstants
};
