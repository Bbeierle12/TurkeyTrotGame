/**
 * GameConfig Unit Tests
 *
 * Tests all game configuration constants for completeness and validity
 */

import { describe, it, expect } from 'vitest';
import {
  WeaponTypes,
  ZombieTypes,
  HouseUpgrades,
  TurretTypes,
  AbilityTypes,
  Achievements
} from '../../GameConfig.js';

describe('GameConfig', () => {
  // ============================================
  // WEAPON TYPES
  // ============================================
  describe('WeaponTypes', () => {
    const weaponKeys = ['PITCHFORK', 'CORN_CANNON', 'EGG_BLASTER', 'HAY_BALE_CATAPULT'];

    it('should have exactly 4 weapon types', () => {
      expect(Object.keys(WeaponTypes)).toHaveLength(4);
    });

    it('should have all expected weapon types', () => {
      weaponKeys.forEach((key) => {
        expect(WeaponTypes).toHaveProperty(key);
      });
    });

    describe.each(weaponKeys)('%s', (weaponKey) => {
      const weapon = WeaponTypes[weaponKey];

      it('should have a name', () => {
        expect(weapon.name).toBeDefined();
        expect(typeof weapon.name).toBe('string');
        expect(weapon.name.length).toBeGreaterThan(0);
      });

      it('should have an icon', () => {
        expect(weapon.icon).toBeDefined();
        expect(typeof weapon.icon).toBe('string');
      });

      it('should have positive damage', () => {
        expect(weapon.damage).toBePositive();
      });

      it('should have positive fire rate', () => {
        expect(weapon.fireRate).toBePositive();
      });

      it('should have positive speed', () => {
        expect(weapon.speed).toBePositive();
      });

      it('should have non-negative pierce value', () => {
        expect(weapon.pierce).toBeNonNegative();
        expect(weapon.pierce).toBeInteger();
      });

      it('should have non-negative splash value', () => {
        expect(weapon.splash).toBeNonNegative();
      });

      it('should have a color (hex number)', () => {
        expect(typeof weapon.color).toBe('number');
        expect(weapon.color).toBeGreaterThanOrEqual(0);
        expect(weapon.color).toBeLessThanOrEqual(0xffffff);
      });

      it('should have a sound identifier', () => {
        expect(weapon.sound).toBeDefined();
        expect(typeof weapon.sound).toBe('string');
      });

      it('should have a description', () => {
        expect(weapon.description).toBeDefined();
        expect(typeof weapon.description).toBe('string');
      });
    });

    it('should have unique damage values across weapons', () => {
      const damages = weaponKeys.map((key) => WeaponTypes[key].damage);
      const uniqueDamages = new Set(damages);
      expect(uniqueDamages.size).toBe(damages.length);
    });

    it('PITCHFORK should have pierce ability', () => {
      expect(WeaponTypes.PITCHFORK.pierce).toBeGreaterThan(0);
    });

    it('CORN_CANNON should have splash damage', () => {
      expect(WeaponTypes.CORN_CANNON.splash).toBeGreaterThan(0);
    });

    it('EGG_BLASTER should have slow effect', () => {
      expect(WeaponTypes.EGG_BLASTER.slow).toBeGreaterThan(0);
    });

    it('HAY_BALE_CATAPULT should have arc property', () => {
      expect(WeaponTypes.HAY_BALE_CATAPULT.arc).toBe(true);
    });

    it('HAY_BALE_CATAPULT should have highest damage', () => {
      const maxDamage = Math.max(...weaponKeys.map((k) => WeaponTypes[k].damage));
      expect(WeaponTypes.HAY_BALE_CATAPULT.damage).toBe(maxDamage);
    });

    it('EGG_BLASTER should have highest fire rate', () => {
      const maxFireRate = Math.max(...weaponKeys.map((k) => WeaponTypes[k].fireRate));
      expect(WeaponTypes.EGG_BLASTER.fireRate).toBe(maxFireRate);
    });
  });

  // ============================================
  // ZOMBIE TYPES
  // ============================================
  describe('ZombieTypes', () => {
    const zombieKeys = ['STANDARD', 'RUNNER', 'TANK', 'HEALER', 'SPLITTER', 'BOSS'];

    it('should have exactly 6 zombie types', () => {
      expect(Object.keys(ZombieTypes)).toHaveLength(6);
    });

    it('should have all expected zombie types', () => {
      zombieKeys.forEach((key) => {
        expect(ZombieTypes).toHaveProperty(key);
      });
    });

    describe.each(zombieKeys)('%s', (zombieKey) => {
      const zombie = ZombieTypes[zombieKey];

      it('should have a name', () => {
        expect(zombie.name).toBeDefined();
        expect(typeof zombie.name).toBe('string');
      });

      it('should have positive HP', () => {
        expect(zombie.hp).toBePositive();
        expect(zombie.hp).toBeInteger();
      });

      it('should have speed between 0.1 and 5.0', () => {
        expect(zombie.speed).toBeInRange(0.1, 5.0);
      });

      it('should have positive damage', () => {
        expect(zombie.damage).toBePositive();
      });

      it('should have positive value (score)', () => {
        expect(zombie.value).toBePositive();
        expect(zombie.value).toBeInteger();
      });

      it('should have positive scale', () => {
        expect(zombie.scale).toBePositive();
      });

      it('should have body color', () => {
        expect(typeof zombie.body).toBe('number');
      });

      it('should have head color', () => {
        expect(typeof zombie.head).toBe('number');
      });
    });

    it('RUNNER should be faster than STANDARD', () => {
      expect(ZombieTypes.RUNNER.speed).toBeGreaterThan(ZombieTypes.STANDARD.speed);
    });

    it('TANK should have more HP than STANDARD', () => {
      expect(ZombieTypes.TANK.hp).toBeGreaterThan(ZombieTypes.STANDARD.hp);
    });

    it('TANK should be slower than STANDARD', () => {
      expect(ZombieTypes.TANK.speed).toBeLessThan(ZombieTypes.STANDARD.speed);
    });

    it('HEALER should have heals property', () => {
      expect(ZombieTypes.HEALER.heals).toBe(true);
    });

    it('SPLITTER should have splits property', () => {
      expect(ZombieTypes.SPLITTER.splits).toBe(true);
    });

    it('BOSS should have phases property', () => {
      expect(ZombieTypes.BOSS.phases).toBeDefined();
      expect(ZombieTypes.BOSS.phases).toBeGreaterThan(1);
    });

    it('BOSS should have highest HP', () => {
      const maxHp = Math.max(...zombieKeys.map((k) => ZombieTypes[k].hp));
      expect(ZombieTypes.BOSS.hp).toBe(maxHp);
    });

    it('BOSS should have highest value', () => {
      const maxValue = Math.max(...zombieKeys.map((k) => ZombieTypes[k].value));
      expect(ZombieTypes.BOSS.value).toBe(maxValue);
    });

    it('value should generally correlate with difficulty (HP)', () => {
      // Higher HP zombies should be worth more
      expect(ZombieTypes.TANK.value).toBeGreaterThan(ZombieTypes.STANDARD.value);
      expect(ZombieTypes.BOSS.value).toBeGreaterThan(ZombieTypes.TANK.value);
    });
  });

  // ============================================
  // HOUSE UPGRADES
  // ============================================
  describe('HouseUpgrades', () => {
    const houseKeys = ['BASIC', 'COTTAGE', 'FARMHOUSE', 'MANOR', 'FORTRESS'];

    it('should have exactly 5 house upgrade levels', () => {
      expect(Object.keys(HouseUpgrades)).toHaveLength(5);
    });

    it('should have all expected house types', () => {
      houseKeys.forEach((key) => {
        expect(HouseUpgrades).toHaveProperty(key);
      });
    });

    describe.each(houseKeys)('%s', (houseKey) => {
      const house = HouseUpgrades[houseKey];

      it('should have a level number', () => {
        expect(typeof house.level).toBe('number');
        expect(house.level).toBeNonNegative();
        expect(house.level).toBeInteger();
      });

      it('should have a name', () => {
        expect(house.name).toBeDefined();
        expect(typeof house.name).toBe('string');
      });

      it('should have a non-negative cost', () => {
        expect(house.cost).toBeNonNegative();
        expect(house.cost).toBeInteger();
      });

      it('should have positive dimensions', () => {
        expect(house.width).toBePositive();
        expect(house.depth).toBePositive();
        expect(house.height).toBePositive();
        expect(house.roofHeight).toBePositive();
      });

      it('should have valid door count', () => {
        expect(house.doors).toBePositive();
        expect(house.doors).toBeInteger();
      });

      it('should have valid window count', () => {
        expect(house.windows).toBePositive();
        expect(house.windows).toBeInteger();
      });

      it('should have positive door health', () => {
        expect(house.doorHealth).toBePositive();
      });

      it('should have positive window health', () => {
        expect(house.windowHealth).toBePositive();
      });

      it('should have a description', () => {
        expect(house.description).toBeDefined();
        expect(typeof house.description).toBe('string');
      });
    });

    it('BASIC should have level 0 and cost 0', () => {
      expect(HouseUpgrades.BASIC.level).toBe(0);
      expect(HouseUpgrades.BASIC.cost).toBe(0);
    });

    it('levels should be sequential from 0 to 4', () => {
      houseKeys.forEach((key, index) => {
        expect(HouseUpgrades[key].level).toBe(index);
      });
    });

    it('cost should increase with level', () => {
      for (let i = 1; i < houseKeys.length; i++) {
        const prev = HouseUpgrades[houseKeys[i - 1]];
        const curr = HouseUpgrades[houseKeys[i]];
        expect(curr.cost).toBeGreaterThan(prev.cost);
      }
    });

    it('dimensions should increase with level', () => {
      for (let i = 1; i < houseKeys.length; i++) {
        const prev = HouseUpgrades[houseKeys[i - 1]];
        const curr = HouseUpgrades[houseKeys[i]];
        expect(curr.width).toBeGreaterThan(prev.width);
        expect(curr.depth).toBeGreaterThan(prev.depth);
      }
    });

    it('door health should increase with level', () => {
      for (let i = 1; i < houseKeys.length; i++) {
        const prev = HouseUpgrades[houseKeys[i - 1]];
        const curr = HouseUpgrades[houseKeys[i]];
        expect(curr.doorHealth).toBeGreaterThan(prev.doorHealth);
      }
    });
  });

  // ============================================
  // TURRET TYPES
  // ============================================
  describe('TurretTypes', () => {
    const turretKeys = ['BASIC', 'SLOW', 'EXPLOSIVE'];

    it('should have exactly 3 turret types', () => {
      expect(Object.keys(TurretTypes)).toHaveLength(3);
    });

    it('should have all expected turret types', () => {
      turretKeys.forEach((key) => {
        expect(TurretTypes).toHaveProperty(key);
      });
    });

    describe.each(turretKeys)('%s', (turretKey) => {
      const turret = TurretTypes[turretKey];

      it('should have a name', () => {
        expect(turret.name).toBeDefined();
        expect(typeof turret.name).toBe('string');
      });

      it('should have an icon', () => {
        expect(turret.icon).toBeDefined();
        expect(typeof turret.icon).toBe('string');
      });

      it('should have positive cost', () => {
        expect(turret.cost).toBePositive();
        expect(turret.cost).toBeInteger();
      });

      it('should have positive damage', () => {
        expect(turret.damage).toBePositive();
      });

      it('should have positive fire rate', () => {
        expect(turret.fireRate).toBePositive();
      });

      it('should have positive range', () => {
        expect(turret.range).toBePositive();
      });

      it('should have a color', () => {
        expect(typeof turret.color).toBe('number');
      });

      it('should have positive health', () => {
        expect(turret.health).toBePositive();
      });

      it('should have a description', () => {
        expect(turret.description).toBeDefined();
        expect(typeof turret.description).toBe('string');
      });
    });

    it('SLOW turret should have slow property', () => {
      expect(TurretTypes.SLOW.slow).toBeGreaterThan(0);
    });

    it('SLOW turret should have slowDuration property', () => {
      expect(TurretTypes.SLOW.slowDuration).toBePositive();
    });

    it('EXPLOSIVE turret should have splash property', () => {
      expect(TurretTypes.EXPLOSIVE.splash).toBeGreaterThan(0);
    });

    it('costs should increase with power', () => {
      expect(TurretTypes.BASIC.cost).toBeLessThan(TurretTypes.SLOW.cost);
      expect(TurretTypes.SLOW.cost).toBeLessThan(TurretTypes.EXPLOSIVE.cost);
    });
  });

  // ============================================
  // ABILITY TYPES
  // ============================================
  describe('AbilityTypes', () => {
    const abilityKeys = ['AIRSTRIKE', 'FREEZE', 'RAGE', 'REPAIR'];

    it('should have exactly 4 ability types', () => {
      expect(Object.keys(AbilityTypes)).toHaveLength(4);
    });

    it('should have all expected ability types', () => {
      abilityKeys.forEach((key) => {
        expect(AbilityTypes).toHaveProperty(key);
      });
    });

    describe.each(abilityKeys)('%s', (abilityKey) => {
      const ability = AbilityTypes[abilityKey];

      it('should have a name', () => {
        expect(ability.name).toBeDefined();
        expect(typeof ability.name).toBe('string');
      });

      it('should have an icon', () => {
        expect(ability.icon).toBeDefined();
        expect(typeof ability.icon).toBe('string');
      });

      it('should have positive cooldown', () => {
        expect(ability.cooldown).toBePositive();
      });

      it('should have non-negative duration', () => {
        expect(ability.duration).toBeNonNegative();
      });

      it('should have a description', () => {
        expect(ability.description).toBeDefined();
        expect(typeof ability.description).toBe('string');
      });
    });

    it('AIRSTRIKE should have damage and radius', () => {
      expect(AbilityTypes.AIRSTRIKE.damage).toBePositive();
      expect(AbilityTypes.AIRSTRIKE.radius).toBePositive();
    });

    it('FREEZE should have slowAmount', () => {
      expect(AbilityTypes.FREEZE.slowAmount).toBeInRange(0, 1);
    });

    it('RAGE should have multipliers', () => {
      expect(AbilityTypes.RAGE.damageMultiplier).toBeGreaterThan(1);
      expect(AbilityTypes.RAGE.fireRateMultiplier).toBeGreaterThan(1);
    });

    it('REPAIR should have healPercent', () => {
      expect(AbilityTypes.REPAIR.healPercent).toBeInRange(0, 1);
    });
  });

  // ============================================
  // ACHIEVEMENTS
  // ============================================
  describe('Achievements', () => {
    const achievementKeys = [
      'FIRST_BLOOD',
      'ZOMBIE_HUNTER',
      'ZOMBIE_SLAYER',
      'WAVE_5',
      'WAVE_10',
      'WAVE_20',
      'BOSS_KILLER',
      'BOSS_MASTER',
      'RICH_FARMER',
      'TURRET_MASTER',
      'ABILITY_USER',
      'SURVIVOR',
      'SPEEDRUNNER',
      'ENDLESS_10',
      'PERFECTIONIST'
    ];

    it('should have expected number of achievements', () => {
      expect(Object.keys(Achievements).length).toBeGreaterThanOrEqual(15);
    });

    it('should have all expected achievements', () => {
      achievementKeys.forEach((key) => {
        expect(Achievements).toHaveProperty(key);
      });
    });

    describe.each(achievementKeys)('%s', (achievementKey) => {
      const achievement = Achievements[achievementKey];

      it('should have a name', () => {
        expect(achievement.name).toBeDefined();
        expect(typeof achievement.name).toBe('string');
      });

      it('should have an icon', () => {
        expect(achievement.icon).toBeDefined();
        expect(typeof achievement.icon).toBe('string');
      });

      it('should have a description', () => {
        expect(achievement.description).toBeDefined();
        expect(typeof achievement.description).toBe('string');
      });

      it('should have a check function', () => {
        expect(achievement.check).toBeDefined();
        expect(typeof achievement.check).toBe('function');
      });

      it('check function should return boolean', () => {
        const mockStats = {
          totalKills: 0,
          bossKills: 0,
          highestWave: 0,
          maxCurrency: 0,
          turretsPlaced: 0,
          abilitiesUsed: 0,
          clutchWins: 0,
          fastWave10: false,
          endlessHighWave: 0,
          perfectWaves: 0
        };
        const result = achievement.check(mockStats);
        expect(typeof result).toBe('boolean');
      });
    });

    it('FIRST_BLOOD should trigger at 1 kill', () => {
      expect(Achievements.FIRST_BLOOD.check({ totalKills: 0 })).toBe(false);
      expect(Achievements.FIRST_BLOOD.check({ totalKills: 1 })).toBe(true);
    });

    it('ZOMBIE_HUNTER should trigger at 100 kills', () => {
      expect(Achievements.ZOMBIE_HUNTER.check({ totalKills: 99 })).toBe(false);
      expect(Achievements.ZOMBIE_HUNTER.check({ totalKills: 100 })).toBe(true);
    });

    it('WAVE_10 should trigger at wave 10', () => {
      expect(Achievements.WAVE_10.check({ highestWave: 9 })).toBe(false);
      expect(Achievements.WAVE_10.check({ highestWave: 10 })).toBe(true);
    });

    it('BOSS_KILLER should trigger at 1 boss kill', () => {
      expect(Achievements.BOSS_KILLER.check({ bossKills: 0 })).toBe(false);
      expect(Achievements.BOSS_KILLER.check({ bossKills: 1 })).toBe(true);
    });

    it('RICH_FARMER should trigger at 500 currency', () => {
      expect(Achievements.RICH_FARMER.check({ maxCurrency: 499 })).toBe(false);
      expect(Achievements.RICH_FARMER.check({ maxCurrency: 500 })).toBe(true);
    });
  });
});
