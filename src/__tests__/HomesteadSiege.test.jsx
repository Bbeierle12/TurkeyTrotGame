/**
 * HomesteadSiege React Component Tests
 *
 * Tests the main game UI component including:
 * - Start screen rendering
 * - Game HUD elements
 * - Shop, turret, and settings modals
 * - Game over screen
 * - User interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock localStorage before imports
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Tone.js
vi.mock('tone', async () => await import('../engine/__tests__/__mocks__/tone.js'));

// Mock GameEngine - needs to be a constructor function
let mockEngineCallbacks = {};
let mockEngineEvents = {};
let mockEngineSnapshot = null;

const emitMockEvent = (event, detail) => {
  const handlers = mockEngineEvents[event] || [];
  handlers.forEach((handler) => handler(detail));
};

const wrapWithAct = (callback) => (...args) => {
  act(() => {
    callback(...args);
  });
};

const updateSnapshot = (partial) => {
  mockEngineSnapshot = { ...mockEngineSnapshot, ...partial };
  emitMockEvent('STATE_CHANGED', mockEngineSnapshot);
};
const createMockEngine = () => ({
  init: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn((event, callback) => {
    mockEngineCallbacks[event] = wrapWithAct(callback);
  }),
  onEvent: vi.fn((event, handler) => {
    if (!mockEngineEvents[event]) {
      mockEngineEvents[event] = [];
    }
    const wrapped = wrapWithAct(handler);
    mockEngineEvents[event].push(wrapped);
    return () => {
      mockEngineEvents[event] = mockEngineEvents[event].filter((h) => h !== wrapped);
    };
  }),
  getSnapshot: vi.fn(() => mockEngineSnapshot),
  startGame: vi.fn(),
  startWave: vi.fn(),
  togglePause: vi.fn(),
  setWeapon: vi.fn(),
  buyUpgrade: vi.fn(() => true),
  repairHouse: vi.fn(),
  upgradeHouse: vi.fn(),
  useAbility: vi.fn(),
  startTurretPlacement: vi.fn(),
  cancelTurretPlacement: vi.fn(),
  setCameraMode: vi.fn(),
  takeScreenshot: vi.fn(),
  getUpgrades: vi.fn(() => ({ weaponDamage: 0, fireRate: 0, playerHealth: 0, houseArmor: 0, houseLevel: 0 })),
  updateSettings: vi.fn()
});

let mockEngine;

vi.mock('../engine/GameEngine.js', () => ({
  GameEngine: function() {
    mockEngine = createMockEngine();
    return mockEngine;
  },
  WeaponTypes: {
    PITCHFORK: { name: 'Pitchfork', icon: '🔱', damage: 28, description: 'Three-pronged melee weapon' },
    CORN_CANNON: { name: 'Corn Cannon', icon: '🌽', damage: 45, description: 'Explosive corn cobs' },
    EGG_BLASTER: { name: 'Egg Blaster', icon: '🥚', damage: 12, description: 'Rapid fire eggs' },
    HAY_BALE_CATAPULT: { name: 'Hay Bale Catapult', icon: '🌾', damage: 90, description: 'Heavy splash damage' }
  },
  ZombieTypes: {
    STANDARD: { hp: 35, speed: 1, damage: 8, value: 10 }
  },
  HouseUpgrades: {
    LEVEL_1: { cost: 200 }
  },
  TurretTypes: {
    BASIC: { name: 'Basic Turret', icon: '🗼', damage: 15, range: 8, fireRate: 1.5, cost: 100, description: 'Auto-targets enemies' },
    SLOW: { name: 'Slow Turret', icon: '❄️', damage: 5, range: 6, fireRate: 2, cost: 150, description: 'Slows enemies' },
    EXPLOSIVE: { name: 'Explosive Turret', icon: '💥', damage: 40, range: 10, fireRate: 0.5, cost: 250, description: 'Area damage' }
  },
  AbilityTypes: {
    AIRSTRIKE: { name: 'Artillery Strike', cost: 75 },
    FREEZE: { name: 'Frost Nova', cost: 50 },
    RAGE: { name: 'Survival Fury', cost: 60 },
    REPAIR: { name: 'Emergency Repair', cost: 40 }
  }
}));

vi.mock('../engine/GameConfig.js', () => ({
  Achievements: {
    FIRST_BLOOD: { name: 'First Blood', description: 'Kill your first zombie', icon: '🩸' },
    WAVE_5: { name: 'Wave 5 Survivor', description: 'Reach wave 5', icon: '⭐' },
    BOSS_SLAYER: { name: 'Boss Slayer', description: 'Defeat a boss zombie', icon: '👑' }
  }
}));

// Import after mocks
import HomesteadSiege from '../HomesteadSiege.jsx';

describe('HomesteadSiege Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockEngineCallbacks = {};
    mockEngineEvents = {};
    mockEngineSnapshot = {
      health: 100,
      currency: 100,
      activeWaveNumber: 0,
      upcomingWaveNumber: 1,
      enemies: 0,
      score: 0,
      houseIntegrity: 100,
      isInside: false,
      canStartWave: false,
      startWaveButtonLabel: 'Start Wave 1',
      placingTurret: null,
      placementFeedback: null,
      placementCursor: null
    };
    mockEngine = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Start Screen', () => {
    it('should render the start screen with title', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText('Homestead Siege')).toBeInTheDocument();
    });

    it('should render Normal Mode and Endless Mode buttons', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText('Normal Mode')).toBeInTheDocument();
      expect(screen.getByText('Endless Mode')).toBeInTheDocument();
    });

    it('should display game description', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText(/Defend your barn/)).toBeInTheDocument();
    });

    it('should display control instructions', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText(/WASD: Move/)).toBeInTheDocument();
    });

    it('should display player stats from save data', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText('High Score')).toBeInTheDocument();
      expect(screen.getByText('Best Wave')).toBeInTheDocument();
      expect(screen.getByText('Total Kills')).toBeInTheDocument();
      expect(screen.getByText('Games')).toBeInTheDocument();
    });

    it('should display achievements button', () => {
      render(<HomesteadSiege />);

      expect(screen.getByText(/Achievements/)).toBeInTheDocument();
    });

    it('should start normal game when Normal Mode clicked', () => {
      render(<HomesteadSiege />);

      fireEvent.click(screen.getByText('Normal Mode'));

      expect(mockEngine.startGame).toHaveBeenCalledWith(false);
    });

    it('should start endless game when Endless Mode clicked', () => {
      render(<HomesteadSiege />);

      fireEvent.click(screen.getByText('Endless Mode'));

      expect(mockEngine.startGame).toHaveBeenCalledWith(true);
    });
  });

  describe('Game HUD', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
    });

    it('should hide start screen after game starts', () => {
      expect(screen.queryByText('Homestead Siege')).not.toBeInTheDocument();
    });

    it('should display weapon bar with all weapons', () => {
      // Multiple elements may exist, just verify at least one of each
      expect(screen.getAllByText('🔱').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🌽').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🥚').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🌾').length).toBeGreaterThan(0);
    });

    it('should display shop button', () => {
      expect(screen.getByText('🛒')).toBeInTheDocument();
    });

    it('should display turret button', () => {
      expect(screen.getByText('🗼')).toBeInTheDocument();
    });

    it('should display help button', () => {
      expect(screen.getByText('❓')).toBeInTheDocument();
    });

    it('should display settings button', () => {
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should display camera mode indicator', () => {
      expect(screen.getByText(/ISOMETRIC/)).toBeInTheDocument();
    });
  });

  describe('Shop Modal', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
      fireEvent.click(screen.getByText('🛒'));
    });

    it('should open shop modal when shop button clicked', () => {
      expect(screen.getByText('Shop')).toBeInTheDocument();
    });

    it('should display shop items', () => {
      expect(screen.getByText('Weapon Damage +15%')).toBeInTheDocument();
      expect(screen.getByText('Fire Rate +10%')).toBeInTheDocument();
      expect(screen.getByText('Max Health +20')).toBeInTheDocument();
      expect(screen.getByText('House Armor +10%')).toBeInTheDocument();
      expect(screen.getByText('Repair House')).toBeInTheDocument();
    });

    it('should close shop when close button clicked', () => {
      fireEvent.click(screen.getByText(/Close/));

      expect(screen.queryByText('Shop')).not.toBeInTheDocument();
    });
  });

  describe('Turret Menu Modal', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
      // Click the turret button (🗼) - but there are two, one in weapon bar
      const turretButtons = screen.getAllByText('🗼');
      fireEvent.click(turretButtons[turretButtons.length - 1]); // Click the menu button
    });

    it('should open turret menu', () => {
      expect(screen.getByText('Turrets')).toBeInTheDocument();
    });

    it('should display turret types', () => {
      expect(screen.getByText('Basic Turret')).toBeInTheDocument();
      expect(screen.getByText('Slow Turret')).toBeInTheDocument();
      expect(screen.getByText('Explosive Turret')).toBeInTheDocument();
    });

    it('should display turret stats', () => {
      expect(screen.getByText(/DMG: 15/)).toBeInTheDocument();
      expect(screen.getByText(/Range: 8/)).toBeInTheDocument();
    });
  });

  describe('Placement Feedback', () => {
    it('should show placement tooltip when invalid', async () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      updateSnapshot({
        placingTurret: 'BASIC',
        placementFeedback: {
          ok: false,
          reasons: [{ code: 'TOO_CLOSE', message: 'Too close to barn' }]
        },
        placementCursor: { x: 120, y: 140 }
      });

      expect(await screen.findByText('Too close to barn')).toBeInTheDocument();
    });
  });

  describe('Settings Modal', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
      fireEvent.click(screen.getByText('⚙️'));
    });

    it('should open settings modal', () => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should display volume controls', () => {
      fireEvent.click(screen.getByText('Audio'));
      expect(screen.getByText('Master Volume')).toBeInTheDocument();
      expect(screen.getByText('SFX Volume')).toBeInTheDocument();
      expect(screen.getByText('Music Volume')).toBeInTheDocument();
    });

    it('should display mute toggle', () => {
      fireEvent.click(screen.getByText('Audio'));
      expect(screen.getByText('Mute All')).toBeInTheDocument();
    });

    it('should display FPS toggle', () => {
      fireEvent.click(screen.getByText('Graphics'));
      expect(screen.getByText('Show FPS')).toBeInTheDocument();
    });
  });

  describe('Help Modal', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
      fireEvent.click(screen.getByText('❓'));
    });

    it('should open help modal', () => {
      expect(screen.getByText('How to Play')).toBeInTheDocument();
    });

    it('should display objective', () => {
      expect(screen.getByText('Objective')).toBeInTheDocument();
    });

    it('should display controls', () => {
      expect(screen.getByText('Controls')).toBeInTheDocument();
      expect(screen.getByText('WASD')).toBeInTheDocument();
    });

    it('should display abilities info', () => {
      expect(screen.getByText('Abilities')).toBeInTheDocument();
    });
  });

  describe('Achievements Modal', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      // Click the achievements button on start screen
      const achievementButtons = screen.getAllByText(/Achievements/);
      fireEvent.click(achievementButtons[0]);
    });

    it('should open achievements modal', () => {
      // Look for the title format in the modal header
      expect(screen.getAllByText(/Achievements/).length).toBeGreaterThan(0);
    });

    it('should display achievement items', () => {
      expect(screen.getByText('First Blood')).toBeInTheDocument();
      expect(screen.getByText('Wave 5 Survivor')).toBeInTheDocument();
      expect(screen.getByText('Boss Slayer')).toBeInTheDocument();
    });

    it('should display achievement descriptions', () => {
      expect(screen.getByText('Kill your first zombie')).toBeInTheDocument();
    });
  });

  describe('Weapon Selection', () => {
    it('should allow weapon button clicks without error', () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      // Get all corn buttons and click the first one (weapon bar)
      const cornButtons = screen.getAllByText('🌽');

      // Clicking should not throw an error
      expect(() => fireEvent.click(cornButtons[0])).not.toThrow();
    });

    it('should display weapon buttons for all weapons', () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      // Verify weapon buttons exist
      expect(screen.getAllByText('🔱').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🌽').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🥚').length).toBeGreaterThan(0);
      expect(screen.getAllByText('🌾').length).toBeGreaterThan(0);
    });

    it('should display current weapon info', () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      // There may be multiple "Pitchfork" texts, verify at least one
      expect(screen.getAllByText('Pitchfork').length).toBeGreaterThan(0);
    });
  });

  describe('Game State Callbacks', () => {
    beforeEach(() => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));
    });

    it('should register callbacks on engine', () => {
      expect(mockEngine.on).toHaveBeenCalledWith('onWeaponChange', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('onBannerChange', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('onGameOver', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('onWaveComplete', expect.any(Function));
      expect(mockEngine.onEvent).toHaveBeenCalledWith('STATE_CHANGED', expect.any(Function));
    });
  });

  describe('Banner Display', () => {
    it('should display banner when set', async () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      // Trigger banner callback
      if (mockEngineCallbacks.onBannerChange) {
        mockEngineCallbacks.onBannerChange('Wave 1 Starting!');
      }

      await waitFor(() => {
        expect(screen.getByText('Wave 1 Starting!')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle pause on Escape', () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      fireEvent.keyDown(window, { code: 'Escape' });

      expect(mockEngine.togglePause).toHaveBeenCalled();
    });

    it('should open shop on B key', async () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      fireEvent.keyDown(window, { code: 'KeyB' });

      await waitFor(() => {
        expect(screen.getByText('Shop')).toBeInTheDocument();
      });
    });

    it('should open turret menu on T key', async () => {
      render(<HomesteadSiege />);
      fireEvent.click(screen.getByText('Normal Mode'));

      fireEvent.keyDown(window, { code: 'KeyT' });

      await waitFor(() => {
        expect(screen.getByText('Turrets')).toBeInTheDocument();
      });
    });
  });

  describe('Save Data Loading', () => {
    it('should load save data from localStorage', () => {
      const savedData = {
        playerStats: {
          totalKills: 100,
          highScore: 5000,
          highestWave: 10,
          gamesPlayed: 5
        },
        unlockedAchievements: ['FIRST_BLOOD'],
        settings: { masterVolume: 0.5 },
        version: 2
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedData));

      render(<HomesteadSiege />);

      expect(screen.getByText('5000')).toBeInTheDocument(); // High score
      expect(screen.getByText('100')).toBeInTheDocument(); // Total kills
    });
  });
});

describe('AudioManager', () => {
  it('should be initialized on user interaction', async () => {
    render(<HomesteadSiege />);

    // First click initializes audio
    fireEvent.click(screen.getByText('Normal Mode'));

    // Audio initialization is triggered
    expect(mockEngine.init).toHaveBeenCalled();
  });
});

describe('Game Over Screen', () => {
  it('should show game over screen when game ends', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    // Trigger game over
    if (mockEngineCallbacks.onGameOver) {
      mockEngineCallbacks.onGameOver({ score: 1000, wave: 5 });
    }

    await waitFor(() => {
      expect(screen.getByText('GAME OVER')).toBeInTheDocument();
    });
  });

  it('should display final score on game over', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 0,
      currency: 500,
      activeWaveNumber: 5,
      upcomingWaveNumber: 6,
      enemies: 0,
      score: 1500,
      houseIntegrity: 50,
      isInside: false
    });

    // Trigger game over
    if (mockEngineCallbacks.onGameOver) {
      mockEngineCallbacks.onGameOver({ score: 1500, wave: 5 });
    }

    await waitFor(() => {
      expect(screen.getByText('Score: 1500')).toBeInTheDocument();
    });
  });

  it('should show play again button on game over', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    if (mockEngineCallbacks.onGameOver) {
      mockEngineCallbacks.onGameOver({ score: 1000, wave: 5 });
    }

    await waitFor(() => {
      expect(screen.getByText('Play Again')).toBeInTheDocument();
    });
  });

  it('should show main menu button on game over', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    if (mockEngineCallbacks.onGameOver) {
      mockEngineCallbacks.onGameOver({ score: 1000, wave: 5 });
    }

    await waitFor(() => {
      expect(screen.getByText('Main Menu')).toBeInTheDocument();
    });
  });
});

describe('Pause Screen', () => {
  it('should display pause screen when paused', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    if (mockEngineCallbacks.onPauseChange) {
      mockEngineCallbacks.onPauseChange(true);
    }

    await waitFor(() => {
      expect(screen.getByText('PAUSED')).toBeInTheDocument();
    });
  });

  it('should show resume button when paused', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    if (mockEngineCallbacks.onPauseChange) {
      mockEngineCallbacks.onPauseChange(true);
    }

    await waitFor(() => {
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  it('should call togglePause when resume clicked', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    if (mockEngineCallbacks.onPauseChange) {
      mockEngineCallbacks.onPauseChange(true);
    }

    await waitFor(() => {
      fireEvent.click(screen.getByText('Resume'));
    });

    expect(mockEngine.togglePause).toHaveBeenCalled();
  });
});

describe('Wave Label Consistency (Single Source of Truth)', () => {
  /**
   * These tests verify that the UI wave labels derive from the engine's
   * single source of truth (activeWaveNumber and upcomingWaveNumber).
   * The UI should never calculate or derive wave numbers independently.
   */

  it('should display Start Wave button with upcomingWaveNumber from engine', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 100,
      currency: 100,
      activeWaveNumber: 0,
      upcomingWaveNumber: 1,
      enemies: 0,
      score: 0,
      houseIntegrity: 100,
      isInside: false,
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 1'
    });

    await waitFor(() => {
      expect(screen.getByText('Start Wave 1')).toBeInTheDocument();
    });
  });

  it('should update Start Wave button when engine sends new upcomingWaveNumber', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 100,
      currency: 200,
      activeWaveNumber: 1,
      upcomingWaveNumber: 2,
      enemies: 0,
      score: 100,
      houseIntegrity: 100,
      isInside: false,
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 2'
    });

    await waitFor(() => {
      expect(screen.getByText('Start Wave 2')).toBeInTheDocument();
    });
  });

  it('should display wave number during active wave from engine stats', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 80,
      currency: 150,
      activeWaveNumber: 3,
      upcomingWaveNumber: 4,
      enemies: 5,
      score: 300,
      houseIntegrity: 90,
      isInside: false,
      canStartWave: false
    });

    await waitFor(() => {
      expect(screen.getByText('Wave 3')).toBeInTheDocument();
    });
  });

  it('should not show Start Wave button during active wave', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 100,
      currency: 100,
      activeWaveNumber: 1,
      upcomingWaveNumber: 2,
      enemies: 10,
      score: 0,
      houseIntegrity: 100,
      isInside: false,
      canStartWave: false
    });

    await waitFor(() => {
      expect(screen.queryByText(/Start Wave/)).not.toBeInTheDocument();
    });
  });

  it('should show wave display matching engine wave number across multiple waves', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    // Test that UI reflects whatever the engine sends for waves 1-5
    for (let wave = 1; wave <= 5; wave++) {
      updateSnapshot({
        health: 100,
        currency: wave * 50,
        activeWaveNumber: wave,
        upcomingWaveNumber: wave + 1,
        enemies: 10 - wave,
        score: wave * 100,
        houseIntegrity: 100,
        isInside: false
      });

      await waitFor(() => {
        expect(screen.getByText(`Wave ${wave}`)).toBeInTheDocument();
      });
    }
  });

  it('should update wave button label when transitioning from wave complete to prep', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 90,
      currency: 150,
      activeWaveNumber: 1,
      upcomingWaveNumber: 2,
      enemies: 0,
      score: 150,
      houseIntegrity: 95,
      isInside: false,
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 2'
    });

    await waitFor(() => {
      expect(screen.getByText('Start Wave 2')).toBeInTheDocument();
    });

    updateSnapshot({
      health: 80,
      currency: 250,
      activeWaveNumber: 2,
      upcomingWaveNumber: 3,
      enemies: 0,
      score: 300,
      houseIntegrity: 85,
      isInside: false,
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 3'
    });

    await waitFor(() => {
      expect(screen.getByText('Start Wave 3')).toBeInTheDocument();
    });
  });

  it('should call engine.startWave when Start Wave button is clicked', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 100,
      currency: 100,
      activeWaveNumber: 0,
      upcomingWaveNumber: 1,
      enemies: 0,
      score: 0,
      houseIntegrity: 100,
      isInside: false,
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 1'
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Start Wave 1'));
    });

    expect(mockEngine.startWave).toHaveBeenCalled();
  });

  it('should show game over wave number from engine stats', async () => {
    render(<HomesteadSiege />);
    fireEvent.click(screen.getByText('Normal Mode'));

    updateSnapshot({
      health: 0,
      currency: 500,
      activeWaveNumber: 7,
      upcomingWaveNumber: 8,
      enemies: 3,
      score: 1500,
      houseIntegrity: 0,
      isInside: false
    });

    // Trigger game over
    if (mockEngineCallbacks.onGameOver) {
      mockEngineCallbacks.onGameOver({ score: 1500, wave: 7 });
    }

    await waitFor(() => {
      expect(screen.getByText('Wave 7')).toBeInTheDocument();
    });
  });
});
