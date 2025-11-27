/**
 * TurkeyTrotDefense - Refactored React Component
 *
 * This component only handles UI overlay and instantiates the GameEngine.
 * All game logic is in src/engine/GameEngine.js
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import {
  GameEngine,
  WeaponTypes,
  TurkeyTypes,
  HouseUpgrades,
  TurretTypes,
  AbilityTypes
} from './engine/GameEngine.js';
import { Achievements } from './engine/GameConfig.js';

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
        case 'gobble': this.synths.gobble.triggerAttackRelease(200 + Math.random() * 100, '8n', t); break;
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
const SAVE_KEY = 'turkeyTrotDefense_saveData';

const getDefaultSaveData = () => ({
  playerStats: {
    totalKills: 0, bossKills: 0, highestWave: 0, maxCurrency: 0,
    turretsPlaced: 0, abilitiesUsed: 0, clutchWins: 0, fastWave10: false,
    endlessHighWave: 0, perfectWaves: 0, gamesPlayed: 0, highScore: 0
  },
  unlockedAchievements: [],
  settings: {
    masterVolume: 0.7, sfxVolume: 0.8, musicVolume: 0.5,
    muted: false, showFps: false, showMinimap: true
  },
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
export default function TurkeyTrotDefense() {
  // Container ref for Three.js
  const containerRef = useRef(null);
  const engineRef = useRef(null);

  // Load persistent data
  const saveData = useRef(loadSaveData());

  // UI State
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [endlessMode, setEndlessMode] = useState(false);

  // Game stats (updated via engine callbacks)
  const [stats, setStats] = useState({ health: 100, currency: 100, wave: 0, enemies: 0, score: 0, houseIntegrity: 100, isInside: false });
  const [weapon, setWeapon] = useState(WeaponTypes.PITCHFORK);
  const [banner, setBanner] = useState('');
  const [waitingForNextWave, setWaitingForNextWave] = useState(false);
  const [placingTurret, setPlacingTurret] = useState(null);
  const [lowHealth, setLowHealth] = useState(false);
  const [hitMarker, setHitMarker] = useState(null);
  const [fps, setFps] = useState(60);

  // Menu states
  const [shopOpen, setShopOpen] = useState(false);
  const [turretMenuOpen, setTurretMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('ISOMETRIC');

  // Persistent stats
  const [playerStats, setPlayerStats] = useState(saveData.current.playerStats);
  const [unlockedAchievements, setUnlockedAchievements] = useState(saveData.current.unlockedAchievements);
  const [settings, setSettings] = useState(saveData.current.settings);
  const highScore = playerStats.highScore;

  // Update setting and save
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key === 'masterVolume') audioManager.setMasterVolume(value);
      if (key === 'sfxVolume') audioManager.setSfxVolume(value);
      if (key === 'musicVolume') audioManager.setMusicVolume(value);
      if (key === 'muted') audioManager.setMuted(value);
      saveGameData(playerStats, unlockedAchievements, newSettings);
      return newSettings;
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
    engine.init(containerRef.current, audioManager);

    // Register callbacks for UI updates
    engine.on('onStatsUpdate', setStats);
    engine.on('onWeaponChange', setWeapon);
    engine.on('onBannerChange', setBanner);
    engine.on('onWaitingForWave', setWaitingForNextWave);
    engine.on('onLowHealth', setLowHealth);
    engine.on('onHitMarker', setHitMarker);
    engine.on('onFpsUpdate', setFps);
    engine.on('onPauseChange', setPaused);

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
      if (e.code === 'KeyB') { setShopOpen(p => !p); setTurretMenuOpen(false); audioManager.playSound('click'); }
      if (e.code === 'KeyT') { setTurretMenuOpen(p => !p); setShopOpen(false); audioManager.playSound('click'); }
      if (e.code === 'KeyQ') engine.useAbility('AIRSTRIKE');
      if (e.code === 'KeyX') engine.useAbility('FREEZE');
      if (e.code === 'KeyR') engine.useAbility('RAGE');
      if (e.code === 'KeyF') engine.useAbility('REPAIR');
      if (e.code === 'KeyC') {
        const modes = ['ISOMETRIC', 'TOPDOWN', 'FIRST_PERSON'];
        const nextMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
        setCameraMode(nextMode);
        engine.setCameraMode(nextMode);
        audioManager.playSound('click');
      }
      if (e.code === 'Escape') {
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
      engine.dispose();
      audioManager.dispose();
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

  const weaponKeys = Object.keys(WeaponTypes);

  // Start game handler
  const startGame = (endless) => {
    setEndlessMode(endless);
    setStarted(true);
    setGameOver(false);
    engineRef.current?.startGame(endless);
  };

  // Restart handler
  const restartGame = () => {
    setGameOver(false);
    engineRef.current?.startGame(endlessMode);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* HUD - Only show when game started */}
      {started && !gameOver && (
        <>
          {/* Top HUD */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            {/* Left stats */}
            <div className="bg-black/60 backdrop-blur rounded-xl p-4 space-y-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xl">❤️</span>
                <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${lowHealth ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} style={{ width: `${stats.health}%` }} />
                </div>
                <span className="text-white text-sm">{stats.health}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl">🌽</span>
                <span className="text-yellow-400 font-bold">{stats.currency}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xl">🏠</span>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 transition-all" style={{ width: `${stats.houseIntegrity}%` }} />
                </div>
                <span className="text-white text-xs">{stats.houseIntegrity}%</span>
              </div>
              {stats.isInside && <div className="text-green-400 text-xs font-bold">INSIDE HOUSE</div>}
            </div>

            {/* Center wave info */}
            <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-3 text-center">
              <div className="text-orange-400 font-bold text-lg">Wave {stats.wave}</div>
              <div className="text-gray-400 text-sm">{stats.enemies} enemies</div>
              <div className="text-white text-sm">Score: {stats.score}</div>
            </div>

            {/* Right buttons */}
            <div className="flex gap-2 pointer-events-auto">
              <button onClick={() => { setHelpOpen(true); audioManager.playSound('click'); }} className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition">❓</button>
              <button onClick={() => { setSettingsOpen(true); audioManager.playSound('click'); }} className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition">⚙️</button>
              {settings.showFps && <div className="bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-green-400 text-sm">{fps} FPS</div>}
            </div>
          </div>

          {/* Hit marker */}
          {hitMarker && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className={`text-4xl ${hitMarker === 'kill' ? 'text-red-500' : 'text-white'}`}>✕</div>
            </div>
          )}

          {/* Camera mode indicator */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/40 rounded-lg px-3 py-1 text-gray-400 text-xs pointer-events-none">
            {cameraMode} (C to change)
          </div>
        </>
      )}

      {/* Weapon bar */}
      {started && !gameOver && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {weaponKeys.map((key, i) => {
            const wp = WeaponTypes[key];
            const isActive = weapon.name === wp.name;
            return (
              <button key={key} onClick={() => engineRef.current?.setWeapon(key)}
                className={`relative bg-black/70 backdrop-blur rounded-xl p-3 transition-all ${isActive ? 'ring-2 ring-yellow-400 scale-110 bg-black/90' : 'hover:bg-black/80'}`}>
                <div className="text-2xl">{wp.icon}</div>
                <div className={`text-xs ${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>{i + 1}</div>
                {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />}
              </button>
            );
          })}
          <div className="w-px bg-gray-600 mx-1" />
          <button onClick={() => { setTurretMenuOpen(true); audioManager.playSound('click'); }}
            className="bg-black/70 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition">
            <div className="text-2xl">🗼</div>
            <div className="text-xs text-gray-400">T</div>
          </button>
          <button onClick={() => { setShopOpen(true); audioManager.playSound('click'); }}
            className="bg-black/70 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition">
            <div className="text-2xl">🛒</div>
            <div className="text-xs text-gray-400">B</div>
          </button>
        </div>
      )}

      {/* Current weapon info */}
      {started && !gameOver && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-center pointer-events-none">
          <div className="text-white font-bold">{weapon.name}</div>
          <div className="text-gray-400 text-xs">{weapon.description}</div>
        </div>
      )}

      {/* Placing turret indicator */}
      {placingTurret && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-green-600/80 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
          Click to place {TurretTypes[placingTurret]?.name} - Right-click or ESC to cancel
        </div>
      )}

      {/* Banner */}
      {banner && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className={`text-5xl font-black text-white text-center drop-shadow-lg animate-bounce ${banner.includes('BOSS') ? 'text-red-500' : banner.includes('Complete') ? 'text-green-400' : ''}`}
            style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,100,0.5)' }}>
            {banner}
          </div>
        </div>
      )}

      {/* Next Wave Button */}
      {waitingForNextWave && !gameOver && started && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <button onClick={() => engineRef.current?.startWave()}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold px-10 py-5 rounded-xl hover:scale-110 transition-all shadow-2xl animate-pulse">
            Start Wave {stats.wave + 1}
          </button>
        </div>
      )}

      {/* Start screen */}
      {!started && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🦃🏠🔱</div>
          <h1 className="text-5xl font-black text-white mb-2" style={{ textShadow: '0 0 20px rgba(255,100,0,0.8)' }}>Turkey Trot Defense</h1>
          <p className="text-gray-400 mb-4 text-lg">Defend your barn from the turkey invasion!</p>

          <div className="bg-black/50 rounded-xl px-6 py-3 mb-6 flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-yellow-400 font-bold text-xl">{highScore}</div>
              <div className="text-gray-500">High Score</div>
            </div>
            <div className="text-center">
              <div className="text-orange-400 font-bold text-xl">{playerStats.highestWave}</div>
              <div className="text-gray-500">Best Wave</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 font-bold text-xl">{playerStats.totalKills}</div>
              <div className="text-gray-500">Total Kills</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 font-bold text-xl">{playerStats.gamesPlayed}</div>
              <div className="text-gray-500">Games</div>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button onClick={() => startGame(false)}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg">
              Normal Mode
            </button>
            <button onClick={() => startGame(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg">
              Endless Mode
            </button>
          </div>

          <div className="text-gray-500 text-sm mb-4">
            WASD: Move - Mouse: Aim/Shoot - 1-4: Weapons - Q/E/R/F: Abilities
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setAchievementsOpen(true); audioManager.playSound('click'); }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition">
              Achievements ({unlockedAchievements.length}/{Object.keys(Achievements).length})
            </button>
          </div>
        </div>
      )}

      {/* Shop modal */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Shop</h2>
              <div className="text-yellow-400 font-bold">{stats.currency}</div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {shopItems.map(item => {
                const canAfford = stats.currency >= item.cost;
                const maxed = item.max !== undefined && item.current >= item.max;
                return (
                  <button key={item.id} onClick={() => { if (canAfford && !maxed) item.action(); }} disabled={!canAfford || maxed}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${maxed ? 'bg-gray-800 opacity-50' : canAfford ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 opacity-50'}`}>
                    <span className="text-3xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-white font-bold">{item.name}</div>
                      <div className="text-gray-400 text-sm">{item.desc}</div>
                    </div>
                    <div className={`font-bold ${maxed ? 'text-green-400' : canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                      {maxed ? 'MAX' : item.cost}
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setShopOpen(false); audioManager.playSound('click'); }}
              className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition">Close (B or ESC)</button>
          </div>
        </div>
      )}

      {/* Turret menu */}
      {turretMenuOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Turrets</h2>
              <div className="text-yellow-400 font-bold">{stats.currency}</div>
            </div>
            <div className="space-y-3">
              {Object.entries(TurretTypes).map(([key, turret]) => {
                const canAfford = stats.currency >= turret.cost;
                return (
                  <button key={key} onClick={() => { if (canAfford) { engineRef.current?.startTurretPlacement(key); setPlacingTurret(key); setTurretMenuOpen(false); } }}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${canAfford ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 opacity-50'}`}>
                    <span className="text-3xl">{turret.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-white font-bold">{turret.name}</div>
                      <div className="text-gray-400 text-sm">{turret.description}</div>
                      <div className="text-gray-500 text-xs">DMG: {turret.damage} - Range: {turret.range} - Rate: {turret.fireRate}/s</div>
                    </div>
                    <div className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>{turret.cost}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setTurretMenuOpen(false); audioManager.playSound('click'); }}
              className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition">Close (T or ESC)</button>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm block mb-2">Master Volume</label>
                <input type="range" min="0" max="1" step="0.1" value={settings.masterVolume} onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-white text-sm block mb-2">SFX Volume</label>
                <input type="range" min="0" max="1" step="0.1" value={settings.sfxVolume} onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-white text-sm block mb-2">Music Volume</label>
                <input type="range" min="0" max="1" step="0.1" value={settings.musicVolume} onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))} className="w-full" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Mute All</span>
                <button onClick={() => updateSetting('muted', !settings.muted)} className={`px-4 py-2 rounded-lg transition ${settings.muted ? 'bg-red-500' : 'bg-green-500'}`}>
                  {settings.muted ? 'Muted' : 'On'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Show FPS</span>
                <button onClick={() => updateSetting('showFps', !settings.showFps)} className={`px-4 py-2 rounded-lg transition ${settings.showFps ? 'bg-green-500' : 'bg-gray-600'}`}>
                  {settings.showFps ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            <button onClick={() => { setSettingsOpen(false); audioManager.playSound('click'); }}
              className="w-full mt-6 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition">Close (ESC)</button>
          </div>
        </div>
      )}

      {/* Achievements modal */}
      {achievementsOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4">Achievements ({unlockedAchievements.length}/{Object.keys(Achievements).length})</h2>
            <div className="space-y-2 overflow-y-auto flex-1">
              {Object.entries(Achievements).map(([key, ach]) => {
                const unlocked = unlockedAchievements.includes(key);
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${unlocked ? 'bg-yellow-900/30' : 'bg-gray-800/50'}`}>
                    <span className={`text-3xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{ach.icon}</span>
                    <div className="flex-1">
                      <div className={`font-bold ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>{ach.name}</div>
                      <div className={`text-sm ${unlocked ? 'text-gray-300' : 'text-gray-600'}`}>{ach.description}</div>
                    </div>
                    {unlocked && <span className="text-green-400">✓</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => { setAchievementsOpen(false); audioManager.playSound('click'); }}
              className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition">Close</button>
          </div>
        </div>
      )}

      {/* Help modal */}
      {helpOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">How to Play</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">Objective</h3>
                <p>Survive the turkey invasion! Hide in your house for protection, but they can break in!</p>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">Controls</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-white">WASD</span> - Move</p>
                  <p><span className="text-white">Mouse</span> - Aim & Shoot</p>
                  <p><span className="text-white">E</span> - Enter/Exit house</p>
                  <p><span className="text-white">1-4</span> - Switch weapons</p>
                  <p><span className="text-white">Q/X/R/F</span> - Use abilities</p>
                  <p><span className="text-white">T</span> - Turret menu</p>
                  <p><span className="text-white">B</span> - Shop</p>
                  <p><span className="text-white">C</span> - Cycle camera mode</p>
                </div>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">Abilities</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-white">Q - Turkey Bomb</span> - Airstrike at cursor</p>
                  <p><span className="text-white">X - Frost Nova</span> - Freeze all enemies</p>
                  <p><span className="text-white">R - Harvest Rage</span> - 2x damage & fire rate</p>
                  <p><span className="text-white">F - Emergency Repair</span> - Repair doors/windows</p>
                </div>
              </div>
            </div>
            <button onClick={() => { setHelpOpen(false); audioManager.playSound('click'); }}
              className="w-full mt-6 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition">Got it!</button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !settingsOpen && !shopOpen && !turretMenuOpen && !helpOpen && !achievementsOpen && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
          <div className="text-5xl font-black text-white mb-8">PAUSED</div>
          <div className="space-y-3">
            <button onClick={() => engineRef.current?.togglePause()}
              className="block w-48 bg-green-600 text-white py-3 rounded-lg hover:bg-green-500 transition text-lg font-bold">Resume</button>
            <button onClick={() => { setSettingsOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg">Settings</button>
            <button onClick={() => { setHelpOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg">Help</button>
            <button onClick={() => { setStarted(false); setPaused(false); audioManager.stopMusic(); audioManager.playSound('click'); }}
              className="block w-48 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition text-lg">Quit to Menu</button>
          </div>
        </div>
      )}

      {/* Game over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
          <div className="text-6xl mb-4">💀🦃</div>
          <h1 className="text-5xl font-black text-red-500 mb-2">GAME OVER</h1>
          {stats.score >= highScore && stats.score > 0 && (
            <div className="text-2xl text-yellow-400 font-bold mb-2 animate-pulse">NEW HIGH SCORE!</div>
          )}
          <div className="text-3xl text-white mb-2">Score: {stats.score}</div>
          {highScore > 0 && stats.score < highScore && (
            <div className="text-lg text-gray-500 mb-2">High Score: {highScore}</div>
          )}
          <div className="text-xl text-gray-400 mb-2">Wave {stats.wave} {endlessMode && '(Endless)'}</div>
          <div className="space-y-3 mt-6">
            <button onClick={restartGame}
              className="block w-48 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:scale-105 transition text-lg font-bold">Play Again</button>
            <button onClick={() => { setAchievementsOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition">Achievements</button>
            <button onClick={() => { setGameOver(false); setStarted(false); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition">Main Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
