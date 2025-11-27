import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as Tone from 'tone';

// ============================================================================
// PHASE 5: ADVANCED GAMEPLAY SYSTEMS
// ============================================================================
// New Features:
// - Placeable defensive turrets (3 types)
// - Special abilities with cooldowns (4 abilities)
// - Tactical mini-map
// - Achievement system with unlocks
// - Endless survival mode
// - Enhanced boss mechanics with phases
// - Resource nodes that spawn currency
// - Environmental hazards
// ============================================================================

// =========================
// WEAPON DEFINITIONS
// =========================
const WeaponTypes = {
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

// =========================
// TURKEY DEFINITIONS
// =========================
const TurkeyTypes = {
  STANDARD: { name: 'Turkey', hp: 35, speed: 1.0, damage: 8, value: 10, scale: 1.0, body: 0x8b4513, head: 0xdc143c },
  RUNNER: { name: 'Runner', hp: 22, speed: 1.8, damage: 6, value: 12, scale: 0.8, body: 0x654321, head: 0xff4500 },
  TANK: { name: 'Tank', hp: 120, speed: 0.6, damage: 20, value: 30, scale: 1.4, body: 0x4a3728, head: 0x8b0000 },
  HEALER: { name: 'Healer', hp: 40, speed: 0.9, damage: 5, value: 20, scale: 0.9, body: 0x2e8b57, head: 0x90ee90, heals: true },
  SPLITTER: { name: 'Splitter', hp: 60, speed: 1.0, damage: 12, value: 25, scale: 1.1, body: 0x4b0082, head: 0x9400d3, splits: true },
  BOSS: { name: 'Boss', hp: 800, speed: 0.5, damage: 40, value: 200, scale: 2.2, body: 0x2d1f14, head: 0x660000, phases: 3 }
};

// =========================
// TURRET DEFINITIONS
// =========================
const TurretTypes = {
  BASIC: {
    name: 'Scarecrow Turret', icon: '🧑‍🌾', cost: 100,
    damage: 15, fireRate: 1.5, range: 8, color: 0xdaa520,
    description: 'Basic auto-targeting turret'
  },
  SLOW: {
    name: 'Frost Sprinkler', icon: '❄️', cost: 150,
    damage: 5, fireRate: 2.0, range: 6, slow: 0.5, slowDuration: 2, color: 0x88ccff,
    description: 'Slows enemies in range'
  },
  EXPLOSIVE: {
    name: 'Corn Silo', icon: '🌾', cost: 200,
    damage: 40, fireRate: 0.5, range: 10, splash: 3, color: 0xffd700,
    description: 'Explosive area damage'
  }
};

// =========================
// ABILITY DEFINITIONS
// =========================
const AbilityTypes = {
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
    description: 'Instantly restore 50% barn health',
    healPercent: 0.5
  }
};

