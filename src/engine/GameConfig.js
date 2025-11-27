/**
 * Game Configuration - All game constants and definitions
 */

export const WeaponTypes = {
  PITCHFORK: {
    name: 'Pitchfork Launcher', icon: '🔱', damage: 28, fireRate: 2.2, speed: 32,
    pierce: 2, splash: 0, slow: 0, color: 0x666666, sound: 'pitchfork',
    description: 'Fast firing, pierces enemies'
  },
  CORN_CANNON: {
    name: 'Corn Cannon', icon: '🌽', damage: 45, fireRate: 0.9, speed: 26,
    pierce: 0, splash: 3.2, slow: 0, color: 0xffd700, sound: 'cannon',
    description: 'Explosive splash damage'
  },
  EGG_BLASTER: {
    name: 'Egg Blaster', icon: '🥚', damage: 12, fireRate: 5.5, speed: 38,
    pierce: 0, splash: 0, slow: 0.45, color: 0xfffef0, sound: 'egg',
    description: 'Rapid fire, slows enemies'
  },
  PUMPKIN_MORTAR: {
    name: 'Pumpkin Mortar', icon: '🎃', damage: 90, fireRate: 0.35, speed: 14,
    pierce: 0, splash: 5.5, slow: 0, color: 0xff6600, arc: true, sound: 'mortar',
    description: 'High damage artillery'
  }
};

export const TurkeyTypes = {
  STANDARD: { name: 'Turkey', hp: 35, speed: 1.0, damage: 8, value: 10, scale: 1.0, body: 0x8b4513, head: 0xdc143c },
  RUNNER: { name: 'Runner', hp: 22, speed: 1.8, damage: 6, value: 12, scale: 0.8, body: 0x654321, head: 0xff4500 },
  TANK: { name: 'Tank', hp: 120, speed: 0.6, damage: 20, value: 30, scale: 1.4, body: 0x4a3728, head: 0x8b0000 },
  HEALER: { name: 'Healer', hp: 40, speed: 0.9, damage: 5, value: 20, scale: 0.9, body: 0x2e8b57, head: 0x90ee90, heals: true },
  SPLITTER: { name: 'Splitter', hp: 60, speed: 1.0, damage: 12, value: 25, scale: 1.1, body: 0x4b0082, head: 0x9400d3, splits: true },
  BOSS: { name: 'Boss', hp: 800, speed: 0.5, damage: 40, value: 200, scale: 2.2, body: 0x2d1f14, head: 0x660000, phases: 3 }
};

export const HouseUpgrades = {
  BASIC: {
    level: 0, name: 'Starter Cabin', cost: 0,
    width: 5.5, depth: 7, height: 4, roofHeight: 2.8,
    doors: 1, windows: 2, doorHealth: 50, windowHealth: 30,
    description: 'A small wooden cabin'
  },
  COTTAGE: {
    level: 1, name: 'Cottage', cost: 200,
    width: 7, depth: 9, height: 4.5, roofHeight: 3.2,
    doors: 1, windows: 4, doorHealth: 75, windowHealth: 45,
    description: 'A cozy cottage with more windows'
  },
  FARMHOUSE: {
    level: 2, name: 'Farmhouse', cost: 400,
    width: 9, depth: 11, height: 5, roofHeight: 3.5,
    doors: 2, windows: 6, doorHealth: 100, windowHealth: 60,
    description: 'A sturdy farmhouse with two doors'
  },
  MANOR: {
    level: 3, name: 'Manor', cost: 700,
    width: 12, depth: 14, height: 6, roofHeight: 4,
    doors: 2, windows: 8, doorHealth: 150, windowHealth: 80,
    description: 'A fortified manor house'
  },
  FORTRESS: {
    level: 4, name: 'Fortress', cost: 1000,
    width: 15, depth: 17, height: 7, roofHeight: 4.5,
    doors: 3, windows: 10, doorHealth: 200, windowHealth: 100,
    description: 'An impenetrable fortress'
  }
};

