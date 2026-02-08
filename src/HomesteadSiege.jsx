/**
 * HomesteadSiege - Refactored React Component
 *
 * This component only handles UI overlay and instantiates the GameEngine.
 * All game logic is in src/engine/GameEngine.js
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import {
  GameEngine,
  WeaponTypes,
  ZombieTypes,
  HouseUpgrades,
  TurretTypes,
  AbilityTypes
} from './engine/GameEngine.js';
import { Achievements } from './engine/GameConfig.js';
import { SettingsModal } from './components/settings';
import { getDefaultSettings, GameEngineSettings } from './config/SettingsConfig';
import { InputBindings, StartScreenHint, ControlHelp, AbilityHelp } from './config/InputConfig';
import { useGameSnapshot } from './ui/hooks/useGameSnapshot';
import { Hud } from './ui/Hud/Hud';
import { ActionBar } from './ui/Hud/ActionBar';
import { PerformanceHud } from './ui/Hud/PerformanceHud';
import { StatusOverlays } from './ui/Overlays/StatusOverlays';
import { StartScreen } from './ui/Overlays/StartScreen';
import { CrashOverlay } from './ui/Overlays/CrashOverlay';
import { PauseOverlay } from './ui/Overlays/PauseOverlay';
import { GameOverOverlay } from './ui/Overlays/GameOverOverlay';
import { PlacementFeedback } from './ui/Overlays/PlacementFeedback';
import { ShopMenu } from './ui/Menus/ShopMenu';
import { TurretMenu } from './ui/Menus/TurretMenu';
import { AchievementsModal } from './ui/Menus/AchievementsModal';
import { HelpModal } from './ui/Menus/HelpModal';

// =========================
// AUDIO MANAGER
// =========================
class AudioManager {
  constructor() {
    this.initialized = false;
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;
    this.muted = false;
    this.synths = {};
    this.lastPlayTime = {};
    this.minInterval = 0.05;
  }

  async init() {
    if (this.initialized) return;
    try {
      await Tone.start();
      this.masterGain = new Tone.Gain(this.masterVolume).toDestination();
      this.sfxGain = new Tone.Gain(this.sfxVolume).connect(this.masterGain);
      this.musicGain = new Tone.Gain(this.musicVolume).connect(this.masterGain);

      this.synths.pitchfork = new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.1 }, harmonicity: 5.1, modulationIndex: 16, resonance: 2000, octaves: 1.5 }).connect(this.sfxGain);
      this.synths.cannon = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 } }).connect(this.sfxGain);
      this.synths.egg = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 } }).connect(this.sfxGain);
      this.synths.mortar = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 8, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 } }).connect(this.sfxGain);
      this.synths.explosion = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.2 } }).connect(this.sfxGain);
      this.synths.gobble = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.1 } }).connect(this.sfxGain);
      this.synths.ui = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).connect(this.sfxGain);
      this.synths.hurt = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 } }).connect(this.sfxGain);
      this.synths.coin = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }).connect(this.sfxGain);
      this.synths.turret = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.05 } }).connect(this.sfxGain);
      this.synths.ability = new Tone.PolySynth(Tone.Synth).connect(this.sfxGain);
      this.synths.freeze = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 0.5 } }).connect(this.sfxGain);
      this.synths.achievement = new Tone.PolySynth(Tone.Synth).connect(this.sfxGain);

      this.setupMusic();
      this.initialized = true;
    } catch (e) { console.warn('Audio init failed:', e); }
  }

  setupMusic() {
    const bassNotes = ['C2', 'E2', 'G2', 'A2', 'F2', 'G2', 'E2', 'D2'];
    const melodyNotes = ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4'];
    this.bassSynth = new Tone.MonoSynth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2 }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, baseFrequency: 200, octaves: 2 } }).connect(this.musicGain);
    this.bassSynth.volume.value = -12;
    this.melodySynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.3 } }).connect(this.musicGain);
    this.melodySynth.volume.value = -18;
    let bassIndex = 0, melodyIndex = 0;
    this.musicLoop = new Tone.Loop((time) => {
      if (!this.muted && this.musicPlaying) {
        this.bassSynth.triggerAttackRelease(bassNotes[bassIndex % bassNotes.length], '4n', time);
        if (Math.random() > 0.3) { this.melodySynth.triggerAttackRelease(melodyNotes[melodyIndex % melodyNotes.length], '8n', time + 0.1); melodyIndex++; }
        bassIndex++;
      }
    }, '4n');
  }

  startMusic() { if (!this.initialized || this.musicPlaying) return; this.musicPlaying = true; Tone.Transport.bpm.value = 100; Tone.Transport.start(); this.musicLoop.start(0); }
  stopMusic() { this.musicPlaying = false; this.musicLoop?.stop(); }

  playSound(type) {
    if (!this.initialized || this.muted) return;
    const now = Tone.now();
    const lastTime = this.lastPlayTime[type] || 0;
    if (now - lastTime < this.minInterval) return;
    this.lastPlayTime[type] = now;

    try {
      const t = now + 0.01;
      switch (type) {
        case 'pitchfork': this.synths.pitchfork.triggerAttackRelease('C3', '16n', t); break;
        case 'cannon': this.synths.cannon.triggerAttackRelease('C1', '8n', t); break;
        case 'egg': this.synths.egg.triggerAttackRelease('E5', '32n', t); break;
        case 'mortar': this.synths.mortar.triggerAttackRelease('G1', '4n', t); break;
        case 'explosion': this.synths.explosion.triggerAttackRelease('8n', t); break;
        case 'hit': this.synths.ui.triggerAttackRelease('A4', '32n', t); break;
        case 'kill': this.synths.coin.triggerAttackRelease('E5', '16n', t); break;
        case 'groan': this.synths.gobble.triggerAttackRelease(80 + Math.random() * 40, '8n', t); break;
        case 'hurt': this.synths.hurt.triggerAttackRelease('16n', t); break;
        case 'wave': this.synths.ui.triggerAttackRelease('C4', '8n', t); break;
        case 'gameover': this.synths.ui.triggerAttackRelease('E4', '4n', t); break;
        case 'click': this.synths.ui.triggerAttackRelease('C5', '32n', t); break;
        case 'purchase': this.synths.coin.triggerAttackRelease('G4', '16n', t); break;
        case 'turret': this.synths.turret.triggerAttackRelease('D4', '16n', t); break;
        case 'ability': this.synths.ability.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', t); break;
        case 'freeze': this.synths.freeze.triggerAttackRelease('C6', '4n', t); break;
        case 'airstrike': this.synths.explosion.triggerAttackRelease('4n', t); break;
        case 'achievement': this.synths.achievement.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n', t); break;
      }
    } catch (e) { /* Ignore audio errors */ }
  }

  setMasterVolume(v) { this.masterVolume = v; if (this.masterGain) this.masterGain.gain.value = v; }
  setSfxVolume(v) { this.sfxVolume = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVolume(v) { this.musicVolume = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setMuted(m) { this.muted = m; if (m) this.stopMusic(); else if (this.initialized) this.startMusic(); }
  dispose() { this.stopMusic(); Tone.Transport.stop(); Object.values(this.synths).forEach(s => s?.dispose()); this.bassSynth?.dispose(); this.melodySynth?.dispose(); this.musicLoop?.dispose(); }
}

const audioManager = new AudioManager();

// =========================
// SAVE/LOAD SYSTEM
// =========================
const SAVE_KEY = 'homesteadSiege_saveData';

const getDefaultSaveData = () => ({
  playerStats: {
    totalKills: 0, bossKills: 0, highestWave: 0, maxCurrency: 0,
    turretsPlaced: 0, abilitiesUsed: 0, clutchWins: 0, fastWave10: false,
    endlessHighWave: 0, perfectWaves: 0, gamesPlayed: 0, highScore: 0
  },
  unlockedAchievements: [],
  settings: getDefaultSettings(),
  version: 2
});

const loadSaveData = () => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      const defaults = getDefaultSaveData();
      return {
        playerStats: { ...defaults.playerStats, ...data.playerStats },
        unlockedAchievements: data.unlockedAchievements || [],
        settings: { ...defaults.settings, ...data.settings },
        version: data.version || 2
      };
    }
  } catch (e) {
    console.warn('Failed to load save data:', e);
  }
  return getDefaultSaveData();
};