// =========================
// ACHIEVEMENT DEFINITIONS
// =========================
const Achievements = {
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
    this.minInterval = 0.05; // Minimum 50ms between same sound
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

  playSound(type, options = {}) {
    if (!this.initialized || this.muted) return;

    // Throttle sounds to prevent rapid-fire errors
    const now = Tone.now();
    const lastTime = this.lastPlayTime[type] || 0;
    if (now - lastTime < this.minInterval) return;
    this.lastPlayTime[type] = now;

    try {
      const t = now + 0.01; // Small offset to ensure valid timing
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
    } catch (e) {
      // Silently ignore audio errors to prevent game crashes
    }
  }

  setMasterVolume(v) { this.masterVolume = v; if (this.masterGain) this.masterGain.gain.value = v; }
  setSfxVolume(v) { this.sfxVolume = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVolume(v) { this.musicVolume = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setMuted(m) { this.muted = m; if (m) this.stopMusic(); else if (this.initialized) this.startMusic(); }
  dispose() { this.stopMusic(); Tone.Transport.stop(); Object.values(this.synths).forEach(s => s?.dispose()); this.bassSynth?.dispose(); this.melodySynth?.dispose(); this.musicLoop?.dispose(); }
}

const audioManager = new AudioManager();

// =========================
// MAIN GAME COMPONENT
// =========================
export default function TurkeyTrotDefensePhase5() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const stateRef = useRef(null);
  const unlockedAchievementsRef = useRef(new Set());
  const achievementQueueRef = useRef([]);
  const isShowingAchievementRef = useRef(false);

  // Core game state
  const [stats, setStats] = useState({ health: 100, currency: 100, wave: 0, enemies: 0, score: 0 });
  const [weapon, setWeapon] = useState(WeaponTypes.PITCHFORK);
  const [banner, setBanner] = useState('');
  const [started, setStarted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [lowHealth, setLowHealth] = useState(false);
  const [hitMarker, setHitMarker] = useState(null);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [fps, setFps] = useState(60);
  const [waitingForNextWave, setWaitingForNextWave] = useState(false);

  // Phase 5: New state
  const [placingTurret, setPlacingTurret] = useState(null);
  const placingTurretRef = useRef(null); // Ref to access current value in event handlers
  const [turrets, setTurrets] = useState([]);
  const [abilities, setAbilities] = useState({
    AIRSTRIKE: { cooldown: 0, active: false },
    FREEZE: { cooldown: 0, active: false, remaining: 0 },
    RAGE: { cooldown: 0, active: false, remaining: 0 },
    REPAIR: { cooldown: 0, active: false }
  });
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [gameMode, setGameMode] = useState('normal'); // 'normal' or 'endless'
  const [endlessMode, setEndlessMode] = useState(false);
  const [turretMenuOpen, setTurretMenuOpen] = useState(false);

  // Persistent stats for achievements
  const [playerStats, setPlayerStats] = useState({
    totalKills: 0, bossKills: 0, highestWave: 0, maxCurrency: 0,
    turretsPlaced: 0, abilitiesUsed: 0, clutchWins: 0, fastWave10: false,
    endlessHighWave: 0, perfectWaves: 0, gamesPlayed: 0
  });

  // Settings
  const [settings, setSettings] = useState({
    masterVolume: 0.7, sfxVolume: 0.8, musicVolume: 0.5,
    muted: false, showFps: false, showMinimap: true
  });

  const [cameraMode, setCameraMode] = useState('ISOMETRIC'); // ISOMETRIC, TOPDOWN, FIRST_PERSON
  const [pointerLocked, setPointerLocked] = useState(false);
  const cameraModeRef = useRef('ISOMETRIC');
  const [zoom, setZoom] = useState(1.0);
  const zoomRef = useRef(1.0);
  const cameraAngleRef = useRef(0); // Rotation angle in radians
  const panOffsetRef = useRef(new THREE.Vector3()); // Manual camera pan offset

  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);


  // Upgrades
  const [upgrades, setUpgrades] = useState({
    barnArmor: 0, weaponDamage: 0, fireRate: 0, maxHealth: 0
  });

  // Show next achievement from queue
  const showNextAchievement = useCallback(() => {
    if (achievementQueueRef.current.length === 0) {
      isShowingAchievementRef.current = false;
      return;
    }
    isShowingAchievementRef.current = true;
    const key = achievementQueueRef.current.shift();
    const ach = Achievements[key];
    if (ach) {
      setNewAchievement(ach);
      audioManager.playSound('achievement');
      setTimeout(() => {
        setNewAchievement(null);
        setTimeout(showNextAchievement, 500);
      }, 3000);
    }
  }, []);

  // Check achievements
  const checkAchievements = useCallback((newStats) => {
    const newUnlocks = [];
    Object.entries(Achievements).forEach(([key, ach]) => {
      if (!unlockedAchievementsRef.current.has(key) && ach.check(newStats)) {
        unlockedAchievementsRef.current.add(key);
        newUnlocks.push(key);
      }
    });
    if (newUnlocks.length > 0) {
      setUnlockedAchievements(Array.from(unlockedAchievementsRef.current));
      achievementQueueRef.current.push(...newUnlocks);
      if (!isShowingAchievementRef.current) {
        showNextAchievement();
      }
    }
  }, [showNextAchievement]);

  // Update player stats
  const updatePlayerStats = useCallback((updates) => {
    setPlayerStats(prev => {
      const newStats = { ...prev, ...updates };
      if (updates.currency !== undefined) newStats.maxCurrency = Math.max(prev.maxCurrency, updates.currency);
      if (updates.wave !== undefined) {
        if (endlessMode) newStats.endlessHighWave = Math.max(prev.endlessHighWave, updates.wave);
        else newStats.highestWave = Math.max(prev.highestWave, updates.wave);
      }
      checkAchievements(newStats);
      return newStats;
    });
  }, [checkAchievements, endlessMode]);

  // Audio init
  const initAudio = useCallback(async () => {
    await audioManager.init();
    audioManager.setMasterVolume(settings.masterVolume);
    audioManager.setSfxVolume(settings.sfxVolume);
    audioManager.setMusicVolume(settings.musicVolume);
    audioManager.setMuted(settings.muted);
    if (!settings.muted) audioManager.startMusic();
  }, [settings]);

  // Settings handler
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key === 'masterVolume') audioManager.setMasterVolume(value);
      if (key === 'sfxVolume') audioManager.setSfxVolume(value);
      if (key === 'musicVolume') audioManager.setMusicVolume(value);
      if (key === 'muted') audioManager.setMuted(value);
      return newSettings;
    });
  }, []);

  // Use ability
  const useAbility = useCallback((abilityKey) => {
    const ability = AbilityTypes[abilityKey];
    const state = stateRef.current;
    if (!state || abilities[abilityKey].cooldown > 0) return;

    audioManager.playSound('ability');
    updatePlayerStats({ abilitiesUsed: playerStats.abilitiesUsed + 1 });

    setAbilities(prev => ({
      ...prev,
      [abilityKey]: { ...prev[abilityKey], cooldown: ability.cooldown, active: ability.duration > 0, remaining: ability.duration }
    }));

    switch (abilityKey) {
      case 'AIRSTRIKE':
        if (state.aim) {
          state.pendingAirstrike = state.aim.clone();
        }
        break;
      case 'FREEZE':
        state.globalFreeze = ability.duration;
        audioManager.playSound('freeze');
        break;
      case 'RAGE':
        state.rageActive = ability.duration;
        break;
      case 'REPAIR':
        state.barn.health = Math.min(state.barn.maxHealth, state.barn.health + state.barn.maxHealth * ability.healPercent);
        break;
    }
  }, [abilities, playerStats.abilitiesUsed, updatePlayerStats]);

  // Main game effect
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, 110);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 32, 40);
    camera.lookAt(0, 0, 0);
    const baseCamPos = new THREE.Vector3(0, 32, 40);
    const topDownPos = new THREE.Vector3(0, 60, 0);

    // Camera offsets for smooth following
    const cameraOffset = new THREE.Vector3();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffeedd, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
    sun.shadow.camera.right = sun.shadow.camera.top = 50;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0xff9966, 0.25).translateX(-25).translateY(15));
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x5a4a3a, 0.35));

    // Ground
    const groundGeo = new THREE.PlaneGeometry(150, 150, 40, 40);
    const positions = groundGeo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] = Math.sin(positions[i] * 0.08) * Math.cos(positions[i + 1] * 0.08) * 0.4;
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x4a7c23, roughness: 0.92 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Path indicators (rings around barn)
    [8, 16, 24].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.1, r + 0.1, 64),
        new THREE.MeshBasicMaterial({ color: [0x88ff88, 0xffff88, 0xff8888][i], transparent: true, opacity: 0.15, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      scene.add(ring);
    });

    // Falling leaves
    const leafCount = 50;
    const leafGeo = new THREE.BufferGeometry();
    const leafPositions = new Float32Array(leafCount * 3);
    const leafColors = new Float32Array(leafCount * 3);
    const leafData = [];
    const leafColorOptions = [0xcc6633, 0xdd8844, 0xbb5522, 0xee9955];
    for (let i = 0; i < leafCount; i++) {
      leafPositions[i * 3] = (Math.random() - 0.5) * 80;
      leafPositions[i * 3 + 1] = Math.random() * 25 + 5;
      leafPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      const col = new THREE.Color(leafColorOptions[Math.floor(Math.random() * leafColorOptions.length)]);
      leafColors[i * 3] = col.r; leafColors[i * 3 + 1] = col.g; leafColors[i * 3 + 2] = col.b;
      leafData.push({ fallSpeed: 0.5 + Math.random() * 0.8, swaySpeed: 1 + Math.random() * 2, swayAmt: 0.5 + Math.random() * 1.5, rot: Math.random() * 6.28 });
    }
    leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
    leafGeo.setAttribute('color', new THREE.BufferAttribute(leafColors, 3));
    const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.85 }));
    scene.add(leaves);

    // Barn
    const barnBase = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4, 7), new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.85 }));
    barnBase.position.set(0, 2, 0);
    barnBase.castShadow = barnBase.receiveShadow = true;
    scene.add(barnBase);
    const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.8, 4), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8, metalness: 0.2 }));
    barnRoof.position.set(0, 5.4, 0);
    barnRoof.rotation.y = Math.PI / 4;
    barnRoof.castShadow = true;
    scene.add(barnRoof);
    const barnDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }));
    barnDoor.position.set(0, 1.25, 3.51);
    scene.add(barnDoor);
    [-1.8, 1.8].forEach(x => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.3 }));
      win.position.set(x, 2.8, 3.51);
      scene.add(win);
    });

    // Player
    const playerGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4169e1, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.6, 10), bodyMat);
    torso.position.y = 0.7; torso.castShadow = true; playerGroup.add(torso);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.4, 10), bodyMat);
    legs.position.y = 0.2; legs.castShadow = true; playerGroup.add(legs);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
    head.position.y = 1.22; head.castShadow = true; playerGroup.add(head);
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 }));
    hatBrim.position.y = 1.42; playerGroup.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 }));
    hatTop.position.y = 1.52; playerGroup.add(hatTop);
    playerGroup.position.set(0, 0, 10);
    scene.add(playerGroup);

    // Turret placement preview
    const turretPreview = new THREE.Group();
    const previewBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 12), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 }));
    const previewRange = new THREE.Mesh(new THREE.RingGeometry(0, 8, 32), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    previewRange.rotation.x = -Math.PI / 2;
    previewRange.position.y = 0.01;
    turretPreview.add(previewBase, previewRange);
    turretPreview.visible = false;
    scene.add(turretPreview);

    // Particle system
    const particles = [];
    const particleGeo = new THREE.BufferGeometry();
    const maxParticles = 500;
    const pPositions = new Float32Array(maxParticles * 3);
    const pColors = new Float32Array(maxParticles * 3);
    const pSizes = new Float32Array(maxParticles);
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
    const particleSystem = new THREE.Points(particleGeo, new THREE.PointsMaterial({ size: 0.25, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true }));
    scene.add(particleSystem);

    const emitParticles = (pos, count, color, spread, life) => {
      const col = new THREE.Color(color);
      for (let i = 0; i < count && particles.length < maxParticles; i++) {
        particles.push({
          pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
          vel: new THREE.Vector3((Math.random() - 0.5) * spread.x, Math.random() * spread.y, (Math.random() - 0.5) * spread.z),
          color: col.clone(), life, maxLife: life, size: 0.15 + Math.random() * 0.2
        });
      }
    };

    // Game state
    const state = {
      started: false, gameOver: false, paused: false, endlessMode: false,
      player: { pos: new THREE.Vector3(0, 0, 10), rot: 0, pitch: 0 },
      barn: { health: 175, maxHealth: 175, pos: new THREE.Vector3(0, 0, 0) },
      turkeys: [], projectiles: [], turrets: [], turretProjectiles: [],
      wave: 0, toSpawn: 0, spawnTimer: 0, currency: 100, score: 0,
      currentWeapon: 'PITCHFORK', lastFire: 0, shootTimer: 0,
      input: { w: false, a: false, s: false, d: false, firing: false, panUp: false, panDown: false, panLeft: false, panRight: false },
      aim: new THREE.Vector3(), shakeIntensity: 0, shakeDuration: 0,
      pointerLocked: false,
      waveComplete: false, waveComp: {}, waveStartHealth: 175,
      waveTransitionTimer: 0, waveTransitionDelay: 0,
      globalFreeze: 0, rageActive: 0, pendingAirstrike: null,
      gameStartTime: 0, waveStartTime: 0,
      upgrades: { barnArmor: 0, weaponDamage: 0, fireRate: 0, maxHealth: 0 }
    };
    stateRef.current = state;

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const spawnedCounts = { STANDARD: 0, RUNNER: 0, TANK: 0, HEALER: 0, SPLITTER: 0, BOSS: 0 };

    // Create turkey
    const createTurkey = (pos, type, scale = null) => {
      const stats = TurkeyTypes[type];
      const g = new THREE.Group();
      const s = scale || stats.scale;

      const bodyGeo = new THREE.SphereGeometry(0.5, 14, 10);
      bodyGeo.scale(1.1, 0.85, 1.2);
      const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: stats.body, roughness: 0.9 }));
      bodyMesh.position.y = 0.5; bodyMesh.scale.setScalar(s); bodyMesh.castShadow = true;
      g.add(bodyMesh);

      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: stats.head, roughness: 0.6 }));
      headMesh.position.set(0, 0.7, 0.45); headMesh.scale.setScalar(s);
      g.add(headMesh);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0xffa500 }));
      beak.position.set(0, 0.68, 0.65); beak.rotation.x = Math.PI / 2; beak.scale.setScalar(s);
      g.add(beak);

      const tailGroup = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.4), new THREE.MeshStandardMaterial({ color: i % 2 ? stats.body : 0x654321, side: THREE.DoubleSide, roughness: 0.95 }));
        feather.position.set(0, 0.65, -0.35); feather.rotation.y = (i - 3) * 0.2; feather.rotation.x = -0.4;
        tailGroup.add(feather);
      }
      tailGroup.scale.setScalar(s);
      g.add(tailGroup);

      // Type-specific visuals
      if (type === 'TANK') {
        const armor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.7), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 }));
        armor.position.set(0, 0.65 * s, 0); g.add(armor);
      }
      if (type === 'BOSS') {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2, emissive: 0xffd700, emissiveIntensity: 0.2 }));
        crown.position.set(0, 0.95 * s, 0.35 * s); g.add(crown);
      }
      if (type === 'HEALER') {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ff00, emissiveIntensity: 0.5 }));
        cross.position.set(0, 0.9 * s, 0); g.add(cross);
        const crossV = cross.clone(); crossV.rotation.z = Math.PI / 2; g.add(crossV);
      }
      if (type === 'SPLITTER') {
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), new THREE.MeshBasicMaterial({ color: 0x9400d3, transparent: true, opacity: 0.3 }));
        glow.position.y = 0.5; glow.scale.setScalar(s); g.add(glow);
      }
      if (type === 'RUNNER') {
        [-0.08, 0.08].forEach(x => {
          const lens = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }));
          lens.position.set(x * s, 0.75 * s, 0.48 * s); g.add(lens);
        });
      }

      g.position.copy(pos);
      scene.add(g);

      if (Math.random() < 0.3) setTimeout(() => audioManager.playSound('gobble'), Math.random() * 1000);

      return {
        mesh: g, body: bodyMesh, tail: tailGroup, pos: pos.clone(),
        hp: stats.hp * (scale ? scale / stats.scale : 1), maxHp: stats.hp * (scale ? scale / stats.scale : 1),
        spd: stats.speed, val: stats.value, dmg: stats.damage, type, scale: s,
        bob: Math.random() * 6.28, slowMult: 1, slowTimer: 0, dead: false,
        healTimer: 0, bossPhase: type === 'BOSS' ? 3 : 0
      };
    };

    // Create turret
    const createTurretMesh = (pos, type) => {
      const stats = TurretTypes[type];
      const g = new THREE.Group();

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }));
      base.position.y = 0.15; base.castShadow = true; g.add(base);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 10), new THREE.MeshStandardMaterial({ color: stats.color, roughness: 0.7 }));
      body.position.y = 0.7; body.castShadow = true; g.add(body);

      if (type === 'BASIC') {
        // Scarecrow head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 }));
        head.position.y = 1.3; g.add(head);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x2d1f14 }));
        hat.position.y = 1.6; g.add(hat);
      } else if (type === 'SLOW') {
        // Ice crystal
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8, emissive: 0x88ccff, emissiveIntensity: 0.3 }));
        crystal.position.y = 1.3; g.add(crystal);
      } else if (type === 'EXPLOSIVE') {
        // Corn silo top
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.7 }));
        dome.position.y = 1.1; g.add(dome);
      }

      // Range indicator (hidden by default)
      const range = new THREE.Mesh(new THREE.RingGeometry(0, stats.range, 32), new THREE.MeshBasicMaterial({ color: stats.color, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
      range.rotation.x = -Math.PI / 2; range.position.y = 0.02; range.visible = false;
      g.add(range);

      g.position.copy(pos);
      scene.add(g);

      return {
        mesh: g, range, pos: pos.clone(), type,
        damage: stats.damage, fireRate: stats.fireRate, turretRange: stats.range,
        slow: stats.slow || 0, slowDuration: stats.slowDuration || 0,
        splash: stats.splash || 0, lastFire: 0, target: null
      };
    };

    // Create projectile
    const createProjectile = (dir, weaponKey, fromTurret = false) => {
      const wp = fromTurret ? TurretTypes[weaponKey] : WeaponTypes[weaponKey];
      const damageBonus = fromTurret ? 1 : (1 + (state.upgrades?.weaponDamage || 0) * 0.15);
      const rageBonus = fromTurret ? 1 : (state.rageActive > 0 ? AbilityTypes.RAGE.damageMultiplier : 1);
      const finalDamage = (fromTurret ? wp.damage : wp.damage) * damageBonus * rageBonus;

      let geo;
      if (fromTurret) {
        geo = new THREE.SphereGeometry(0.12, 8, 6);
      } else if (weaponKey === 'PITCHFORK') {
        geo = new THREE.ConeGeometry(0.055, 0.28, 6); geo.rotateX(Math.PI / 2);
      } else if (weaponKey === 'CORN_CANNON') {
        geo = new THREE.CylinderGeometry(0.09, 0.12, 0.35, 8); geo.rotateX(Math.PI / 2);
      } else if (weaponKey === 'EGG_BLASTER') {
        geo = new THREE.SphereGeometry(0.09, 10, 8); geo.scale(1, 1.3, 1);
      } else {
        geo = new THREE.SphereGeometry(0.22, 12, 10);
      }

      const color = fromTurret ? wp.color : wp.color;
      const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4, emissive: color, emissiveIntensity: 0.15 });
      const m = new THREE.Mesh(geo, mat);

      if (fromTurret) {
        m.position.copy(dir.origin);
        m.position.y = 1.2;
      } else {
        m.position.copy(state.player.pos).setY(0.9);
        m.position.addScaledVector(dir, 0.7);
        m.rotation.y = state.player.rot;
      }
      m.castShadow = true;
      scene.add(m);

      if (!fromTurret) {
        emitParticles(m.position.clone(), 5, 0xffffaa, { x: 2, y: 2, z: 2 }, 0.15);
        audioManager.playSound(wp.sound);
      } else {
        audioManager.playSound('turret');
      }

      const vel = fromTurret ? dir.direction.clone().multiplyScalar(25) : dir.clone().multiplyScalar(wp.speed);

      return {
        mesh: m, vel, dmg: finalDamage, life: 0, hits: new Set(),
        pierce: fromTurret ? 0 : (wp.pierce || 0),
        splash: fromTurret ? (wp.splash || 0) : (wp.splash || 0),
        slow: fromTurret ? (wp.slow || 0) : (wp.slow || 0),
        slowDuration: fromTurret ? (wp.slowDuration || 2) : 2.5,
        arc: !fromTurret && wp.arc, startY: m.position.y, arcProg: 0,
        fromTurret
      };
    };

    // Explosion
    const createExplosion = (pos, radius, damage = 0) => {
      emitParticles(pos.clone(), 25, 0xff6600, { x: radius * 3, y: radius * 4, z: radius * 3 }, 0.6);
      emitParticles(pos.clone(), 15, 0xffff00, { x: radius * 2, y: radius * 5, z: radius * 2 }, 0.4);
      emitParticles(pos.clone().setY(pos.y + 0.5), 10, 0x333333, { x: radius, y: 2, z: radius }, 1.2);

      const ringGeo = new THREE.RingGeometry(0.2, 0.4, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos).setY(0.15); ring.rotation.x = -Math.PI / 2;
      scene.add(ring);
      const ringStart = performance.now();
      const animateRing = () => {
        const elapsed = (performance.now() - ringStart) / 1000;
        if (elapsed > 0.35) { scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); return; }
        ring.scale.setScalar(1 + elapsed * radius * 3);
        ringMat.opacity = 0.8 * (1 - elapsed / 0.35);
        requestAnimationFrame(animateRing);
      };
      animateRing();

      audioManager.playSound('explosion');
      state.shakeIntensity = Math.min(radius / 4, 1);
      state.shakeDuration = 0.35;

      // Deal damage if specified (for airstrike)
      if (damage > 0) {
        state.turkeys.forEach(tk => {
          const dx = tk.pos.x - pos.x, dz = tk.pos.z - pos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < radius) {
            const falloff = 1 - d / radius;
            tk.hp -= damage * falloff;
          }
        });
      }
    };

    // Wave composition - Improved progression system
    const getWaveComposition = (wave, endless) => {
      const mult = endless ? 1.3 : 1;

      // Wave rhythm: boss waves are climactic, post-boss waves are breathers
      const isBossWave = wave >= 5 && wave % 5 === 0;
      const isBreatherWave = wave > 5 && wave % 5 === 1; // Waves 6,11,16... (after boss)
      const isBuildupWave = wave % 5 === 4; // Waves 4,9,14... (before boss)

      // Rhythm multiplier affects total enemy count
      let rhythmMult = 1.0;
      if (isBossWave) rhythmMult = 0.6; // Fewer trash mobs during boss
      else if (isBreatherWave) rhythmMult = 0.7; // Recovery wave
      else if (isBuildupWave) rhythmMult = 1.2; // Tension before boss

      // Standard turkeys: smooth scaling with wave
      const baseStandard = Math.max(3, Math.round((3 + wave * 0.8) * mult * rhythmMult));

      const comp = {
        STANDARD: baseStandard,
        RUNNER: 0,
        TANK: 0,
        HEALER: 0,
        SPLITTER: 0,
        BOSS: 0
      };

      // Runners: Appear wave 3, scale quickly (fast but weak)
      if (wave >= 3) {
        const runnerBase = Math.round(1 + (wave - 3) * 0.5);
        const cap = endless ? 8 + Math.floor(wave * 0.15) : 6;
        comp.RUNNER = Math.round(Math.min(runnerBase, cap) * mult * rhythmMult);
      }

      // Tanks: Appear wave 5, scale slowly (tough enemies)
      if (wave >= 5) {
        const tankBase = Math.round(1 + (wave - 5) * 0.3);
        const cap = endless ? 5 + Math.floor(wave * 0.1) : 4;
        comp.TANK = Math.round(Math.min(tankBase, cap) * mult * rhythmMult);
      }

      // Healers: Appear wave 7, strategic threat
      if (wave >= 7) {
        const healerBase = Math.round(1 + (wave - 7) * 0.25);
        const cap = endless ? 4 + Math.floor(wave * 0.08) : 3;
        comp.HEALER = Math.round(Math.min(healerBase, cap) * mult * rhythmMult);
      }

      // Splitters: Appear wave 9, scale moderately
      if (wave >= 9) {
        const splitterBase = Math.round(1 + (wave - 9) * 0.2);
        const cap = endless ? 4 + Math.floor(wave * 0.08) : 3;
        comp.SPLITTER = Math.round(Math.min(splitterBase, cap) * mult * rhythmMult);
      }

      // Bosses: Every 5 waves starting at 5
      if (isBossWave) {
        comp.BOSS = endless ? Math.floor(wave / 10) + 1 : 1;
      }

      // Ensure at least 1 of new enemy type on introduction wave
      if (wave === 3) comp.RUNNER = Math.max(comp.RUNNER, 2);
      if (wave === 5) comp.TANK = Math.max(comp.TANK, 1);
      if (wave === 7) comp.HEALER = Math.max(comp.HEALER, 1);
      if (wave === 9) comp.SPLITTER = Math.max(comp.SPLITTER, 1);

      return comp;
    };

    const getNextSpawnType = (comp) => {
      const available = Object.entries(comp).filter(([type]) => spawnedCounts[type] < comp[type]);
      if (available.length === 0) return null;
      const weights = { STANDARD: 5, RUNNER: 3, TANK: 2, HEALER: 2, SPLITTER: 2, BOSS: 1 };
      const weighted = available.flatMap(([type]) => Array(weights[type] || 1).fill(type));
      return weighted[Math.floor(Math.random() * weighted.length)];
    };

    // Input
    const onKey = (e, down) => {
      const map = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'panUp', ArrowDown: 'panDown', ArrowLeft: 'panLeft', ArrowRight: 'panRight' };
      if (map[e.code]) state.input[map[e.code]] = down;

      if (down) {
        const weaponKeys = Object.keys(WeaponTypes);
        if (e.code === 'Digit1' || e.code === 'Numpad1') { state.currentWeapon = weaponKeys[0]; setWeapon(WeaponTypes[weaponKeys[0]]); audioManager.playSound('click'); }
        if (e.code === 'Digit2' || e.code === 'Numpad2') { state.currentWeapon = weaponKeys[1]; setWeapon(WeaponTypes[weaponKeys[1]]); audioManager.playSound('click'); }
        if (e.code === 'Digit3' || e.code === 'Numpad3') { state.currentWeapon = weaponKeys[2]; setWeapon(WeaponTypes[weaponKeys[2]]); audioManager.playSound('click'); }
        if (e.code === 'Digit4' || e.code === 'Numpad4') { state.currentWeapon = weaponKeys[3]; setWeapon(WeaponTypes[weaponKeys[3]]); audioManager.playSound('click'); }
        if (e.code === 'KeyB') { setShopOpen(p => !p); setTurretMenuOpen(false); audioManager.playSound('click'); }
        if (e.code === 'KeyT') { setTurretMenuOpen(p => !p); setShopOpen(false); audioManager.playSound('click'); }
        if (e.code === 'KeyQ') { useAbility('AIRSTRIKE'); }
        if (e.code === 'KeyE') { useAbility('FREEZE'); }
        if (e.code === 'KeyR') { useAbility('RAGE'); }
        if (e.code === 'KeyF') { useAbility('REPAIR'); }
        if (e.code === 'Space' || e.code === 'KeyN') {
          if (state.waveComplete && !state.gameOver) {
            setBanner('');
            state.waveComplete = false;
            setWaitingForNextWave(false);
            startWave();
          }
        }
        if (e.code === 'Escape') {
          if (placingTurretRef.current) { setPlacingTurret(null); placingTurretRef.current = null; turretPreview.visible = false; }
          else if (settingsOpen) setSettingsOpen(false);
          else if (shopOpen) setShopOpen(false);
          else if (turretMenuOpen) setTurretMenuOpen(false);
          else if (helpOpen) setHelpOpen(false);
          else if (achievementsOpen) setAchievementsOpen(false);
          else { setPaused(p => !p); state.paused = !state.paused; }
          audioManager.playSound('click');
        }

        // Camera Controls
        if (e.code === 'KeyC') {
          const modes = ['ISOMETRIC', 'TOPDOWN', 'FIRST_PERSON'];
          const nextMode = modes[(modes.indexOf(cameraModeRef.current) + 1) % modes.length];
          setCameraMode(nextMode);
          // Exit pointer lock when switching away from FPS
          if (nextMode !== 'FIRST_PERSON' && document.pointerLockElement) {
            document.exitPointerLock();
          }
          audioManager.playSound('click');
        }

        // Manual Rotation
        if (e.code === 'Comma') { cameraAngleRef.current += Math.PI / 4; audioManager.playSound('click'); }
        if (e.code === 'Period') { cameraAngleRef.current -= Math.PI / 4; audioManager.playSound('click'); }

        // Pan Reset
        if (e.code === 'KeyZ') { panOffsetRef.current.set(0, 0, 0); cameraAngleRef.current = 0; audioManager.playSound('click'); }
      }
    };
    const handleKeyDown = e => onKey(e, true);
    const handleKeyUp = e => onKey(e, false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    renderer.domElement.addEventListener('mousedown', e => {
      if (e.button === 0) {
        const currentPlacingTurret = placingTurretRef.current;
        if (currentPlacingTurret && turretPreview.visible) {
          // Place turret - check valid placement distance
          const pos = turretPreview.position.clone();
          const distToBarn = pos.length();
          const canPlace = distToBarn > 5 && distToBarn < 35;
          if (!canPlace) {
            audioManager.playSound('hurt'); // Invalid placement feedback
            return;
          }
          const type = currentPlacingTurret;
          const cost = TurretTypes[type].cost;
          if (state.currency >= cost) {
            state.currency -= cost;
            const turret = createTurretMesh(pos, type);
            state.turrets.push(turret);
            setTurrets([...state.turrets]);
            updatePlayerStats({ turretsPlaced: playerStats.turretsPlaced + 1 });
            audioManager.playSound('purchase');
            setPlacingTurret(null);
            placingTurretRef.current = null;
            turretPreview.visible = false;
          }
        } else {
          state.input.firing = true;
        }
      } else if (e.button === 2) {
        setPlacingTurret(null);
        placingTurretRef.current = null;
        turretPreview.visible = false;
      }
    });
    renderer.domElement.addEventListener('mouseup', e => { if (e.button === 0) state.input.firing = false; });

    // Zoom control
    renderer.domElement.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      const newZoom = Math.max(0.5, Math.min(2.0, zoomRef.current + delta));
      setZoom(newZoom);
      zoomRef.current = newZoom;
    }, { passive: false });

    renderer.domElement.addEventListener('mousemove', e => {
      // FPS mode: use mouse movement for camera look
      if (cameraModeRef.current === 'FIRST_PERSON' && state.pointerLocked) {
        const sensitivity = 0.002;
        state.player.rot -= e.movementX * sensitivity;
        state.player.pitch -= e.movementY * sensitivity;
        // Clamp pitch to prevent flipping
        state.player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, state.player.pitch));
        
        // Update aim based on look direction for shooting
        const lookDir = new THREE.Vector3(
          Math.sin(state.player.rot) * Math.cos(state.player.pitch),
          Math.sin(state.player.pitch),
          Math.cos(state.player.rot) * Math.cos(state.player.pitch)
        );
        state.aim.copy(state.player.pos).add(lookDir.multiplyScalar(50));
      } else {
        // Normal mode: raycast to ground
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, state.aim);
      }

      // Update turret preview
      const currentPlacingTurret = placingTurretRef.current;
      if (currentPlacingTurret) {
        turretPreview.position.copy(state.aim);
        turretPreview.position.y = 0;
        const distToBarn = state.aim.length();
        const canPlace = distToBarn > 5 && distToBarn < 35;
        previewBase.material.color.setHex(canPlace ? 0x00ff00 : 0xff0000);
        previewRange.material.color.setHex(canPlace ? 0x00ff00 : 0xff0000);
        const range = TurretTypes[currentPlacingTurret].range;
        previewRange.geometry.dispose();
        previewRange.geometry = new THREE.RingGeometry(0, range, 32);
        turretPreview.visible = true;
      }
    });
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    // Pointer lock for FPS mode
    renderer.domElement.addEventListener('click', () => {
      if (cameraModeRef.current === 'FIRST_PERSON' && !state.pointerLocked) {
        renderer.domElement.requestPointerLock();
      }
    });
    const onPointerLockChange = () => {
      state.pointerLocked = document.pointerLockElement === renderer.domElement;
      setPointerLocked(state.pointerLocked);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Wave management
    const startWave = () => {
      if (state.gameOver) return;
      state.wave++;
      state.waveStartTime = performance.now();
      state.waveStartHealth = state.barn.health;
      Object.keys(spawnedCounts).forEach(k => spawnedCounts[k] = 0);
      const comp = getWaveComposition(state.wave, state.endlessMode);
      state.toSpawn = Object.values(comp).reduce((a, b) => a + b, 0);
      state.spawnTimer = 0;
      state.waveComp = comp;
      const isBoss = state.wave % 5 === 0 && state.wave >= 5;
      setBanner(isBoss ? `⚠️ BOSS WAVE ${state.wave} ⚠️` : `Wave ${state.wave}`);
      audioManager.playSound('wave');
      setTimeout(() => setBanner(''), 2500);
      updatePlayerStats({ wave: state.wave });
    };

    // Turkey removal
    const removeTurkey = (idx) => {
      if (idx < 0 || idx >= state.turkeys.length) return;
      const t = state.turkeys[idx];
      if (!t || !t.mesh) return;

      // Splitter spawns mini turkeys
      if (t.type === 'SPLITTER' && !t.isSplit && t.scale > 0.5) {
        for (let i = 0; i < 2; i++) {
          const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
          const mini = createTurkey(t.pos.clone().add(offset), 'SPLITTER', t.scale * 0.6);
          mini.isSplit = true;
          mini.val = Math.floor(t.val * 0.3);
          state.turkeys.push(mini);
        }
      }

      emitParticles(t.pos.clone().setY(0.6 * t.scale), 20, TurkeyTypes[t.type].body, { x: 3, y: 5, z: 3 }, 0.9);
      emitParticles(t.pos.clone().setY(0.6 * t.scale), 8, 0xdc143c, { x: 2, y: 3, z: 2 }, 0.6);
      scene.remove(t.mesh);
      t.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      state.turkeys.splice(idx, 1);

      updatePlayerStats({ totalKills: playerStats.totalKills + 1 });
      if (t.type === 'BOSS') updatePlayerStats({ bossKills: playerStats.bossKills + 1 });

      audioManager.playSound('kill');
    };

    // FPS tracking
    let frameCount = 0, lastFpsUpdate = performance.now();
    const clock = new THREE.Clock();
    let animId;

    // Main loop
    const animate = () => {
      animId = requestAnimationFrame(animate);

      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) { setFps(frameCount); frameCount = 0; lastFpsUpdate = now; }

      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.getElapsedTime();

      // Player Movement - relative to character facing direction
      // W = forward (where character faces), S = backward, A = strafe left, D = strafe right
      const mv = new THREE.Vector3();
      
      // Get forward vector based on player rotation (where mouse is pointing)
      const forward = new THREE.Vector3(
        Math.sin(state.player.rot),
        0,
        Math.cos(state.player.rot)
      );
      // Right vector is perpendicular to forward (rotate 90 degrees)
      const right = new THREE.Vector3(
        Math.sin(state.player.rot + Math.PI / 2),
        0,
        Math.cos(state.player.rot + Math.PI / 2)
      );
      
      if (state.input.w) mv.add(forward);   // Move forward (direction character faces)
      if (state.input.s) mv.sub(forward);   // Move backward
      if (state.input.a) mv.sub(right);     // Strafe left
      if (state.input.d) mv.add(right);     // Strafe right

      if (mv.lengthSq() > 0) {
        mv.normalize().multiplyScalar(6.5 * dt);

        state.player.pos.add(mv);
        state.player.pos.x = Math.max(-45, Math.min(45, state.player.pos.x));
        state.player.pos.z = Math.max(-45, Math.min(45, state.player.pos.z));
        playerGroup.position.copy(state.player.pos);

        // Bobbing animation
        playerGroup.position.y = Math.abs(Math.sin(t * 12)) * 0.05;
      }

      // Player Rotation (Aiming) - only in non-FPS modes
      if (cameraModeRef.current !== 'FIRST_PERSON') {
        const dir = new THREE.Vector3().subVectors(state.aim, state.player.pos).setY(0);
        if (dir.lengthSq() > 0.01) {
          state.player.rot = Math.atan2(dir.x, dir.z);
          playerGroup.rotation.y = state.player.rot;
        }
      } else {
        // In FPS mode, rotation is controlled by mouse look
        playerGroup.rotation.y = state.player.rot;
      }

      // Update leaves
      const leafPos = leafGeo.attributes.position.array;
      for (let i = 0; i < leafCount; i++) {
        const ld = leafData[i];
        leafPos[i * 3] += Math.sin(t * ld.swaySpeed + ld.rot) * 0.02;
        leafPos[i * 3 + 1] -= ld.fallSpeed * dt;
        leafPos[i * 3 + 2] += Math.cos(t * ld.swaySpeed * 0.7 + ld.rot) * 0.01;
        if (leafPos[i * 3 + 1] < 0) leafPos[i * 3 + 1] = 20 + Math.random() * 10;
      }
      leafGeo.attributes.position.needsUpdate = true;

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.pos.add(p.vel.clone().multiplyScalar(dt));
        p.vel.y -= 9.8 * dt;
      }
      for (let i = 0; i < maxParticles; i++) {
        if (i < particles.length) {
          const p = particles[i];
          pPositions[i * 3] = p.pos.x; pPositions[i * 3 + 1] = p.pos.y; pPositions[i * 3 + 2] = p.pos.z;
          pColors[i * 3] = p.color.r; pColors[i * 3 + 1] = p.color.g; pColors[i * 3 + 2] = p.color.b;
          pSizes[i] = p.size * (p.life / p.maxLife);
        } else {
          pPositions[i * 3 + 1] = -1000; pSizes[i] = 0;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.color.needsUpdate = true;
      particleGeo.attributes.size.needsUpdate = true;

      // Screen shake
      if (state.shakeDuration > 0) {
        state.shakeDuration -= dt;
        // Camera shake handled in camera logic
      }

      // Spawning
      if (state.toSpawn > 0 && !state.gameOver && !state.paused) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          const type = getNextSpawnType(state.waveComp);
          if (type) {
            spawnedCounts[type]++;
            const angle = Math.random() * Math.PI * 2;
            const dist = 45 + Math.random() * 10;
            const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            const turkey = createTurkey(pos, type);
            state.turkeys.push(turkey);
            state.toSpawn--;

            // Spawn delay based on wave density
            const baseDelay = Math.max(0.5, 2.5 - state.wave * 0.15);
            state.spawnTimer = baseDelay * (0.8 + Math.random() * 0.4);
          }
        }
      }

      // Update Turkeys
      for (const tk of state.turkeys) {
        if (tk.dead) continue;

        // Move towards barn
        const dir = new THREE.Vector3().subVectors(state.barn.pos, tk.pos).normalize();
        let speed = tk.spd * (tk.slowMult || 1);
        if (tk.slowTimer > 0) {
          tk.slowTimer -= dt;
          if (tk.slowTimer <= 0) tk.slowMult = 1;
        }

        // Freeze logic
        if (state.globalFreeze > 0) {
          state.globalFreeze -= dt;
          speed = 0;
        }

        tk.pos.add(dir.multiplyScalar(speed * dt));
        tk.mesh.position.copy(tk.pos);
        tk.mesh.lookAt(state.barn.pos);

        // Bobbing animation
        tk.mesh.position.y = Math.abs(Math.sin(t * 10)) * 0.5;

        // Barn collision
        const distToBarn = tk.pos.length();
        if (distToBarn < 3) {
          state.barn.health -= tk.dmg * (1 - (state.upgrades?.barnArmor || 0) * 0.1);
          audioManager.playSound('hurt');
          removeTurkey(state.turkeys.indexOf(tk));
          emitParticles(tk.pos.clone(), 10, 0xff0000, { x: 2, y: 4, z: 2 }, 0.5);

          if (state.barn.health <= 0) {
            state.barn.health = 0;
            setGameOver(true);
            state.gameOver = true;
            audioManager.playSound('gameover');
          }
        }
      }

      // Player Shooting
      if (state.shootTimer > 0) state.shootTimer -= dt;
      if (state.input.firing && state.shootTimer <= 0 && !state.gameOver && !state.paused) {
        const weapon = WeaponTypes[state.currentWeapon];
        const rate = 1 / (weapon.fireRate * (1 + (state.upgrades?.fireRate || 0) * 0.1));
        state.shootTimer = rate;

        // Calculate spread/direction
        const dir = new THREE.Vector3().subVectors(state.aim, state.player.pos).setY(0).normalize();

        // Multiple projectiles for shotgun/special
        const count = weapon.count || 1;
        const spread = weapon.spread || 0;

        for (let i = 0; i < count; i++) {
          const spreadAngle = (Math.random() - 0.5) * spread;
          const pDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
          const proj = createProjectile(pDir, state.currentWeapon);
          state.projectiles.push(proj);
        }

        // Recoil/Screen shake
        state.shakeIntensity = 0.2;
        state.shakeDuration = 0.1;
      }

      // Turrets
      state.turrets.forEach(turret => {
        if (turret.cooldown > 0) turret.cooldown -= dt;

        let target = null;
        let minDist = TurretTypes[turret.type].range;

        for (const tk of state.turkeys) {
          if (tk.dead) continue;
          const dist = tk.pos.distanceTo(turret.mesh.position);
          if (dist < minDist) {
            minDist = dist;
            target = tk;
          }
        }

        if (target) {
          turret.mesh.lookAt(target.pos);
          if (turret.cooldown <= 0) {
            turret.cooldown = TurretTypes[turret.type].fireRate;
            const dir = new THREE.Vector3().subVectors(target.pos, turret.mesh.position).normalize();
            const proj = createProjectile({ origin: turret.mesh.position.clone(), direction: dir }, turret.type, true);
            state.turretProjectiles.push(proj);
          }
        }
      });

      // Camera Logic
      const mode = cameraModeRef.current;
      const z = zoomRef.current;
      const angle = cameraAngleRef.current;
      const pan = panOffsetRef.current;

      // Handle Panning (Arrow Keys)
      const panSpeed = 20 * dt;
      // Update Pan based on input
      if (state.input.panUp) panOffsetRef.current.z -= 20 * dt;
      if (state.input.panDown) panOffsetRef.current.z += 20 * dt;
      if (state.input.panLeft) panOffsetRef.current.x -= 20 * dt;
      if (state.input.panRight) panOffsetRef.current.x += 20 * dt;

      if (mode === 'FIRST_PERSON') {
        // First Person: Attach to player head, look based on mouse
        const headPos = state.player.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
        camera.position.copy(headPos);

        // Look direction based on player rotation and pitch
        const lookDir = new THREE.Vector3(
          Math.sin(state.player.rot) * Math.cos(state.player.pitch),
          Math.sin(state.player.pitch),
          Math.cos(state.player.rot) * Math.cos(state.player.pitch)
        );
        const target = headPos.clone().add(lookDir);
        camera.lookAt(target);
        camera.up.set(0, 1, 0);

        // Hide player model in FPS mode
        playerGroup.visible = false;

        // Screen shake for FPS
        if (state.shakeDuration > 0) {
          const shake = state.shakeIntensity * 0.02;
          camera.rotation.x += (Math.random() - 0.5) * shake;
          camera.rotation.y += (Math.random() - 0.5) * shake;
        }
      } else if (mode === 'TOPDOWN') {
        // Show player in other modes
        playerGroup.visible = true;
        // Top Down: High above, looking straight down
        // Apply Pan
        const targetPos = state.player.pos.clone().add(pan).add(new THREE.Vector3(0, 50 * z, 0));

        // Rotate around Y if needed (though top down usually doesn't rotate tilt)
        // Let's allow rotation for "orientation"
        const rotOffset = new THREE.Vector3(0, 50 * z, 0);
        // Top down doesn't really rotate position, just view up vector? 
        // Let's just rotate the camera itself around the Z axis?
        camera.up.set(Math.sin(angle), 0, Math.cos(angle)); // Rotate orientation

        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(state.player.pos.clone().add(pan));

      } else {
        // Show player in isometric mode
        playerGroup.visible = true;
        // Isometric (Default): Follow player with offset + Rotation + Pan
        const dist = 40 * z;
        const height = 32 * z;

        // Calculate offset based on angle
        // Base offset was (0, 32, 40) -> (0, height, dist)
        // Rotated: x = dist * sin(angle), z = dist * cos(angle)
        const rotOffset = new THREE.Vector3(dist * Math.sin(angle), height, dist * Math.cos(angle));

        const targetPos = state.player.pos.clone().add(pan).add(rotOffset);

        // Screen shake
        if (state.shakeDuration > 0) {
          state.shakeDuration -= dt;
          const shake = state.shakeIntensity * (state.shakeDuration > 0 ? 1 : 0);
          targetPos.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.5, (Math.random() - 0.5) * shake * 0.3));
        }

        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(state.player.pos.clone().add(pan));
        camera.up.set(0, 1, 0); // Reset up vector
      }

      // Update ability cooldowns
      setAbilities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].cooldown > 0) updated[key].cooldown = Math.max(0, updated[key].cooldown - dt);
          if (updated[key].remaining > 0) {
            updated[key].remaining = Math.max(0, updated[key].remaining - dt);
            if (updated[key].remaining === 0) updated[key].active = false;
          }
        });
        return updated;
      });

      // Update projectiles (player)
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (p.arc) {
          p.arcProg += dt * 0.85;
          p.mesh.position.y = p.startY + Math.sin(p.arcProg * Math.PI) * 6;
          p.mesh.rotation.x = -Math.cos(p.arcProg * Math.PI) * 0.6;
          if (p.arcProg >= 1) {
            if (p.splash > 0) {
              createExplosion(p.mesh.position.clone(), p.splash);
              const splashKills = [];
              state.turkeys.forEach((tk, idx) => {
                const dx = tk.pos.x - p.mesh.position.x, dz = tk.pos.z - p.mesh.position.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < p.splash) {
                  tk.hp -= p.dmg * (1 - d / p.splash);
                  if (tk.hp <= 0 && !tk.dead) { tk.dead = true; state.currency += tk.val; state.score += tk.val * 10; splashKills.push(idx); setHitMarker('kill'); setTimeout(() => setHitMarker(null), 200); }
                }
              });
              for (let k = splashKills.length - 1; k >= 0; k--) removeTurkey(splashKills[k]);
            }
            scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            state.projectiles.splice(i, 1);
            continue;
          }
        }
        p.mesh.position.addScaledVector(p.vel, dt);
        p.life += dt;

        // Collision
        for (let j = state.turkeys.length - 1; j >= 0; j--) {
          const tk = state.turkeys[j];
          if (p.hits.has(tk) || tk.dead) continue;
          const dx = p.mesh.position.x - tk.pos.x, dz = p.mesh.position.z - tk.pos.z;
          if (Math.sqrt(dx * dx + dz * dz) < 0.7 * tk.scale) {
            p.hits.add(tk);
            tk.hp -= p.dmg;
            audioManager.playSound('hit');
            if (p.slow > 0) { tk.slowMult = 1 - p.slow; tk.slowTimer = p.slowDuration; }
            tk.body.material.color.set(0xff0000);
            setTimeout(() => { if (tk.body) tk.body.material.color.set(TurkeyTypes[tk.type].body); }, 80);
            emitParticles(p.mesh.position.clone(), 8, 0xffff00, { x: 3, y: 4, z: 3 }, 0.3);
            setHitMarker(tk.hp <= 0 ? 'kill' : 'hit');
            setTimeout(() => setHitMarker(null), 150);
            if (tk.hp <= 0 && !tk.dead) { tk.dead = true; state.currency += tk.val; state.score += tk.val * 10; removeTurkey(j); }
            if (p.splash > 0) {
              createExplosion(p.mesh.position.clone(), p.splash);
              const splashKills = [];
              state.turkeys.forEach((otk, oidx) => {
                if (otk !== tk && !otk.dead) {
                  const sdx = otk.pos.x - p.mesh.position.x, sdz = otk.pos.z - p.mesh.position.z;
                  const d = Math.sqrt(sdx * sdx + sdz * sdz);
                  if (d < p.splash) { otk.hp -= p.dmg * 0.5 * (1 - d / p.splash); if (otk.hp <= 0 && !otk.dead) { otk.dead = true; state.currency += otk.val; state.score += otk.val * 10; splashKills.push(oidx); } }
                }
              });
              for (let k = splashKills.length - 1; k >= 0; k--) removeTurkey(splashKills[k]);
            }
            if (p.pierce <= 0) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.projectiles.splice(i, 1); break; }
            p.pierce--;
          }
        }
        if (p.life > 3 && state.projectiles[i]) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.projectiles.splice(i, 1); }
      }

      // Update turret projectiles
      for (let i = state.turretProjectiles.length - 1; i >= 0; i--) {
        const p = state.turretProjectiles[i];
        p.mesh.position.addScaledVector(p.vel, dt);
        p.life += dt;

        for (let j = state.turkeys.length - 1; j >= 0; j--) {
          const tk = state.turkeys[j];
          if (p.hits.has(tk) || tk.dead) continue;
          const dx = p.mesh.position.x - tk.pos.x, dz = p.mesh.position.z - tk.pos.z;
          if (Math.sqrt(dx * dx + dz * dz) < 0.7 * tk.scale) {
            p.hits.add(tk);
            tk.hp -= p.dmg;
            if (p.slow > 0) { tk.slowMult = 1 - p.slow; tk.slowTimer = p.slowDuration; }
            tk.body.material.color.set(0xff0000);
            setTimeout(() => { if (tk.body) tk.body.material.color.set(TurkeyTypes[tk.type].body); }, 80);
            emitParticles(p.mesh.position.clone(), 5, 0xffff00, { x: 2, y: 3, z: 2 }, 0.2);
            if (tk.hp <= 0 && !tk.dead) { tk.dead = true; state.currency += tk.val; state.score += tk.val * 10; removeTurkey(j); }
            if (p.splash > 0) {
              createExplosion(p.mesh.position.clone(), p.splash);
              state.turkeys.forEach((otk) => {
                if (otk !== tk && !otk.dead) {
                  const sdx = otk.pos.x - p.mesh.position.x, sdz = otk.pos.z - p.mesh.position.z;
                  const d = Math.sqrt(sdx * sdx + sdz * sdz);
                  if (d < p.splash) { otk.hp -= p.dmg * 0.5 * (1 - d / p.splash); if (otk.hp <= 0 && !otk.dead) { otk.dead = true; state.currency += otk.val; state.score += otk.val * 10; } }
                }
              });
            }
            scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            state.turretProjectiles.splice(i, 1);
            break;
          }
        }
        if (p.life > 2 && state.turretProjectiles[i]) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); state.turretProjectiles.splice(i, 1); }
      }

      // Cleanup dead turkeys
      for (let i = state.turkeys.length - 1; i >= 0; i--) {
        if (state.turkeys[i].dead || state.turkeys[i].hp <= 0) removeTurkey(i);
      }

      // Wave completion
      if (state.toSpawn === 0 && state.turkeys.length === 0 && state.wave > 0 && !state.waveComplete) {
        state.waveComplete = true;
        const bonus = 30 + state.wave * 15;
        state.currency += bonus;
        state.score += bonus * 5;

        setBanner(`Wave Complete! +${bonus} 🌽`);
        audioManager.playSound('wave');
        setWaitingForNextWave(true);
      }        // Update HUD
      const hp = state.barn.health / state.barn.maxHealth;
      barnBase.material.color.setHex(hp < 0.25 ? 0x5a0000 : hp < 0.5 ? 0x7a0000 : 0x8b0000);
      setLowHealth(hp < 0.25);
      setStats({ health: Math.round(hp * 100), currency: state.currency, wave: state.wave, enemies: state.turkeys.length + state.toSpawn, score: state.score });

      renderer.render(scene, camera);
    };
    // Game API
    gameRef.current = {
      start: async (endless = false) => {
        if (!state.started) {
          await audioManager.init();
          state.started = true;
          state.endlessMode = endless;
          state.gameStartTime = performance.now();
          setStarted(true);
          setEndlessMode(endless);
          updatePlayerStats({ gamesPlayed: playerStats.gamesPlayed + 1 });
          setTimeout(() => startWave(), 1000);
        }
      },
      setWeapon: (key) => { state.currentWeapon = key; setWeapon(WeaponTypes[key]); audioManager.playSound('click'); },
      repair: () => { if (state.currency >= 50) { state.currency -= 50; state.barn.health = Math.min(state.barn.maxHealth, state.barn.health + state.barn.maxHealth * 0.25); audioManager.playSound('purchase'); } },
      nextWave: () => {
        if (state.waveComplete && !state.gameOver) {
          setBanner('');
          state.waveComplete = false;
          setWaitingForNextWave(false);
          startWave();
        }
      },
      buyUpgrade: (type, cost) => {
        if (state.currency >= cost) {
          state.currency -= cost;
          setUpgrades(prev => {
            const newUpgrades = { ...prev, [type]: prev[type] + 1 };
            state.upgrades = newUpgrades;
            return newUpgrades;
          });
          if (type === 'maxHealth') { state.barn.maxHealth += 30; state.barn.health += 30; }
          audioManager.playSound('purchase');
          return true;
        }
        return false;
      },
      placeTurret: (type) => { setPlacingTurret(type); placingTurretRef.current = type; turretPreview.visible = true; },
      restart: () => {
        state.turkeys.forEach(t => { scene.remove(t.mesh); t.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); });
        state.projectiles.forEach(p => { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        state.turretProjectiles.forEach(p => { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        state.turrets.forEach(t => { scene.remove(t.mesh); t.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); });

        state.turkeys = []; state.projectiles = []; state.turretProjectiles = []; state.turrets = [];
        state.wave = 0; state.toSpawn = 0; state.currency = 100; state.score = 0;
        state.barn.health = 175; state.barn.maxHealth = 175;
        state.gameOver = false; state.waveComplete = false;
        state.waveTransitionTimer = 0; state.waveTransitionDelay = 0;
        state.currentWeapon = 'PITCHFORK';
        state.player.pos.set(0, 0, 10);
        playerGroup.position.copy(state.player.pos);
        state.globalFreeze = 0; state.rageActive = 0;
        state.upgrades = { barnArmor: 0, weaponDamage: 0, fireRate: 0, maxHealth: 0 };

        Object.keys(spawnedCounts).forEach(k => spawnedCounts[k] = 0);
        setUpgrades({ barnArmor: 0, weaponDamage: 0, fireRate: 0, maxHealth: 0 });
        setTurrets([]);
        setWeapon(WeaponTypes.PITCHFORK);
        setGameOver(false);
        setBanner('');
        setAbilities({ AIRSTRIKE: { cooldown: 0, active: false }, FREEZE: { cooldown: 0, active: false, remaining: 0 }, RAGE: { cooldown: 0, active: false, remaining: 0 }, REPAIR: { cooldown: 0, active: false } });

        audioManager.startMusic();
        updatePlayerStats({ gamesPlayed: playerStats.gamesPlayed + 1 });
        setTimeout(() => startWave(), 1000);
      }
    };

    animate();

    const onResize = () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement) document.exitPointerLock();
      audioManager.dispose();
    };
  }, []);

  const healthColor = stats.health < 25 ? '#ff4444' : stats.health < 50 ? '#ffa500' : '#4CAF50';
  const weaponKeys = Object.keys(WeaponTypes);

  // Shop items
  const shopItems = [
    { id: 'repair', name: 'Repair Barn', icon: '🔧', cost: 50, desc: 'Restore 25% barn health', action: () => gameRef.current?.repair() },
    { id: 'barnArmor', name: 'Barn Armor', icon: '🛡️', cost: 80 + upgrades.barnArmor * 60, desc: `-10% damage (Lvl ${upgrades.barnArmor})`, max: 5, current: upgrades.barnArmor, action: () => gameRef.current?.buyUpgrade('barnArmor', 80 + upgrades.barnArmor * 60) },
    { id: 'weaponDamage', name: 'Weapon Power', icon: '⚔️', cost: 100 + upgrades.weaponDamage * 80, desc: `+15% damage (Lvl ${upgrades.weaponDamage})`, max: 5, current: upgrades.weaponDamage, action: () => gameRef.current?.buyUpgrade('weaponDamage', 100 + upgrades.weaponDamage * 80) },
    { id: 'fireRate', name: 'Fire Rate', icon: '🔥', cost: 90 + upgrades.fireRate * 70, desc: `+10% fire rate (Lvl ${upgrades.fireRate})`, max: 5, current: upgrades.fireRate, action: () => gameRef.current?.buyUpgrade('fireRate', 90 + upgrades.fireRate * 70) },
    { id: 'maxHealth', name: 'Fortify Barn', icon: '🏠', cost: 120 + upgrades.maxHealth * 90, desc: `+30 max HP (Lvl ${upgrades.maxHealth})`, max: 5, current: upgrades.maxHealth, action: () => gameRef.current?.buyUpgrade('maxHealth', 120 + upgrades.maxHealth * 90) },
  ];

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Low health vignette */}
      {lowHealth && <div className="absolute inset-0 pointer-events-none animate-pulse" style={{ background: 'radial-gradient(circle, transparent 40%, rgba(139,0,0,0.4) 100%)' }} />}

      {/* Rage effect */}
      {abilities.RAGE.active && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, transparent 60%, rgba(255,100,0,0.2) 100%)' }} />}

      {/* Freeze effect */}
      {abilities.FREEZE.active && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(100,200,255,0.1) 0%, rgba(100,200,255,0.3) 100%)' }} />}

      {/* Hit markers */}
      {hitMarker && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className={`text-4xl ${hitMarker === 'kill' ? 'text-yellow-400 scale-125' : 'text-white'} transition-transform`}>
            {hitMarker === 'kill' ? '✕' : '+'}
          </div>
        </div>
      )}

      {/* FPS Crosshair */}
      {cameraMode === 'FIRST_PERSON' && started && !gameOver && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
          <div className="relative">
            {/* Crosshair */}
            <div className="w-6 h-0.5 bg-white/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg" />
            <div className="w-0.5 h-6 bg-white/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg" />
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* FPS Mode Click to Lock */}
      {cameraMode === 'FIRST_PERSON' && !pointerLocked && started && !gameOver && !paused && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-16 pointer-events-none z-10">
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-center animate-pulse">
            Click to enable mouse look<br/>
            <span className="text-gray-400 text-sm">Press ESC to release</span>
          </div>
        </div>
      )}

      {/* Achievement popup */}
      {newAchievement && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl px-6 py-4 flex items-center gap-4 animate-bounce shadow-lg z-50">
          <span className="text-4xl">{newAchievement.icon}</span>
          <div>
            <div className="text-white font-bold">Achievement Unlocked!</div>
            <div className="text-yellow-100">{newAchievement.name}</div>
          </div>
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur rounded-xl p-4 min-w-72">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏠</span>
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${stats.health}%`, backgroundColor: healthColor }} />
              </div>
            </div>
            <span className="text-white font-bold min-w-12 text-right">{stats.health}%</span>
          </div>
          <div className="flex gap-4 text-white text-sm">
            <span>🌽 {stats.currency}</span>
            <span>🌊 Wave {stats.wave}</span>
            <span>🦃 {stats.enemies}</span>
            <span>⭐ {stats.score}</span>
            {endlessMode && <span className="text-purple-400">♾️ Endless</span>}
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {settings.showFps && <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white text-sm">{fps} FPS</div>}
          <button onClick={() => {
            const modes = ['ISOMETRIC', 'TOPDOWN', 'FIRST_PERSON'];
            const next = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
            setCameraMode(next);
            audioManager.playSound('click');
          }} className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white hover:bg-black/80 transition flex items-center gap-2">
            <span>📷</span>
            <span className="text-xs font-bold">{cameraMode === 'FIRST_PERSON' ? 'FPS' : cameraMode === 'TOPDOWN' ? 'TOP' : 'ISO'}</span>
          </button>
          <button onClick={() => { setAchievementsOpen(true); audioManager.playSound('click'); }} className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white hover:bg-black/80 transition">🏆</button>
          <button onClick={() => { setSettingsOpen(true); audioManager.playSound('click'); }} className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white hover:bg-black/80 transition">⚙️</button>
          <button onClick={() => { setHelpOpen(true); audioManager.playSound('click'); }} className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white hover:bg-black/80 transition">❓</button>
        </div>
      </div>

      {/* Mini-map */}
      {settings.showMinimap && started && !gameOver && (
        <div className="absolute top-24 right-4 w-32 h-32 bg-black/60 backdrop-blur rounded-lg overflow-hidden pointer-events-none">
          <div className="relative w-full h-full">
            {/* Barn */}
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-800 transform -translate-x-1/2 -translate-y-1/2 rounded" />
            {/* Player */}
            <div className="absolute w-2 h-2 bg-blue-400 rounded-full" style={{
              left: `${50 + (stateRef.current?.player?.pos?.x || 0) / 35 * 45}%`,
              top: `${50 + (stateRef.current?.player?.pos?.z || 0) / 35 * 45}%`,
              transform: 'translate(-50%, -50%)'
            }} />
            {/* Range rings */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 border border-green-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-yellow-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-red-500/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Abilities bar */}
      {started && !gameOver && (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
          {Object.entries(AbilityTypes).map(([key, ab]) => {
            const state = abilities[key];
            const ready = state.cooldown === 0;
            const active = state.active;
            return (
              <button key={key} onClick={() => useAbility(key)} disabled={!ready}
                className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all ${active ? 'bg-yellow-500 ring-2 ring-yellow-300' : ready ? 'bg-black/70 hover:bg-black/90' : 'bg-black/40 opacity-60'}`}>
                {ab.icon}
                {!ready && !active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                    <span className="text-white text-sm font-bold">{Math.ceil(state.cooldown)}</span>
                  </div>
                )}
                {active && state.remaining > 0 && (
                  <div className="absolute -bottom-1 left-1 right-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(state.remaining / AbilityTypes[key].duration) * 100}%` }} />
                  </div>
                )}
                <span className="absolute -right-1 -top-1 text-xs bg-gray-800 px-1 rounded text-gray-400">
                  {key === 'AIRSTRIKE' ? 'Q' : key === 'FREEZE' ? 'E' : key === 'RAGE' ? 'R' : 'F'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Weapon bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {weaponKeys.map((key, i) => {
          const wp = WeaponTypes[key];
          const isActive = weapon.name === wp.name;
          return (
            <button key={key} onClick={() => gameRef.current?.setWeapon(key)}
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

      {/* Current weapon info */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-center pointer-events-none">
        <div className="text-white font-bold">{weapon.name}</div>
        <div className="text-gray-400 text-xs">{weapon.description}</div>
      </div>

      {/* Placing turret indicator */}
      {placingTurret && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-green-600/80 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
          Click to place {TurretTypes[placingTurret].name} • Right-click or ESC to cancel
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
      {waitingForNextWave && !gameOver && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => gameRef.current?.nextWave()}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold px-10 py-5 rounded-xl hover:scale-110 transition-all shadow-2xl animate-pulse"
          >
            🌊 Start Wave {stats.wave + 1}
          </button>
        </div>
      )}

      {/* Start screen */}
      {!started && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🦃🏠🔱</div>
          <h1 className="text-5xl font-black text-white mb-2" style={{ textShadow: '0 0 20px rgba(255,100,0,0.8)' }}>Turkey Trot Defense</h1>
          <p className="text-gray-400 mb-8 text-lg">Defend your barn from the turkey invasion!</p>
          <div className="flex gap-4 mb-8">
            <button onClick={() => { setGameMode('normal'); gameRef.current?.start(false); }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg">
              🎮 Normal Mode
            </button>
            <button onClick={() => { setGameMode('endless'); gameRef.current?.start(true); }}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg">
              ♾️ Endless Mode
            </button>
          </div>
          <div className="text-gray-500 text-sm mb-4">
            WASD: Move • Arrows: Pan • &lt; &gt;: Rotate • Mouse: Aim/Shoot • 1-4: Weapons • Q/E/R/F: Abilities
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setAchievementsOpen(true); audioManager.playSound('click'); }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition">
              🏆 Achievements ({unlockedAchievements.length}/{Object.keys(Achievements).length})
            </button>
          </div>
        </div>
      )}

      {/* Shop modal */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">🛒 Shop</h2>
              <div className="text-yellow-400 font-bold">🌽 {stats.currency}</div>
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
                      {maxed ? 'MAX' : `🌽 ${item.cost}`}
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
              <h2 className="text-2xl font-bold text-white">🗼 Turrets</h2>
              <div className="text-yellow-400 font-bold">🌽 {stats.currency}</div>
            </div>
            <div className="space-y-3">
              {Object.entries(TurretTypes).map(([key, turret]) => {
                const canAfford = stats.currency >= turret.cost;
                return (
                  <button key={key} onClick={() => { if (canAfford) { gameRef.current?.placeTurret(key); setTurretMenuOpen(false); } }}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${canAfford ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 opacity-50'}`}>
                    <span className="text-3xl">{turret.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-white font-bold">{turret.name}</div>
                      <div className="text-gray-400 text-sm">{turret.description}</div>
                      <div className="text-gray-500 text-xs">DMG: {turret.damage} • Range: {turret.range} • Rate: {turret.fireRate}/s</div>
                    </div>
                    <div className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>🌽 {turret.cost}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-gray-800 rounded-lg text-gray-400 text-sm">
              <p>💡 Click to select a turret, then click on the ground to place it. Turrets automatically target nearby enemies.</p>
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
            <h2 className="text-2xl font-bold text-white mb-4">⚙️ Settings</h2>
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
                  {settings.muted ? '🔇 Muted' : '🔊 On'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Show FPS</span>
                <button onClick={() => updateSetting('showFps', !settings.showFps)} className={`px-4 py-2 rounded-lg transition ${settings.showFps ? 'bg-green-500' : 'bg-gray-600'}`}>
                  {settings.showFps ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Show Mini-map</span>
                <button onClick={() => updateSetting('showMinimap', !settings.showMinimap)} className={`px-4 py-2 rounded-lg transition ${settings.showMinimap ? 'bg-green-500' : 'bg-gray-600'}`}>
                  {settings.showMinimap ? 'On' : 'Off'}
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
            <h2 className="text-2xl font-bold text-white mb-4">🏆 Achievements ({unlockedAchievements.length}/{Object.keys(Achievements).length})</h2>
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
            <h2 className="text-2xl font-bold text-white mb-4">❓ How to Play</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">🎯 Objective</h3>
                <p>Defend your barn from waves of turkeys! Use weapons, turrets, and abilities to survive.</p>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">🎮 Controls</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-white">WASD</span> - Move</p>
                  <p><span className="text-white">Mouse</span> - Aim & Shoot</p>
                  <p><span className="text-white">1-4</span> - Switch weapons</p>
                  <p><span className="text-white">Q/E/R/F</span> - Use abilities</p>
                  <p><span className="text-white">T</span> - Turret menu</p>
                  <p><span className="text-white">B</span> - Shop</p>
                </div>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">✨ Abilities</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-white">💣 Turkey Bomb (Q)</span> - Airstrike at cursor</p>
                  <p><span className="text-white">❄️ Frost Nova (E)</span> - Freeze all enemies</p>
                  <p><span className="text-white">🔥 Harvest Rage (R)</span> - 2x damage & fire rate</p>
                  <p><span className="text-white">🔧 Emergency Repair (F)</span> - Heal 50% barn health</p>
                </div>
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold mb-1">🦃 Enemy Types</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-white">Standard</span> - Basic enemy</p>
                  <p><span className="text-white">Runner</span> - Fast but weak</p>
                  <p><span className="text-white">Tank</span> - Slow but tough</p>
                  <p><span className="text-white">Healer</span> - Heals nearby turkeys</p>
                  <p><span className="text-white">Splitter</span> - Splits into smaller turkeys</p>
                  <p><span className="text-white">Boss</span> - Very tough with phases!</p>
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
          <div className="text-5xl font-black text-white mb-8">⏸️ PAUSED</div>
          <div className="space-y-3">
            <button onClick={() => { setPaused(false); if (stateRef.current) stateRef.current.paused = false; audioManager.playSound('click'); }}
              className="block w-48 bg-green-600 text-white py-3 rounded-lg hover:bg-green-500 transition text-lg font-bold">Resume</button>
            <button onClick={() => { setSettingsOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg">Settings</button>
            <button onClick={() => { setHelpOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg">Help</button>
          </div>
        </div>
      )}

      {/* Game over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
          <div className="text-6xl mb-4">💀🦃</div>
          <h1 className="text-5xl font-black text-red-500 mb-2">GAME OVER</h1>
          <div className="text-3xl text-white mb-2">Score: {stats.score}</div>
          <div className="text-xl text-gray-400 mb-2">Wave {stats.wave} {endlessMode && '(Endless)'}</div>
          <div className="text-gray-500 mb-8">Turrets placed: {turrets.length}</div>
          <div className="space-y-3">
            <button onClick={() => gameRef.current?.restart()}
              className="block w-48 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:scale-105 transition text-lg font-bold">Play Again</button>
            <button onClick={() => { setAchievementsOpen(true); audioManager.playSound('click'); }}
              className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition">View Achievements</button>
          </div>
        </div>
      )}
    </div>
  );
}