export const TurretTypes = {
  BASIC: {
    name: 'Scarecrow Turret', icon: '🧑‍🌾', cost: 100,
    damage: 15, fireRate: 1.5, range: 8, color: 0xdaa520, health: 80,
    description: 'Basic auto-targeting turret'
  },
  SLOW: {
    name: 'Frost Sprinkler', icon: '❄️', cost: 150,
    damage: 5, fireRate: 2.0, range: 6, slow: 0.5, slowDuration: 2, color: 0x88ccff, health: 60,
    description: 'Slows enemies in range'
  },
  EXPLOSIVE: {
    name: 'Corn Silo', icon: '🌾', cost: 200,
    damage: 40, fireRate: 0.5, range: 10, splash: 3, color: 0xffd700, health: 100,
    description: 'Explosive area damage'
  }
};

export const AbilityTypes = {
  AIRSTRIKE: {
    name: 'Turkey Bomb', icon: '💣', cooldown: 45, duration: 0,
    description: 'Call in an explosive airstrike at cursor position',
    damage: 150, radius: 8
  },
  FREEZE: {
    name: 'Frost Nova', icon: '❄️', cooldown: 30, duration: 5,
    description: 'Freeze all enemies for 5 seconds',
    slowAmount: 0.9
  },
  RAGE: {
    name: 'Harvest Rage', icon: '🔥', cooldown: 40, duration: 10,
    description: 'Double damage and fire rate for 10 seconds',
    damageMultiplier: 2, fireRateMultiplier: 2
  },
  REPAIR: {
    name: 'Emergency Repair', icon: '🔧', cooldown: 60, duration: 0,
    description: 'Repair all doors and windows to 50% health',
    healPercent: 0.5
  }
};

export const Achievements = {
  FIRST_BLOOD: { name: 'First Blood', icon: '🩸', description: 'Kill your first turkey', check: (s) => s.totalKills >= 1 },
  TURKEY_HUNTER: { name: 'Turkey Hunter', icon: '🎯', description: 'Kill 100 turkeys', check: (s) => s.totalKills >= 100 },
  TURKEY_SLAYER: { name: 'Turkey Slayer', icon: '⚔️', description: 'Kill 500 turkeys', check: (s) => s.totalKills >= 500 },
  WAVE_5: { name: 'Getting Started', icon: '🌊', description: 'Reach wave 5', check: (s) => s.highestWave >= 5 },
  WAVE_10: { name: 'Veteran Defender', icon: '🛡️', description: 'Reach wave 10', check: (s) => s.highestWave >= 10 },
  WAVE_20: { name: 'Master Defender', icon: '👑', description: 'Reach wave 20', check: (s) => s.highestWave >= 20 },
  BOSS_KILLER: { name: 'Boss Slayer', icon: '💀', description: 'Kill a boss turkey', check: (s) => s.bossKills >= 1 },
  BOSS_MASTER: { name: 'Boss Master', icon: '🏆', description: 'Kill 5 boss turkeys', check: (s) => s.bossKills >= 5 },
  RICH_FARMER: { name: 'Rich Farmer', icon: '💰', description: 'Have 500 corn at once', check: (s) => s.maxCurrency >= 500 },
  TURRET_MASTER: { name: 'Turret Master', icon: '🗼', description: 'Place 10 turrets', check: (s) => s.turretsPlaced >= 10 },
  ABILITY_USER: { name: 'Ability User', icon: '✨', description: 'Use 20 abilities', check: (s) => s.abilitiesUsed >= 20 },
  SURVIVOR: { name: 'Survivor', icon: '❤️', description: 'Win with less than 10% health', check: (s) => s.clutchWins >= 1 },
  SPEEDRUNNER: { name: 'Speedrunner', icon: '⚡', description: 'Complete wave 10 in under 5 minutes', check: (s) => s.fastWave10 },
  ENDLESS_10: { name: 'Endless Warrior', icon: '♾️', description: 'Reach wave 10 in endless mode', check: (s) => s.endlessHighWave >= 10 },
  PERFECTIONIST: { name: 'Perfectionist', icon: '💯', description: 'Complete a wave without taking damage', check: (s) => s.perfectWaves >= 1 }
};

export default {
  WeaponTypes,
  TurkeyTypes,
  HouseUpgrades,
  TurretTypes,
  AbilityTypes,
  Achievements
};
