import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('tone', async () => await import('../../engine/__tests__/__mocks__/tone.js'));

let mockEngineSnapshot;
let mockEngineEvents = {};
let mockEngine;

const emitMockEvent = (event, detail) => {
  const handlers = mockEngineEvents[event] || [];
  handlers.forEach((handler) => handler(detail));
};

const updateSnapshot = (partial) => {
  mockEngineSnapshot = { ...mockEngineSnapshot, ...partial };
  emitMockEvent('STATE_CHANGED', mockEngineSnapshot);
};

const createMockEngine = () => ({
  init: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  onEvent: vi.fn((event, handler) => {
    if (!mockEngineEvents[event]) {
      mockEngineEvents[event] = [];
    }
    mockEngineEvents[event].push(handler);
    return () => {
      mockEngineEvents[event] = mockEngineEvents[event].filter((h) => h !== handler);
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

vi.mock('../../engine/GameEngine.js', () => ({
  GameEngine: function GameEngine() {
    mockEngine = createMockEngine();
    return mockEngine;
  },
  WeaponTypes: {
    PITCHFORK: { name: 'Pitchfork', icon: 'PF', damage: 28, description: 'Three-pronged melee weapon' },
    CORN_CANNON: { name: 'Corn Cannon', icon: 'CC', damage: 45, description: 'Explosive corn cobs' },
    EGG_BLASTER: { name: 'Egg Blaster', icon: 'EB', damage: 12, description: 'Rapid fire eggs' },
    HAY_BALE_CATAPULT: { name: 'Hay Bale Catapult', icon: 'HB', damage: 90, description: 'Heavy splash damage' }
  },
  ZombieTypes: {
    STANDARD: { hp: 35, speed: 1, damage: 8, value: 10 }
  },
  HouseUpgrades: {
    LEVEL_1: { cost: 200 }
  },
  TurretTypes: {
    BASIC: { name: 'Basic Turret', icon: 'BT', damage: 15, range: 8, fireRate: 1.5, cost: 100, description: 'Auto-targets enemies' }
  },
  AbilityTypes: {
    AIRSTRIKE: { name: 'Artillery Strike', cost: 75 }
  }
}));

vi.mock('../../engine/GameConfig.js', () => ({
  Achievements: {
    FIRST_BLOOD: { name: 'First Blood', description: 'Kill your first zombie', icon: 'FB' }
  }
}));

import HomesteadSiege from '../../HomesteadSiege.jsx';

describe('Start Wave Flow (UI)', () => {
  beforeEach(() => {
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
      canStartWave: true,
      startWaveButtonLabel: 'Start Wave 1',
      placingTurret: null,
      placementFeedback: null,
      placementCursor: null
    };
    mockEngine = null;
  });

  it('advances through a start-wave and returns to prep with correct label', async () => {
    const user = userEvent.setup();
    render(<HomesteadSiege />);

    await user.click(screen.getByRole('button', { name: 'Normal Mode' }));

    const startWaveButton = await screen.findByRole('button', { name: 'Start Wave 1' });
    await user.click(startWaveButton);
    expect(mockEngine.startWave).toHaveBeenCalledTimes(1);

    act(() => {
      updateSnapshot({
        activeWaveNumber: 1,
        upcomingWaveNumber: 2,
        canStartWave: false,
        startWaveButtonLabel: 'Start Wave 2'
      });
    });

    expect(screen.queryByRole('button', { name: /Start Wave/i })).not.toBeInTheDocument();
    expect(screen.getByText('Wave 1')).toBeInTheDocument();

    act(() => {
      updateSnapshot({
        activeWaveNumber: 1,
        upcomingWaveNumber: 2,
        canStartWave: true,
        startWaveButtonLabel: 'Start Wave 2'
      });
    });

    expect(await screen.findByRole('button', { name: 'Start Wave 2' })).toBeInTheDocument();
  });
});