const saveGameData = (playerStats, unlockedAchievements, settings) => {
  try {
    const data = { playerStats, unlockedAchievements, settings, version: 2 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save data:', e);
  }
};

// =========================
// MAIN COMPONENT
// =========================
export default function HomesteadSiege() {
  // Container ref for Three.js
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [engineInstance, setEngineInstance] = useState(null);

  // Load persistent data
  const saveData = useRef(loadSaveData());

  // UI State
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [endlessMode, setEndlessMode] = useState(false);

  // Game stats (now derived from engine snapshot)
  const [weapon, setWeapon] = useState(WeaponTypes.PITCHFORK);
  const [banner, setBanner] = useState('');
  const [placingTurret, setPlacingTurret] = useState(null);
  const [lowHealth, setLowHealth] = useState(false);
  const [hitMarker, setHitMarker] = useState(null);
  const [fps, setFps] = useState(60);
  const [perfMetrics, setPerfMetrics] = useState(null);
  const [runtimeError, setRuntimeError] = useState(null);
  const snapshot = useGameSnapshot(engineInstance);
  const uiSnapshot = snapshot ?? {
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
  const activeWaveNumber = uiSnapshot.activeWaveNumber ?? 0;
  const upcomingWaveNumber = uiSnapshot.upcomingWaveNumber ?? 1;
  const canStartWave = Boolean(uiSnapshot.canStartWave);
  const startWaveLabel = uiSnapshot.startWaveButtonLabel ?? `Start Wave ${upcomingWaveNumber}`;
  const health = uiSnapshot.health ?? 100;
  const currency = uiSnapshot.currency ?? 100;
  const enemies = uiSnapshot.enemies ?? 0;
  const score = uiSnapshot.score ?? 0;
  const houseIntegrity = uiSnapshot.houseIntegrity ?? 100;
  const isInside = uiSnapshot.isInside ?? false;
  const placementFeedback = uiSnapshot.placementFeedback ?? null;
  const placementCursor = uiSnapshot.placementCursor ?? null;
  const activePlacingTurret = uiSnapshot.placingTurret ?? placingTurret;

  // Menu states
  const [shopOpen, setShopOpen] = useState(false);
  const [turretMenuOpen, setTurretMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cameraMode, setCameraModeState] = useState('SHOULDER');
  const cameraModeRef = useRef('SHOULDER');

  // Wrapper to update both state and ref
  const setCameraMode = (mode) => {
    cameraModeRef.current = mode;
    setCameraModeState(mode);
  };

  // Persistent stats
  const [playerStats, setPlayerStats] = useState(saveData.current.playerStats);
  const [unlockedAchievements, setUnlockedAchievements] = useState(saveData.current.unlockedAchievements);
  const [settings, setSettings] = useState(saveData.current.settings);
  const highScore = playerStats.highScore;
  const uiScale = Math.min(1.3, Math.max(0.85, settings.uiScale ?? 1));
  const uiLayerStyle = {
    transform: `scale(${uiScale})`,
    transformOrigin: 'top left',
    width: `${100 / uiScale}%`,
    height: `${100 / uiScale}%`
  };

  // Update setting and save
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Audio settings
      if (key === 'masterVolume') audioManager.setMasterVolume(value);
      if (key === 'sfxVolume') audioManager.setSfxVolume(value);
      if (key === 'musicVolume') audioManager.setMusicVolume(value);
      if (key === 'muted') audioManager.setMuted(value);
      // Forward game engine settings
      if (GameEngineSettings.includes(key)) {
        engineRef.current?.updateSettings({ [key]: value });
      }
      saveGameData(playerStats, unlockedAchievements, newSettings);
      return newSettings;
    });
  }, [playerStats, unlockedAchievements]);

  // Batch update settings (for presets)
  const updateBatchSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      // Apply audio settings
      Object.entries(newSettings).forEach(([key, value]) => {
        if (key === 'masterVolume') audioManager.setMasterVolume(value);
        if (key === 'sfxVolume') audioManager.setSfxVolume(value);
        if (key === 'musicVolume') audioManager.setMusicVolume(value);
        if (key === 'muted') audioManager.setMuted(value);
      });
      // Forward game engine settings
      const engineSettings = {};
      Object.entries(newSettings).forEach(([key, value]) => {
        if (GameEngineSettings.includes(key)) {
          engineSettings[key] = value;
        }
      });
      if (Object.keys(engineSettings).length > 0) {
        engineRef.current?.updateSettings(engineSettings);
      }
      saveGameData(playerStats, unlockedAchievements, merged);
      return merged;
    });
  }, [playerStats, unlockedAchievements]);

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize audio on first interaction
    const initAudio = () => {
      audioManager.init();
      audioManager.setMasterVolume(settings.masterVolume);
      audioManager.setSfxVolume(settings.sfxVolume);
      audioManager.setMusicVolume(settings.musicVolume);
      audioManager.setMuted(settings.muted);
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);

    // Create and initialize game engine
    const engine = new GameEngine();
    engineRef.current = engine;
    setEngineInstance(engine);
    engine.init(containerRef.current, audioManager);

    // Apply initial settings to engine
    const engineSettings = {};
    GameEngineSettings.forEach(key => {
      if (settings[key] !== undefined) {
        engineSettings[key] = settings[key];
      }
    });
    engine.updateSettings(engineSettings);

    // Register callbacks for UI updates
    engine.on('onWeaponChange', setWeapon);
    engine.on('onBannerChange', setBanner);
    engine.on('onLowHealth', setLowHealth);
    engine.on('onHitMarker', setHitMarker);
    engine.on('onFpsUpdate', setFps);
    engine.on('onPauseChange', setPaused);
    engine.on('onRuntimeError', setRuntimeError);
    const offPerf = engine.onEvent?.('PERF_UPDATED', setPerfMetrics);

    engine.on('onGameOver', (data) => {
      setGameOver(true);
      setPlayerStats(prev => {
        const newStats = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          highScore: Math.max(prev.highScore, data.score),
          highestWave: Math.max(prev.highestWave, data.wave)
        };
        saveGameData(newStats, unlockedAchievements, settings);
        return newStats;
      });
    });

    engine.on('onWaveComplete', (wave) => {
      setPlayerStats(prev => {
        const newStats = { ...prev, highestWave: Math.max(prev.highestWave, wave) };
        saveGameData(newStats, unlockedAchievements, settings);
        return newStats;
      });
    });

    // Add keyboard shortcuts for UI menus
    const handleKeyDown = (e) => {
      if (InputBindings.menu.shop.includes(e.code)) { setShopOpen(p => !p); setTurretMenuOpen(false); audioManager.playSound('click'); }
      if (InputBindings.menu.turrets.includes(e.code)) { setTurretMenuOpen(p => !p); setShopOpen(false); audioManager.playSound('click'); }
      if (InputBindings.menu.help.includes(e.code)) { setHelpOpen(p => !p); audioManager.playSound('click'); }
      if (InputBindings.ability.airstrike.includes(e.code)) engine.useAbility('AIRSTRIKE');
      if (InputBindings.ability.freeze.includes(e.code)) engine.useAbility('FREEZE');
      if (InputBindings.ability.rage.includes(e.code)) engine.useAbility('RAGE');
      if (InputBindings.ability.repair.includes(e.code)) engine.useAbility('REPAIR');
      if (InputBindings.camera.cycleMode.includes(e.code)) {
        const modes = ['SHOULDER', 'ISOMETRIC', 'TOPDOWN', 'FIRST_PERSON'];
        const currentMode = cameraModeRef.current;
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        setCameraMode(nextMode);
        engine.setCameraMode(nextMode);
        audioManager.playSound('click');
      }
      if (InputBindings.menu.pause.includes(e.code)) {
        if (placingTurret) { setPlacingTurret(null); engine.cancelTurretPlacement(); }
        else if (settingsOpen) setSettingsOpen(false);
        else if (shopOpen) setShopOpen(false);
        else if (turretMenuOpen) setTurretMenuOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (achievementsOpen) setAchievementsOpen(false);
        else { engine.togglePause(); }
        audioManager.playSound('click');
      }
      // Screenshot
      if (e.code === 'F12' || (e.code === 'KeyP' && e.ctrlKey)) {
        e.preventDefault();
        engine.takeScreenshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('keydown', handleKeyDown);
      offPerf?.();
      engine.dispose();
      audioManager.dispose();
      setEngineInstance(null);
    };
  }, []);

  // Shop items
  const shopItems = [
    { id: 'weaponDamage', name: 'Weapon Damage +15%', desc: 'Increase all weapon damage', icon: '⚔️', cost: 75 + (engineRef.current?.getUpgrades()?.weaponDamage || 0) * 50, max: 5, current: engineRef.current?.getUpgrades()?.weaponDamage || 0, action: () => engineRef.current?.buyUpgrade('weaponDamage', 75 + (engineRef.current?.getUpgrades()?.weaponDamage || 0) * 50) },
    { id: 'fireRate', name: 'Fire Rate +10%', desc: 'Increase fire rate', icon: '🔥', cost: 60 + (engineRef.current?.getUpgrades()?.fireRate || 0) * 40, max: 5, current: engineRef.current?.getUpgrades()?.fireRate || 0, action: () => engineRef.current?.buyUpgrade('fireRate', 60 + (engineRef.current?.getUpgrades()?.fireRate || 0) * 40) },
    { id: 'playerHealth', name: 'Max Health +20', desc: 'Increase maximum health', icon: '❤️', cost: 80 + (engineRef.current?.getUpgrades()?.playerHealth || 0) * 60, max: 5, current: engineRef.current?.getUpgrades()?.playerHealth || 0, action: () => engineRef.current?.buyUpgrade('playerHealth', 80 + (engineRef.current?.getUpgrades()?.playerHealth || 0) * 60) },
    { id: 'houseArmor', name: 'House Armor +10%', desc: 'Reduce damage to doors/windows', icon: '🛡️', cost: 50 + (engineRef.current?.getUpgrades()?.houseArmor || 0) * 30, max: 5, current: engineRef.current?.getUpgrades()?.houseArmor || 0, action: () => engineRef.current?.buyUpgrade('houseArmor', 50 + (engineRef.current?.getUpgrades()?.houseArmor || 0) * 30) },
    { id: 'repair', name: 'Repair House', desc: 'Restore 50% door/window health', icon: '🔧', cost: 50, action: () => engineRef.current?.repairHouse() },
    { id: 'upgradeHouse', name: 'Upgrade House', desc: 'Bigger house with more defenses', icon: '🏠', cost: HouseUpgrades[Object.keys(HouseUpgrades)[(engineRef.current?.getUpgrades()?.houseLevel || 0) + 1]]?.cost || 9999, max: 4, current: engineRef.current?.getUpgrades()?.houseLevel || 0, action: () => engineRef.current?.upgradeHouse() }
  ];

  const placingTurretName = activePlacingTurret ? TurretTypes[activePlacingTurret]?.name : null;
  const handleCycleCamera = useCallback(() => {
    const modes = ['SHOULDER', 'ISOMETRIC', 'TOPDOWN', 'FIRST_PERSON'];
    const currentMode = cameraModeRef.current;
    const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
    setCameraMode(nextMode);
    engineRef.current?.setCameraMode(nextMode);
    audioManager.playSound('click');
  }, []);
  const handleScreenshot = () => {
    engineRef.current?.takeScreenshot();
    audioManager.playSound('click');
  };
  const handleOpenHelp = () => {
    setHelpOpen(true);
    audioManager.playSound('click');
  };
  const handleOpenSettings = () => {
    setSettingsOpen(true);
    audioManager.playSound('click');
  };
  const handleOpenShop = () => {
    setShopOpen(true);
    audioManager.playSound('click');
  };
  const handleOpenTurretMenu = () => {
    setTurretMenuOpen(true);
    audioManager.playSound('click');
  };
  const handleOpenAchievements = () => {
    setAchievementsOpen(true);
    audioManager.playSound('click');
  };
  const handleCloseShop = () => {
    setShopOpen(false);
    audioManager.playSound('click');
  };
  const handleCloseTurretMenu = () => {
    setTurretMenuOpen(false);
    audioManager.playSound('click');
  };
  const handleCloseHelp = () => {
    setHelpOpen(false);
    audioManager.playSound('click');
  };
  const handleCloseAchievements = () => {
    setAchievementsOpen(false);
    audioManager.playSound('click');
  };
  const handleSelectTurret = (key) => {
    engineRef.current?.startTurretPlacement(key);
    setPlacingTurret(key);
    setTurretMenuOpen(false);
  };

  // Start game handler
  const startGame = (endless) => {
    setEndlessMode(endless);
    setStarted(true);
    setGameOver(false);
    setRuntimeError(null);
    engineRef.current?.clearRuntimeError?.();
    engineRef.current?.startGame(endless);
  };

  // Restart handler
  const restartGame = () => {
    setGameOver(false);
    setRuntimeError(null);
    engineRef.current?.clearRuntimeError?.();
    engineRef.current?.startGame(endlessMode);
  };

  const handleCrashReset = () => {
    setRuntimeError(null);
    setGameOver(false);
    setPaused(false);
    setStarted(true);
    engineRef.current?.recoverFromCrash?.();
    engineRef.current?.startGame(endlessMode);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute inset-0" style={uiLayerStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/25 pointer-events-none" />

        {/* HUD - Only show when game started */}
        {started && !gameOver && (
          <Hud
            health={health}
            lowHealth={lowHealth}
            houseIntegrity={houseIntegrity}
            currency={currency}
            isInside={isInside}
            activeWaveNumber={activeWaveNumber}
            endlessMode={endlessMode}
            enemies={enemies}
            score={score}
            showFps={settings.showFps}
            fps={fps}
            cameraMode={cameraMode}
            hitMarker={hitMarker}
            onCycleCamera={handleCycleCamera}
            onScreenshot={handleScreenshot}
            onOpenHelp={handleOpenHelp}
            onOpenSettings={handleOpenSettings}
          />
        )}

        <PerformanceHud
          metrics={perfMetrics}
          isVisible={Boolean(settings.showPerfHud)}
        />

        {/* Action bar */}
        {started && !gameOver && (
          <ActionBar
            weaponTypes={WeaponTypes}
            weapon={weapon}
            onSelectWeapon={(key) => engineRef.current?.setWeapon(key)}
            onOpenTurretMenu={handleOpenTurretMenu}
            onOpenShop={handleOpenShop}
            placingTurretName={placingTurretName}
          />
        )}

        <PlacementFeedback
          feedback={placementFeedback}
          cursor={placementCursor}
          isVisible={Boolean(activePlacingTurret) && started && !gameOver}
          uiScale={uiScale}
        />

        <StatusOverlays
          banner={banner}
          showStartWave={canStartWave && !gameOver && started}
          startWaveLabel={startWaveLabel}
          onStartWave={() => engineRef.current?.startWave()}
        />

        {/* Start screen */}
        {!started && (
          <StartScreen
            highScore={highScore}
            playerStats={playerStats}
            unlockedCount={unlockedAchievements.length}
            achievementCount={Object.keys(Achievements).length}
            controlsHint={StartScreenHint}
            onStartGame={startGame}
            onOpenAchievements={handleOpenAchievements}
          />
        )}

        {/* Shop modal */}
        {shopOpen && (
          <ShopMenu
            currency={currency}
            shopItems={shopItems}
            onClose={handleCloseShop}
          />
        )}

        {/* Turret menu */}
        {turretMenuOpen && (
          <TurretMenu
            currency={currency}
            turretTypes={TurretTypes}
            onSelectTurret={handleSelectTurret}
            onClose={handleCloseTurretMenu}
          />
        )}

        {/* Settings modal */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSettingChange={updateSetting}
          onBatchSettingChange={updateBatchSettings}
          onPlaySound={(sound) => audioManager.playSound(sound)}
        />

        {/* Achievements modal */}
        {achievementsOpen && (
          <AchievementsModal
            achievements={Achievements}
            unlockedAchievements={unlockedAchievements}
            onClose={handleCloseAchievements}
          />
        )}

        {/* Help modal */}
        {helpOpen && (
          <HelpModal
            controls={ControlHelp}
            abilities={AbilityHelp}
            onClose={handleCloseHelp}
          />
        )}

        <CrashOverlay
          runtimeError={runtimeError}
          onReset={handleCrashReset}
          onReload={() => window.location.reload()}
        />

        <PauseOverlay
          isVisible={paused && !settingsOpen && !shopOpen && !turretMenuOpen && !helpOpen && !achievementsOpen}
          onResume={() => engineRef.current?.togglePause()}
          onOpenSettings={handleOpenSettings}
          onOpenHelp={handleOpenHelp}
          onQuitToMenu={() => { setStarted(false); setPaused(false); audioManager.stopMusic(); audioManager.playSound('click'); }}
        />

        <GameOverOverlay
          isVisible={gameOver}
          score={score}
          highScore={highScore}
          activeWaveNumber={activeWaveNumber}
          endlessMode={endlessMode}
          onRestart={restartGame}
          onOpenAchievements={handleOpenAchievements}
          onMainMenu={() => { setGameOver(false); setStarted(false); audioManager.playSound('click'); }}
        />
      </div>
    </div>
  );
}
