/**
 * GameEngine - Complete game engine with Three.js scene management
 *
 * This class manages all game state and rendering independently of React.
 * The React component only handles UI overlay and instantiates this engine.
 */

import * as THREE from 'three';
import { SpatialHashGrid2D } from './SpatialHashGrid2D.js';
import { BuildingValidator } from './BuildingValidator.js';
import { DamageManager, DamageVisualizer, DamageType } from './DamageManager.js';
import { StabilityOptimizer } from './StabilityOptimizer.js';
import {
  WeaponTypes,
  ZombieTypes,
  HouseUpgrades,
  TurretTypes,
  AbilityTypes
} from './GameConfig.js';

// Re-export config for convenience
export { WeaponTypes, ZombieTypes, HouseUpgrades, TurretTypes, AbilityTypes };

/**
 * Game state snapshot for serialization
 */
export class StateSnapshot {
  constructor(state) {
    this.timestamp = Date.now();
    this.wave = state.wave;
    this.score = state.score;
    this.currency = state.currency;
    this.barnHealth = state.barn?.health ?? 175;
    this.barnMaxHealth = state.barn?.maxHealth ?? 175;
    this.playerPos = state.player?.pos?.clone() ?? new THREE.Vector3();
    this.turretCount = state.turrets?.length ?? 0;
    this.zombieCount = state.zombies?.length ?? 0;
    this.projectileCount = state.projectiles?.length ?? 0;
  }
}

/**
 * Main game engine class - handles all game logic and Three.js rendering
 */
export class GameEngine {
  constructor(options = {}) {
    // Configuration
    this.config = {
      spatialCellSize: 5,
      maxZombies: 500,
      maxProjectiles: 200,
      collisionRadius: 2.0,
      turretMinDistance: 5,
      turretMaxDistance: 35,
      ...options
    };

    // Three.js components (initialized in init())
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationId = null;

    // Scene objects
    this.playerGroup = null;
    this.houseGroup = null;
    this.turretPreview = null;
    this.houseDoors = [];
    this.houseWindows = [];

    // Particle system
    this.particles = [];
    this.maxParticles = 500;
    this.particleGeo = null;
    this.particleSystem = null;

    // Snow system
    this.leafCount = 50;  // snowflake count
    this.leafData = [];   // snowflake animation data
    this.leafGeo = null;

    // Camera settings
    this.cameraMode = 'ISOMETRIC';
    this.zoom = 1.0;
    this.cameraAngle = Math.PI; // Camera behind player so W moves "forward" on screen
    this.panOffset = new THREE.Vector3();
    this.baseCamPos = new THREE.Vector3(0, 32, 40);
    this.topDownPos = new THREE.Vector3(0, 60, 0);
    this.pointerLocked = false;

    // Audio manager reference (passed from React)
    this.audioManager = null;

    // User settings (can be updated from React)
    this.settings = {
      playerSpeed: 8,
      mouseSensitivity: 1.0,
      invertY: false,
      screenShake: 1.0,
      zoomSensitivity: 1.0,
      zoomMin: 0.5,
      zoomMax: 2.0,
      panSpeed: 20,
      cameraSmoothing: 0.1,
      fov: 50,
      particleCount: 500,
      shadowQuality: 'MEDIUM',
      antialiasing: true
    };

    // Core game state
    this.state = {
      started: false,
      gameOver: false,
      paused: false,
      endlessMode: false,

      player: {
        pos: new THREE.Vector3(0, 0, 10),
        rot: 0,
        pitch: 0,
        health: 100,
        maxHealth: 100,
        isInside: false,
        invulnTimer: 0
      },

      barn: {
        health: 175,
        maxHealth: 175,
        pos: new THREE.Vector3(0, 0, 0)
      },

      house: {
        pos: new THREE.Vector3(0, 0, 0),
        doors: [],
        windows: []
      },

      zombies: [],
      projectiles: [],
      turretProjectiles: [],
      turrets: [],

      wave: 0,
      toSpawn: 0,
      totalSpawnedThisWave: 0,
      expectedThisWave: 0,
      spawnTimer: 0,
      currency: 100,
      score: 0,

      currentWeapon: 'PITCHFORK',
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
        houseArmor: 0,
        weaponDamage: 0,
        fireRate: 0,
        playerHealth: 0,
        houseLevel: 0
      },

      placingTurret: null
    };

    // Spawn tracking
    this.spawnedCounts = {};

    // Spatial indexing
    this.zombieGrid = new SpatialHashGrid2D(this.config.spatialCellSize);
    this.turretGrid = new SpatialHashGrid2D(this.config.spatialCellSize);

    // Building systems
    this.buildingValidator = new BuildingValidator({
      minDistanceFromBarn: this.config.turretMinDistance,
      maxDistanceFromBarn: this.config.turretMaxDistance
    });
    this.damageManager = new DamageManager(this.buildingValidator);
    this.damageVisualizer = null;
    this.stabilityOptimizer = null;

    // Performance metrics
    this.metrics = {
      entityCount: 0,
      collisionChecks: 0,
      lastFrameTime: 0,
      avgFrameTime: 16.67,
      spatialQueries: 0,
      fps: 60
    };

    // Frame timing
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsTime = 0;

    // Event callbacks for React UI updates
    this.callbacks = {
      onStatsUpdate: null,
      onWeaponChange: null,
      onBannerChange: null,
      onGameOver: null,
      onWaveComplete: null,
      onLowHealth: null,
      onHitMarker: null,
      onPauseChange: null,
      onTurretsChange: null,
      onAbilitiesUpdate: null,
      onFpsUpdate: null,
      onWaitingForWave: null,
      onPointerLockChange: null
    };

    // Bound event handlers (for cleanup)
    this._boundHandlers = {};
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize the game engine with a container element
   * @param {HTMLElement} container - The container element for the renderer
   * @param {Object} audioManager - The audio manager instance
   */
  init(container, audioManager) {
    if (this.scene) return; // Already initialized

    this.container = container;
    this.audioManager = audioManager;

    this._initScene();
    this._initLighting();
    this._initGround();
    this._initParticleSystem();
    this._initSnow();
    this._initPlayer();
    this._initHouse();
    this._initTurretPreview();
    this._initTrees();
    this._initMountains();
    this._initInputHandlers();
    this._initDamageSystems();

    // Start the game loop
    this._animate();

    // Handle window resize
    this._boundHandlers.resize = this._onResize.bind(this);
    window.addEventListener('resize', this._boundHandlers.resize);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8c8d8);  // Cold winter gray-blue
    this.scene.fog = new THREE.Fog(0xb8c8d8, 40, 110);

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  _initLighting() {
    // Winter lighting - cooler tones
    this.scene.add(new THREE.AmbientLight(0xd0e0f0, 0.5));

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
    sun.shadow.camera.right = sun.shadow.camera.top = 80;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 150;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x8899aa, 0.25);  // Cool blue fill
    fillLight.position.set(-25, 15, 0);
    this.scene.add(fillLight);

    this.scene.add(new THREE.HemisphereLight(0xb8c8d8, 0x4a4a4a, 0.35));  // Winter sky/ground
  }

  _initGround() {
    const groundGeo = new THREE.PlaneGeometry(150, 150, 40, 40);
    const positions = groundGeo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] = Math.sin(positions[i] * 0.08) * Math.cos(positions[i + 1] * 0.08) * 0.4;
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x8a9a7a, roughness: 0.95 })  // Winter faded grass
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Path indicators (rings around barn)
    [8, 16, 24].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.1, r + 0.1, 64),
        new THREE.MeshBasicMaterial({
          color: [0x88ff88, 0xffff88, 0xff8888][i],
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      this.scene.add(ring);
    });
  }

  _initParticleSystem() {
    this.particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(this.maxParticles * 3);
    const pColors = new Float32Array(this.maxParticles * 3);
    const pSizes = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      pPositions[i * 3 + 1] = -1000;
      pSizes[i] = 0;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(this.particleGeo, particleMat);
    this.scene.add(this.particleSystem);
  }

  _initSnow() {
    this.leafGeo = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(this.leafCount * 3);
    const snowColors = new Float32Array(this.leafCount * 3);
    const snowflakeColors = [0xffffff, 0xf0f4f8, 0xe8f0f8, 0xf8fcff];  // White/light blue

    for (let i = 0; i < this.leafCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 80;
      snowPositions[i * 3 + 1] = Math.random() * 25 + 5;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      const col = new THREE.Color(snowflakeColors[Math.floor(Math.random() * snowflakeColors.length)]);
      snowColors[i * 3] = col.r;
      snowColors[i * 3 + 1] = col.g;
      snowColors[i * 3 + 2] = col.b;

      this.leafData.push({
        fallSpeed: 0.3 + Math.random() * 0.4,  // Slower fall for snow
        swaySpeed: 0.5 + Math.random() * 1,    // Gentler sway
        swayAmt: 0.3 + Math.random() * 0.8,    // Less horizontal drift
        rot: Math.random() * Math.PI * 2
      });
    }

    this.leafGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    this.leafGeo.setAttribute('color', new THREE.BufferAttribute(snowColors, 3));

    const snowMat = new THREE.PointsMaterial({
      size: 0.25,  // Smaller for snowflakes
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.scene.add(new THREE.Points(this.leafGeo, snowMat));
  }

  _initPlayer() {
    this.playerGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4169e1, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.7 });

    // Torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 0.6, 10),
      bodyMat
    );
    torso.position.y = 0.7;
    torso.castShadow = true;
    this.playerGroup.add(torso);

    // Legs
    const legs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 0.4, 10),
      bodyMat
    );
    legs.position.y = 0.2;
    legs.castShadow = true;
    this.playerGroup.add(legs);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      skinMat
    );
    head.position.y = 1.22;
    head.castShadow = true;
    this.playerGroup.add(head);

    // Hat brim (straw hat)
    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.38, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 })
    );
    hatBrim.position.y = 1.42;
    this.playerGroup.add(hatBrim);

    // Hat top
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 })
    );
    hatTop.position.y = 1.52;
    this.playerGroup.add(hatTop);

    this.playerGroup.position.set(0, 0, 10);
    this.scene.add(this.playerGroup);
  }

  _initHouse() {
    this._buildHouse(0); // Start with BASIC house
  }

  _buildHouse(level) {
    // Remove old house if exists
    if (this.houseGroup) {
      this.scene.remove(this.houseGroup);
    }

    const houseKey = Object.keys(HouseUpgrades)[level] || 'BASIC';
    const house = HouseUpgrades[houseKey];
    const { width, depth, height, roofHeight, doors, windows, doorHealth, windowHealth } = house;

    this.houseGroup = new THREE.Group();
    this.houseDoors = [];
    this.houseWindows = [];

    // Store dimensions in userData
    this.houseGroup.userData = { width, depth, height, roofHeight, level: houseKey };

    // Foundation
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 })
    );
    foundation.position.y = 0.15;
    foundation.receiveShadow = true;
    this.houseGroup.add(foundation);

    // Main walls - DoubleSide so walls are visible from inside
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85, side: THREE.DoubleSide });

    // Front wall with door hole
    const frontWall = this._createWallWithOpening(width, height, 1.8, 2.5, 'door');
    frontWall.position.set(0, height / 2 + 0.3, depth / 2);
    this.houseGroup.add(frontWall);

    // Back wall (with door if level > 1)
    if (doors >= 2) {
      const backWall = this._createWallWithOpening(width, height, 1.8, 2.5, 'door');
      backWall.position.set(0, height / 2 + 0.3, -depth / 2);
      backWall.rotation.y = Math.PI;
      this.houseGroup.add(backWall);
    } else {
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.3),
        wallMat
      );
      backWall.position.set(0, height / 2 + 0.3, -depth / 2);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      this.houseGroup.add(backWall);
    }

    // Side walls with windows
    const windowsPerSide = Math.ceil(windows / 2);
    const leftWall = this._createWallWithWindows(depth, height, windowsPerSide);
    leftWall.position.set(-width / 2, height / 2 + 0.3, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.houseGroup.add(leftWall);

    const rightWall = this._createWallWithWindows(depth, height, windowsPerSide);
    rightWall.position.set(width / 2, height / 2 + 0.3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.houseGroup.add(rightWall);

    // Third door on side (if level >= 3)
    if (doors >= 3) {
      // Add side door
    }

    // Roof - DoubleSide for interior visibility
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.8, roofHeight, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(
      roofGeo,
      new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide })
    );
    roof.position.y = height + roofHeight / 2;
    roof.castShadow = true;
    this.houseGroup.add(roof);

    // Create door panels (interactive)
    this._createDoor(new THREE.Vector3(0, 1.25 + 0.3, depth / 2 + 0.16), doorHealth, 'front');
    if (doors >= 2) {
      this._createDoor(new THREE.Vector3(0, 1.25 + 0.3, -depth / 2 - 0.16), doorHealth, 'back');
    }

    // Create windows (interactive)
    this._createWindowsOnWalls(windowsPerSide, depth, height, width, windowHealth);

    this.scene.add(this.houseGroup);
    this.state.house.pos.set(0, 0, 0);
    this.state.house.doors = this.houseDoors;
    this.state.house.windows = this.houseWindows;
  }

  _createWallWithOpening(width, height, openingWidth, openingHeight, type) {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85, side: THREE.DoubleSide });
    const thickness = 0.3;

    // Left section
    const leftWidth = (width - openingWidth) / 2;
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(leftWidth, height, thickness),
      wallMat
    );
    leftWall.position.x = -width / 2 + leftWidth / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Right section
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(leftWidth, height, thickness),
      wallMat
    );
    rightWall.position.x = width / 2 - leftWidth / 2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Top section (above opening)
    const topHeight = height - openingHeight;
    if (topHeight > 0) {
      const topWall = new THREE.Mesh(
        new THREE.BoxGeometry(openingWidth, topHeight, thickness),
        wallMat
      );
      topWall.position.y = height / 2 - topHeight / 2;
      topWall.castShadow = true;
      topWall.receiveShadow = true;
      group.add(topWall);
    }

    return group;
  }

  _createWallWithWindows(width, height, windowCount) {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85, side: THREE.DoubleSide });
    const thickness = 0.3;

    // For simplicity, create solid wall - windows are added separately
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      wallMat
    );
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    return group;
  }

  _createDoor(position, health, name) {
    const doorGroup = new THREE.Group();
    doorGroup.position.copy(position);

    // Door frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.6, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 })
    );
    doorGroup.add(frame);

    // Door panel (destructible)
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 })
    );
    panel.position.z = 0.05;
    panel.castShadow = true;
    doorGroup.add(panel);

    this.houseGroup.add(doorGroup);

    const doorData = {
      mesh: doorGroup,
      panel,
      health,
      maxHealth: health,
      destroyed: false,
      name
    };
    this.houseDoors.push(doorData);
  }

  _createWindowsOnWalls(countPerSide, depth, height, width, windowHealth) {
    // Create windows on left and right walls
    const spacing = depth / (countPerSide + 1);

    for (let i = 0; i < countPerSide; i++) {
      const z = -depth / 2 + spacing * (i + 1);

      // Left wall window
      this._createWindow(
        new THREE.Vector3(-width / 2 - 0.16, height / 2 + 0.3, z),
        windowHealth,
        `left_${i}`
      );

      // Right wall window
      this._createWindow(
        new THREE.Vector3(width / 2 + 0.16, height / 2 + 0.3, z),
        windowHealth,
        `right_${i}`
      );
    }
  }

  _createWindow(position, health, name) {
    const windowGroup = new THREE.Group();
    windowGroup.position.copy(position);

    // Window frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.2, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 })
    );
    windowGroup.add(frame);

    // Glass (destructible)
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.0, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1
      })
    );
    windowGroup.add(glass);

    // Rotate to face outward based on position
    if (position.x < 0) {
      windowGroup.rotation.y = Math.PI / 2;
    } else {
      windowGroup.rotation.y = -Math.PI / 2;
    }

    this.houseGroup.add(windowGroup);

    const windowData = {
      mesh: windowGroup,
      glass,
      health,
      maxHealth: health,
      destroyed: false,
      name
    };
    this.houseWindows.push(windowData);
  }

  _initTurretPreview() {
    this.turretPreview = new THREE.Group();

    const previewBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.3, 12),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
    );
    this.turretPreview.add(previewBase);
    this.turretPreview.userData.base = previewBase;

    const previewRange = new THREE.Mesh(
      new THREE.RingGeometry(0, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    previewRange.rotation.x = -Math.PI / 2;
    previewRange.position.y = 0.01;
    this.turretPreview.add(previewRange);
    this.turretPreview.userData.rangeIndicator = previewRange;

    this.turretPreview.visible = false;
    this.scene.add(this.turretPreview);
  }

  _initTrees() {
    // Place trees around the entire perimeter of the map - dense treeline
    const mapEdge = 65; // Position trees just outside the playable area
    const treeSpacing = 3; // Reduced spacing for denser trees
    const treeVariation = 1.5; // Random position variation

    // Create multiple rows of trees for a dense forest edge
    const treeRows = [0, 5, 10]; // Three rows at different depths

    treeRows.forEach(rowOffset => {
      const edgePos = mapEdge + rowOffset;

      // North edge
      for (let x = -edgePos; x <= edgePos; x += treeSpacing) {
        const xPos = x + (Math.random() - 0.5) * treeVariation;
        const zPos = -edgePos + (Math.random() - 0.5) * treeVariation;
        this._createTree(xPos, zPos);
      }

      // South edge
      for (let x = -edgePos; x <= edgePos; x += treeSpacing) {
        const xPos = x + (Math.random() - 0.5) * treeVariation;
        const zPos = edgePos + (Math.random() - 0.5) * treeVariation;
        this._createTree(xPos, zPos);
      }

      // East edge (excluding corners already covered)
      for (let z = -edgePos + treeSpacing; z < edgePos; z += treeSpacing) {
        const xPos = edgePos + (Math.random() - 0.5) * treeVariation;
        const zPos = z + (Math.random() - 0.5) * treeVariation;
        this._createTree(xPos, zPos);
      }

      // West edge (excluding corners already covered)
      for (let z = -edgePos + treeSpacing; z < edgePos; z += treeSpacing) {
        const xPos = -edgePos + (Math.random() - 0.5) * treeVariation;
        const zPos = z + (Math.random() - 0.5) * treeVariation;
        this._createTree(xPos, zPos);
      }
    });
  }

  _createTree(x, z) {
    const treeGroup = new THREE.Group();

    const trunkHeight = 3 + Math.random() * 2;
    const trunkRadius = 0.25 + Math.random() * 0.15;

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 })
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // 30% chance for snow-covered pine tree, 70% bare deciduous tree
    const isPine = Math.random() < 0.3;

    if (isPine) {
      // Snow-covered pine tree
      const foliageRadius = 1.5 + Math.random() * 0.5;
      const foliageHeight = 3 + Math.random() * 1.5;

      // Dark green pine foliage
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(foliageRadius, foliageHeight, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.9 })
      );
      foliage.position.y = trunkHeight + foliageHeight / 2;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      // Snow cap on top
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(foliageRadius * 0.85, foliageHeight * 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      );
      snowCap.position.y = trunkHeight + foliageHeight * 0.85;
      treeGroup.add(snowCap);
    } else {
      // Bare winter tree with branches
      const branchMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.95 });
      const branchCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < branchCount; i++) {
        const branchLength = 1 + Math.random() * 1.5;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.08, branchLength, 6),
          branchMat
        );

        const yPos = trunkHeight * (0.5 + Math.random() * 0.4);
        branch.position.set(0, yPos, 0);
        branch.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6);
        branch.rotation.y = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;

        treeGroup.add(branch);

        // Add smaller sub-branches
        if (Math.random() > 0.4) {
          const subBranch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.04, branchLength * 0.5, 4),
            branchMat
          );
          subBranch.position.set(branchLength * 0.35, 0, 0);
          subBranch.rotation.z = (Math.random() - 0.5) * 0.8;
          branch.add(subBranch);
        }
      }
    }

    // Position and add slight random rotation
    treeGroup.position.set(x, 0, z);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;

    // Random scale variation
    const scale = 0.8 + Math.random() * 0.5;
    treeGroup.scale.setScalar(scale);

    this.scene.add(treeGroup);
  }

  _initMountains() {
    // Configuration
    const ringRadius = 90;
    const radiusVariation = 8;
    const primaryPeakCount = 28;
    const clustersPerPeak = 2;
    const clusterSpread = 8;

    // Color palette (muted purple/blue-gray for atmospheric depth)
    const colors = [
      new THREE.Color(0x5a4a6a),  // Purple-gray
      new THREE.Color(0x6a5a7a),  // Light purple-gray
      new THREE.Color(0x4a4a5a),  // Blue-gray
      new THREE.Color(0x7a6a5a),  // Warm brown-gray
    ];

    // Geometries (low-poly cones with 6 sides)
    const largeGeo = new THREE.ConeGeometry(10, 28, 6, 1);
    const smallGeo = new THREE.ConeGeometry(5, 14, 6, 1);
    const snowCapGeo = new THREE.ConeGeometry(3, 5, 6, 1);

    // Materials
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a6a,
      roughness: 0.95,
      flatShading: true,
    });

    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      roughness: 0.7,
      flatShading: true,
    });

    // Create InstancedMeshes
    const totalSmall = primaryPeakCount * clustersPerPeak;
    const largeMountains = new THREE.InstancedMesh(largeGeo, mountainMat, primaryPeakCount);
    const smallMountains = new THREE.InstancedMesh(smallGeo, mountainMat.clone(), totalSmall);
    const snowCaps = new THREE.InstancedMesh(snowCapGeo, snowMat, primaryPeakCount);

    // Disable shadows (outside shadow camera bounds at ±80)
    largeMountains.castShadow = false;
    largeMountains.receiveShadow = false;
    smallMountains.castShadow = false;
    smallMountains.receiveShadow = false;
    snowCaps.castShadow = false;
    snowCaps.receiveShadow = false;

    // Temp objects for matrix composition
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    // Position primary peaks around ring with snow caps
    for (let i = 0; i < primaryPeakCount; i++) {
      const angle = (i / primaryPeakCount) * Math.PI * 2;
      const radius = ringRadius + (Math.random() - 0.5) * radiusVariation;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.8 + Math.random() * 0.5;
      const height = 28 * scale;

      // Mountain peak
      tempPos.set(x, height * 0.5, z);
      tempQuat.identity();
      tempScale.set(scale, scale, scale);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      largeMountains.setMatrixAt(i, tempMatrix);
      largeMountains.setColorAt(i, colors[Math.floor(Math.random() * colors.length)]);

      // Snow cap on top
      const snowScale = scale * 0.8;
      tempPos.set(x, height - 2 * scale, z);
      tempScale.set(snowScale, snowScale, snowScale);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      snowCaps.setMatrixAt(i, tempMatrix);
    }

    // Position cluster peaks (smaller, no snow caps)
    let idx = 0;
    for (let i = 0; i < primaryPeakCount; i++) {
      const primaryAngle = (i / primaryPeakCount) * Math.PI * 2;
      for (let c = 0; c < clustersPerPeak; c++) {
        const angle = primaryAngle + (Math.random() - 0.5) * 0.4;
        const radius = ringRadius + (Math.random() - 0.5) * clusterSpread * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const scale = 0.4 + Math.random() * 0.4;
        const height = 14 * scale;

        tempPos.set(x, height * 0.5, z);
        tempScale.set(scale, scale, scale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        smallMountains.setMatrixAt(idx, tempMatrix);
        smallMountains.setColorAt(idx, colors[Math.floor(Math.random() * colors.length)]);
        idx++;
      }
    }

    // Update instance buffers
    largeMountains.instanceMatrix.needsUpdate = true;
    largeMountains.instanceColor.needsUpdate = true;
    smallMountains.instanceMatrix.needsUpdate = true;
    smallMountains.instanceColor.needsUpdate = true;
    snowCaps.instanceMatrix.needsUpdate = true;

    // Add to scene
    this.scene.add(largeMountains);
    this.scene.add(smallMountains);
    this.scene.add(snowCaps);
  }

  _initDamageSystems() {
    this.damageVisualizer = new DamageVisualizer(this.scene);
    this.stabilityOptimizer = new StabilityOptimizer(this.buildingValidator);
  }

  // ========================================
  // INPUT HANDLING
  // ========================================

  _initInputHandlers() {
    this._boundHandlers.keyDown = this._onKeyDown.bind(this);
    this._boundHandlers.keyUp = this._onKeyUp.bind(this);
    this._boundHandlers.mouseDown = this._onMouseDown.bind(this);
    this._boundHandlers.mouseUp = this._onMouseUp.bind(this);
    this._boundHandlers.mouseMove = this._onMouseMove.bind(this);
    this._boundHandlers.wheel = this._onWheel.bind(this);
    this._boundHandlers.pointerLockChange = this._onPointerLockChange.bind(this);

    window.addEventListener('keydown', this._boundHandlers.keyDown);
    window.addEventListener('keyup', this._boundHandlers.keyUp);
    this.renderer.domElement.addEventListener('mousedown', this._boundHandlers.mouseDown);
    this.renderer.domElement.addEventListener('mouseup', this._boundHandlers.mouseUp);
    this.renderer.domElement.addEventListener('mousemove', this._boundHandlers.mouseMove);
    this.renderer.domElement.addEventListener('wheel', this._boundHandlers.wheel);
    document.addEventListener('pointerlockchange', this._boundHandlers.pointerLockChange);
  }

  _onKeyDown(e) {
    this._handleKey(e, true);
  }

  _onKeyUp(e) {
    this._handleKey(e, false);
  }

  _handleKey(e, down) {
    const map = {
      KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
      ArrowUp: 'panUp', ArrowDown: 'panDown',
      ArrowLeft: 'panLeft', ArrowRight: 'panRight'
    };

    if (map[e.code]) {
      this.state.input[map[e.code]] = down;
    }

    if (down) {
      // Weapon switching
      const weaponKeys = Object.keys(WeaponTypes);
      if (e.code === 'Digit1' || e.code === 'Numpad1') this.setWeapon(weaponKeys[0]);
      if (e.code === 'Digit2' || e.code === 'Numpad2') this.setWeapon(weaponKeys[1]);
      if (e.code === 'Digit3' || e.code === 'Numpad3') this.setWeapon(weaponKeys[2]);
      if (e.code === 'Digit4' || e.code === 'Numpad4') this.setWeapon(weaponKeys[3]);

      // Next wave
      if ((e.code === 'Space' || e.code === 'KeyN')) {
        this.startWave();
      }

      // Camera rotation
      if (e.code === 'Comma') {
        this.cameraAngle += Math.PI / 4;
        this.audioManager?.playSound('click');
      }
      if (e.code === 'Period') {
        this.cameraAngle -= Math.PI / 4;
        this.audioManager?.playSound('click');
      }

      // Reset camera
      if (e.code === 'KeyZ') {
        this.panOffset.set(0, 0, 0);
        this.cameraAngle = Math.PI; // Reset to default behind-player view
        this.audioManager?.playSound('click');
      }
    }
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      // Left click
      if (this.state.placingTurret && this.turretPreview.visible) {
        this._placeTurretAtPreview();
      } else {
        this.state.input.firing = true;

        // Request pointer lock in FPS mode
        if (this.cameraMode === 'FIRST_PERSON' && !this.pointerLocked) {
          this.renderer.domElement.requestPointerLock();
        }
      }
    } else if (e.button === 2) {
      // Right click - cancel turret placement
      if (this.state.placingTurret) {
        this.cancelTurretPlacement();
      }
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) {
      this.state.input.firing = false;
    }
  }

  _onMouseMove(e) {
    if (this.cameraMode === 'FIRST_PERSON' && this.pointerLocked) {
      // FPS mouse look with sensitivity and invert settings
      const sens = this.settings.mouseSensitivity * 0.002;
      const xMult = this.settings.invertX ? 1 : -1;
      const yMult = this.settings.invertY ? 1 : -1;
      this.state.player.rot += e.movementX * sens * xMult;
      this.state.player.pitch += e.movementY * sens * yMult;
      this.state.player.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.state.player.pitch));
    } else {
      // Update aim position from mouse
      this._updateAimFromMouse(e);
    }

    // Update turret preview position
    if (this.state.placingTurret) {
      this._updateTurretPreview(e);
    }
  }

  _updateAimFromMouse(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      this.state.aim.copy(intersection);
    }
  }

  _updateTurretPreview(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      this.turretPreview.position.copy(intersection);

      // Validate placement
      const dist = intersection.distanceTo(this.state.house.pos);
      const valid = dist >= this.config.turretMinDistance && dist <= this.config.turretMaxDistance;

      // Update preview color
      const color = valid ? 0x00ff00 : 0xff0000;
      this.turretPreview.children.forEach(child => {
        if (child.material) {
          child.material.color.setHex(color);
        }
      });

      this.turretPreview.visible = true;
    }
  }

  _onWheel(e) {
    // Zoom control with settings
    const zoomDelta = e.deltaY * 0.001 * this.settings.zoomSensitivity;
    this.zoom = Math.max(this.settings.zoomMin, Math.min(this.settings.zoomMax, this.zoom - zoomDelta));
  }

  _onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this._emitCallback('onPointerLockChange', this.pointerLocked);
  }

  _onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // ========================================
  // GAME LOOP
  // ========================================

  _animate() {
    this.animationId = requestAnimationFrame(this._animate.bind(this));

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // FPS calculation
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.metrics.fps = Math.round(this.frameCount / this.fpsTime);
      this._emitCallback('onFpsUpdate', this.metrics.fps);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    if (!this.state.paused && !this.state.gameOver) {
      this._updateGame(dt, now / 1000);
    }

    this._updateCamera(dt);
    this._updateVisuals(dt, now / 1000);

    this.renderer.render(this.scene, this.camera);
  }

  _updateGame(dt, t) {
    if (!this.state.started) return;

    this._updatePlayer(dt, t);
    this._updateZombies(dt, t);
    this._updateProjectiles(dt);
    this._updateTurrets(dt);
    this._updateSpawning(dt);
    this._updateAbilities(dt);
    this._updateDamageSystem(dt);

    // Check wave completion - requires:
    // 1. Wave has started (wave > 0)
    // 2. All enemies spawned (toSpawn === 0)
    // 3. All spawned enemies are dead
    // 4. At least one enemy was spawned this wave (prevents instant completion)
    // 5. Not already marked complete
    const allSpawned = this.state.toSpawn === 0;
    const allDead = this.state.zombies.filter(tk => !tk.dead).length === 0;
    const enemiesWereSpawned = this.state.totalSpawnedThisWave > 0 && this.state.totalSpawnedThisWave >= this.state.expectedThisWave;

    if (this.state.wave > 0 && allSpawned && allDead && enemiesWereSpawned && !this.state.waveComplete) {
      this._onWaveComplete();
    }

    // Update stats for UI
    this._updateStats();
  }

  _updatePlayer(dt, t) {
    // Movement
    const speed = this.settings.playerSpeed;
    const move = new THREE.Vector3();

    if (this.state.input.w) move.z -= 1;
    if (this.state.input.s) move.z += 1;
    if (this.state.input.a) move.x -= 1;
    if (this.state.input.d) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize();

      // Apply rotation based on camera mode and settings
      if (this.cameraMode === 'FIRST_PERSON') {
        // In FPS mode, movement relative to look direction (add PI to align with look vector)
        move.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.player.rot + Math.PI);
      } else if (this.settings.cameraRelativeMovement) {
        // In other modes, optionally rotate movement to match camera angle
        move.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngle);
      }

      const newPos = this.state.player.pos.clone().addScaledVector(move, speed * dt);

      // House collision
      this._handleHouseCollision(newPos);

      // World bounds
      newPos.x = Math.max(-45, Math.min(45, newPos.x));
      newPos.z = Math.max(-45, Math.min(45, newPos.z));

      this.state.player.pos.copy(newPos);
      this.playerGroup.position.copy(this.state.player.pos);
    }

    // Bobbing animation
    this.playerGroup.position.y = Math.abs(Math.sin(t * 12)) * 0.05;

    // Rotation (aiming) - non-FPS modes
    if (this.cameraMode !== 'FIRST_PERSON') {
      const dir = new THREE.Vector3().subVectors(this.state.aim, this.state.player.pos).setY(0);
      if (dir.lengthSq() > 0.01) {
        this.state.player.rot = Math.atan2(dir.x, dir.z);
        this.playerGroup.rotation.y = this.state.player.rot;
      }
    } else {
      this.playerGroup.rotation.y = this.state.player.rot;
    }

    // Invulnerability timer
    if (this.state.player.invulnTimer > 0) {
      this.state.player.invulnTimer -= dt;
    }

    // Shooting
    if (this.state.shootTimer > 0) this.state.shootTimer -= dt;
    if (this.state.input.firing && this.state.shootTimer <= 0) {
      this._fireWeapon();
    }
  }

  _handleHouseCollision(newPos) {
    const houseData = this.houseGroup.userData;
    const halfW = houseData.width / 2;
    const halfD = houseData.depth / 2;
    const wallBuffer = 0.5;
    const doorHalfWidth = 0.9; // Door opening is 1.8 wide, so half is 0.9

    // Check if position is in the interior zone
    const inInteriorX = newPos.x > -halfW && newPos.x < halfW;
    const inInteriorZ = newPos.z > -halfD && newPos.z < halfD;
    
    // Check if position is at a door opening (X within door width)
    const atFrontDoor = Math.abs(newPos.x) < doorHalfWidth && newPos.z > 0;
    const atBackDoor = Math.abs(newPos.x) < doorHalfWidth && newPos.z < 0 && 
                       this.houseDoors.some(d => d.name === 'back');

    if (!this.state.player.isInside) {
      // Player is outside - check wall collisions individually
      
      // Front wall (positive Z) - allow through door only
      if (inInteriorX && newPos.z < halfD + wallBuffer && newPos.z > halfD - wallBuffer) {
        if (!atFrontDoor) {
          newPos.z = halfD + wallBuffer;
        } else if (newPos.z < halfD - wallBuffer) {
          // Entering through front door
          this.state.player.isInside = true;
        }
      }
      
      // Back wall (negative Z) - allow through door only if exists
      if (inInteriorX && newPos.z > -halfD - wallBuffer && newPos.z < -halfD + wallBuffer) {
        if (!atBackDoor) {
          newPos.z = -halfD - wallBuffer;
        } else if (newPos.z > -halfD + wallBuffer) {
          // Entering through back door
          this.state.player.isInside = true;
        }
      }
      
      // Left wall (negative X) - solid wall
      if (inInteriorZ && newPos.x > -halfW - wallBuffer && newPos.x < -halfW + wallBuffer) {
        newPos.x = -halfW - wallBuffer;
      }
      
      // Right wall (positive X) - solid wall
      if (inInteriorZ && newPos.x < halfW + wallBuffer && newPos.x > halfW - wallBuffer) {
        newPos.x = halfW + wallBuffer;
      }
      
      // Prevent corner clipping - if fully inside, push out to nearest edge
      if (newPos.x > -halfW + wallBuffer && newPos.x < halfW - wallBuffer &&
          newPos.z > -halfD + wallBuffer && newPos.z < halfD - wallBuffer) {
        // Calculate distances to each wall
        const distToFront = halfD - newPos.z;
        const distToBack = newPos.z + halfD;
        const distToLeft = newPos.x + halfW;
        const distToRight = halfW - newPos.x;
        
        // Find minimum distance and push out through that wall (or door)
        const minDist = Math.min(distToFront, distToBack, distToLeft, distToRight);
        
        if (minDist === distToFront) {
          if (atFrontDoor) {
            this.state.player.isInside = true;
          } else {
            newPos.z = halfD + wallBuffer;
          }
        } else if (minDist === distToBack) {
          if (atBackDoor) {
            this.state.player.isInside = true;
          } else {
            newPos.z = -halfD - wallBuffer;
          }
        } else if (minDist === distToLeft) {
          newPos.x = -halfW - wallBuffer;
        } else {
          newPos.x = halfW + wallBuffer;
        }
      }
    } else {
      // Player is inside - allow exit through doors
      if (atFrontDoor && newPos.z > halfD) {
        this.state.player.isInside = false;
      } else if (atBackDoor && newPos.z < -halfD) {
        this.state.player.isInside = false;
      } else {
        // Keep player inside bounds
        newPos.x = Math.max(-halfW + wallBuffer, Math.min(halfW - wallBuffer, newPos.x));
        newPos.z = Math.max(-halfD + wallBuffer, Math.min(halfD - wallBuffer, newPos.z));
      }
    }
  }

  _fireWeapon() {
    const weapon = WeaponTypes[this.state.currentWeapon];
    const rageBonus = this.state.rageActive > 0 ? AbilityTypes.RAGE.fireRateMultiplier : 1;
    const upgradeBonus = 1 + (this.state.upgrades.fireRate || 0) * 0.1;
    const rate = 1 / (weapon.fireRate * upgradeBonus * rageBonus);
    this.state.shootTimer = rate;

    // Direction to aim (3D trajectory)
    const dir = new THREE.Vector3().subVectors(this.state.aim, this.state.player.pos).normalize();

    const count = weapon.count || 1;
    const spread = weapon.spread || 0;

    for (let i = 0; i < count; i++) {
      const spreadAngle = (Math.random() - 0.5) * spread;
      const pDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
      const proj = this._createProjectile(pDir, this.state.currentWeapon, false);
      this.state.projectiles.push(proj);
    }

    // Screen shake (multiplied by settings)
    this.state.shakeIntensity = 0.2 * this.settings.screenShake;
    this.state.shakeDuration = 0.1;
  }

  _createProjectile(dir, weaponKey, fromTurret = false) {
    const wp = fromTurret ? TurretTypes[weaponKey] : WeaponTypes[weaponKey];
    const damageBonus = fromTurret ? 1 : (1 + (this.state.upgrades.weaponDamage || 0) * 0.15);
    const rageBonus = fromTurret ? 1 : (this.state.rageActive > 0 ? AbilityTypes.RAGE.damageMultiplier : 1);
    const finalDamage = wp.damage * damageBonus * rageBonus;

    let geo;
    if (fromTurret) {
      geo = new THREE.SphereGeometry(0.12, 8, 6);
    } else if (weaponKey === 'PITCHFORK') {
      geo = new THREE.ConeGeometry(0.055, 0.28, 6);
      geo.rotateX(Math.PI / 2);
    } else if (weaponKey === 'CORN_CANNON') {
      geo = new THREE.CylinderGeometry(0.09, 0.12, 0.35, 8);
      geo.rotateX(Math.PI / 2);
    } else if (weaponKey === 'EGG_BLASTER') {
      geo = new THREE.SphereGeometry(0.09, 10, 8);
      geo.scale(1, 1.3, 1);
    } else {
      geo = new THREE.SphereGeometry(0.22, 12, 10);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: wp.color,
      metalness: 0.3,
      roughness: 0.4,
      emissive: wp.color,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geo, mat);

    if (fromTurret) {
      mesh.position.copy(dir.origin);
      mesh.position.y = 1.2;
    } else {
      mesh.position.copy(this.state.player.pos).setY(0.9);
      mesh.position.addScaledVector(dir, 0.7);
    }
    mesh.castShadow = true;
    this.scene.add(mesh);

    if (!fromTurret) {
      this._emitParticles(mesh.position.clone(), 5, 0xffffaa, { x: 2, y: 2, z: 2 }, 0.15);
      this.audioManager?.playSound(wp.sound);
    } else {
      this.audioManager?.playSound('turret');
    }

    const vel = fromTurret
      ? dir.direction.clone().multiplyScalar(25)
      : dir.clone().multiplyScalar(wp.speed);

    return {
      mesh,
      vel,
      dmg: finalDamage,
      life: 0,
      hits: new Set(),
      pierce: fromTurret ? 0 : (wp.pierce || 0),
      splash: fromTurret ? (wp.splash || 0) : (wp.splash || 0),
      slow: fromTurret ? (wp.slow || 0) : (wp.slow || 0),
      slowDuration: fromTurret ? (wp.slowDuration || 2) : 2.5,
      arc: !fromTurret && wp.arc,
      startY: mesh.position.y,
      arcProg: 0,
      fromTurret
    };
  }

  _updateZombies(dt, t) {
    // Rebuild spatial grid
    this.zombieGrid.clear();
    for (const tk of this.state.zombies) {
      if (!tk.dead) {
        this.zombieGrid.insert(tk, tk.pos);
      }
    }

    for (const tk of this.state.zombies) {
      if (tk.dead) continue;

      // Target selection
      let targetPos;
      let targetIsHouse = false;

      if (this.state.player.isInside) {
        targetPos = this.state.house.pos.clone();
        targetIsHouse = true;
      } else {
        targetPos = this.state.player.pos.clone();
      }

      const dir = new THREE.Vector3().subVectors(targetPos, tk.pos).normalize();
      let speed = tk.spd * (tk.slowMult || 1);

      // Slow timer
      if (tk.slowTimer > 0) {
        tk.slowTimer -= dt;
        if (tk.slowTimer <= 0) tk.slowMult = 1;
      }

      // Global freeze
      if (this.state.globalFreeze > 0) {
        this.state.globalFreeze -= dt;
        speed = 0;
      }

      // Move zombie
      tk.pos.addScaledVector(dir, speed * dt);
      tk.mesh.position.copy(tk.pos);
      tk.mesh.lookAt(targetPos);
      tk.mesh.position.y = Math.abs(Math.sin(t * 10)) * 0.5;

      // Attack logic
      this._handleZombieAttack(tk, targetPos, targetIsHouse, dt);
    }
  }

  _handleZombieAttack(tk, targetPos, targetIsHouse, dt) {
    if (tk.attackCooldown > 0) tk.attackCooldown -= dt;

    if (targetIsHouse) {
      const distToHouse = tk.pos.distanceTo(this.state.house.pos);
      const houseRadius = Math.max(this.houseGroup.userData.width, this.houseGroup.userData.depth) / 2 + 1.5;

      if (distToHouse < houseRadius && (!tk.attackCooldown || tk.attackCooldown <= 0)) {
        tk.attackCooldown = 1.0;
        this._zombieAttackHouse(tk);
      }
    } else {
      const distToPlayer = tk.pos.distanceTo(this.state.player.pos);

      if (distToPlayer < 1.5 && (!tk.attackCooldown || tk.attackCooldown <= 0)) {
        tk.attackCooldown = 1.2;
        this._zombieAttackPlayer(tk);
      }
    }
  }

  _zombieAttackHouse(tk) {
    // Find nearest door or window
    let nearestEntry = null;
    let nearestDist = Infinity;

    for (const door of this.houseDoors) {
      if (!door.destroyed) {
        const doorPos = new THREE.Vector3();
        door.mesh.getWorldPosition(doorPos);
        const dist = tk.pos.distanceTo(doorPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEntry = { type: 'door', obj: door };
        }
      }
    }

    for (const win of this.houseWindows) {
      if (!win.destroyed) {
        const winPos = new THREE.Vector3();
        win.mesh.getWorldPosition(winPos);
        const dist = tk.pos.distanceTo(winPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEntry = { type: 'window', obj: win };
        }
      }
    }

    if (nearestEntry) {
      const dmg = tk.dmg * (1 - (this.state.upgrades.houseArmor || 0) * 0.1);
      nearestEntry.obj.health -= dmg;
      this.audioManager?.playSound('hurt');
      this._emitParticles(tk.pos.clone(), 5, 0x8b4513, { x: 1, y: 2, z: 1 }, 0.3);

      // Check destruction
      if (nearestEntry.obj.health <= 0) {
        nearestEntry.obj.destroyed = true;
        nearestEntry.obj.health = 0;

        if (nearestEntry.type === 'door') {
          nearestEntry.obj.panel.visible = false;
        } else {
          nearestEntry.obj.glass.visible = false;
        }

        this.audioManager?.playSound('explosion');
        this._emitCallback('onBannerChange', `${nearestEntry.type === 'door' ? 'Door' : 'Window'} destroyed!`);
        setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      }
    }
  }

  _zombieAttackPlayer(tk) {
    if (this.state.player.invulnTimer > 0) return;

    const dmg = tk.dmg;
    this.state.player.health -= dmg;
    this.state.player.invulnTimer = 0.5;

    this.audioManager?.playSound('hurt');
    this._emitParticles(this.state.player.pos.clone().setY(1), 10, 0xff0000, { x: 2, y: 3, z: 2 }, 0.4);

    this.state.shakeIntensity = 0.5;
    this.state.shakeDuration = 0.2;

    this._emitCallback('onLowHealth', this.state.player.health < 25);

    if (this.state.player.health <= 0) {
      this.state.player.health = 0;
      this.state.gameOver = true;
      this._emitCallback('onGameOver', { score: this.state.score, wave: this.state.wave });
      this.audioManager?.playSound('gameover');
    }
  }

  _updateProjectiles(dt) {
    // Player projectiles
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const p = this.state.projectiles[i];
      p.life += dt;

      // Arc trajectory for mortar
      if (p.arc) {
        p.arcProg += dt * 0.85;
        p.mesh.position.y = p.startY + Math.sin(p.arcProg * Math.PI) * 6;
      }

      // Move projectile
      p.mesh.position.addScaledVector(p.vel, dt);

      // Check collisions
      const hits = this._checkProjectileCollisions(p);
      for (const tk of hits) {
        this._damageZombie(tk, p.dmg, p);
        p.hits.add(tk);

        this._emitCallback('onHitMarker', tk.hp <= 0 ? 'kill' : 'hit');
        setTimeout(() => this._emitCallback('onHitMarker', null), 100);

        if (p.pierce <= 0) {
          this._removeProjectile(p, false);
          break;
        }
        p.pierce--;
      }

      // Splash damage
      if (p.splash > 0 && (hits.length > 0 || p.life > 2)) {
        this._createExplosion(p.mesh.position.clone(), p.splash);
        this._applySplashDamage(p.mesh.position, p.splash, p.dmg * 0.5);
        this._removeProjectile(p, false);
        continue;
      }

      // Remove if too old or out of bounds
      if (p.life > 5 || p.mesh.position.length() > 70) {
        this._removeProjectile(p, false);
      }
    }

    // Turret projectiles
    for (let i = this.state.turretProjectiles.length - 1; i >= 0; i--) {
      const p = this.state.turretProjectiles[i];
      p.life += dt;
      p.mesh.position.addScaledVector(p.vel, dt);

      const hits = this._checkProjectileCollisions(p);
      for (const tk of hits) {
        this._damageZombie(tk, p.dmg, p);

        if (p.splash > 0) {
          this._createExplosion(p.mesh.position.clone(), p.splash);
          this._applySplashDamage(p.mesh.position, p.splash, p.dmg * 0.5);
        }

        this._removeProjectile(p, true);
        break;
      }

      if (p.life > 3 || p.mesh.position.length() > 60) {
        this._removeProjectile(p, true);
      }
    }
  }

  _checkProjectileCollisions(projectile) {
    const nearby = this.zombieGrid.queryRadius(projectile.mesh.position, this.config.collisionRadius);
    const hits = [];

    for (const tk of nearby) {
      if (projectile.hits.has(tk) || tk.dead) continue;

      const dx = projectile.mesh.position.x - tk.pos.x;
      const dz = projectile.mesh.position.z - tk.pos.z;
      const distSq = dx * dx + dz * dz;
      const hitRadius = 0.7 * tk.scale;

      if (distSq < hitRadius * hitRadius) {
        hits.push(tk);
      }
    }

    return hits;
  }

  _damageZombie(tk, damage, projectile) {
    tk.hp -= damage;

    // Apply slow
    if (projectile.slow > 0) {
      tk.slowMult = 1 - projectile.slow;
      tk.slowTimer = projectile.slowDuration;
    }

    this.audioManager?.playSound('hit');
    this._emitParticles(tk.pos.clone().setY(0.5), 5, 0xff6666, { x: 1, y: 1, z: 1 }, 0.2);

    // Flash red on damage
    if (tk.body && tk.body.material) {
      tk.body.material.color.set(0xff0000);
      setTimeout(() => {
        if (tk.body && tk.body.material) {
          tk.body.material.color.set(ZombieTypes[tk.type].body);
        }
      }, 80);
    }

    if (tk.hp <= 0) {
      this._killZombie(tk);
    }
  }

  _killZombie(tk) {
    tk.dead = true;
    tk.mesh.visible = false;

    this.state.score += tk.val;
    this.state.currency += Math.ceil(tk.val / 2);

    this.audioManager?.playSound('kill');
    const bodyColor = tk.body?.material?.color?.getHex() || ZombieTypes[tk.type]?.body || 0x8b4513;
    this._emitParticles(tk.pos.clone(), 15, bodyColor, { x: 2, y: 3, z: 2 }, 0.5);

    // Bloater spawns mini zombies
    if (tk.type === 'SPLITTER') {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = new THREE.Vector3(Math.cos(angle) * 2, 0, Math.sin(angle) * 2);
        const mini = this._createZombie(tk.pos.clone().add(offset), 'SPLITTER', tk.scale * 0.6);
        mini.val = Math.floor(tk.val * 0.3);
        this.state.zombies.push(mini);
      }
    }
  }

  _removeProjectile(p, fromTurret) {
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();

    const arr = fromTurret ? this.state.turretProjectiles : this.state.projectiles;
    const idx = arr.indexOf(p);
    if (idx !== -1) arr.splice(idx, 1);
  }

  _updateTurrets(dt) {
    for (const turret of this.state.turrets) {
      if (turret.cooldown > 0) turret.cooldown -= dt;

      // Update health bar
      if (turret.healthBar && turret.healthBar.visible) {
        turret.healthBar.lookAt(this.camera.position);
      }

      // Find target
      const range = TurretTypes[turret.type].range;
      const nearby = this.zombieGrid.queryRadius(turret.mesh.position, range);

      let target = null;
      let minDist = range;

      for (const tk of nearby) {
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
          const proj = this._createProjectile({ origin: turret.mesh.position.clone(), direction: dir }, turret.type, true);
          this.state.turretProjectiles.push(proj);
        }
      }
    }
  }

  _updateSpawning(dt) {
    if (this.state.toSpawn <= 0 || this.state.gameOver || this.state.paused) return;

    this.state.spawnTimer -= dt;

    if (this.state.spawnTimer <= 0) {
      const type = this._getNextSpawnType();
      if (type) {
        this.spawnedCounts[type]++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 45 + Math.random() * 10;
        const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        const zombie = this._createZombie(pos, type);
        this.state.zombies.push(zombie);
        this.zombieGrid.insert(zombie, zombie.pos);
        this.state.toSpawn--;
        this.state.totalSpawnedThisWave++;

        const baseDelay = Math.max(0.5, 2.5 - this.state.wave * 0.15);
        this.state.spawnTimer = baseDelay * (0.8 + Math.random() * 0.4);
      }
    }
  }

  _getNextSpawnType() {
    const comp = this.state.waveComp;
    const available = Object.entries(comp).filter(([type]) => this.spawnedCounts[type] < comp[type]);
    if (available.length === 0) return null;

    const weights = { STANDARD: 5, RUNNER: 3, TANK: 2, HEALER: 2, SPLITTER: 2, BOSS: 1 };
    const weighted = available.flatMap(([type]) => Array(weights[type] || 1).fill(type));
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  _createZombie(pos, type, customScale = null) {
    const stats = ZombieTypes[type];
    const s = customScale || stats.scale;

    const group = new THREE.Group();

    // Humanoid torso
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.7, 10);
    const bodyMesh = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshStandardMaterial({ color: stats.body, roughness: 0.95 })
    );
    bodyMesh.position.y = 0.65;
    bodyMesh.scale.setScalar(s);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: stats.body, roughness: 0.95 });
    [-0.12, 0.12].forEach(x => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6),
        legMat
      );
      leg.position.set(x * s, 0.25 * s, 0);
      leg.scale.setScalar(s);
      group.add(leg);
    });

    // Head
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: stats.head, roughness: 0.8 })
    );
    headMesh.position.set(0, 1.15 * s, 0);
    headMesh.scale.setScalar(s);
    group.add(headMesh);

    // Arms (hanging down zombie-style)
    const armMat = new THREE.MeshStandardMaterial({ color: stats.body, roughness: 0.95 });
    [-0.35, 0.35].forEach((x, i) => {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6),
        armMat
      );
      arm.position.set(x * s, 0.5 * s, 0.15 * s);
      arm.rotation.x = 0.4;  // Arms reaching forward
      arm.rotation.z = x > 0 ? -0.15 : 0.15;
      arm.scale.setScalar(s);
      group.add(arm);
    });

    // Type-specific visuals
    if (type === 'TANK') {
      // Brute: shoulder armor
      const armor = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.25, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 })
      );
      armor.position.set(0, 0.95 * s, 0);
      group.add(armor);
    }
    if (type === 'BOSS') {
      // Overlord: horns
      [-0.12, 0.12].forEach(x => {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.25, 6),
          new THREE.MeshStandardMaterial({ color: 0x2a1a2a, metalness: 0.3 })
        );
        horn.position.set(x * s, 1.35 * s, 0);
        horn.rotation.z = x > 0 ? -0.3 : 0.3;
        group.add(horn);
      });
    }
    if (type === 'HEALER') {
      // Necromancer: glowing purple orb
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x8a2be2, transparent: true, opacity: 0.7 })
      );
      orb.position.set(0.35 * s, 0.7 * s, 0.15 * s);
      group.add(orb);
    }
    if (type === 'SPLITTER') {
      // Bloater: bloated glow effect
      bodyMesh.scale.set(s * 1.3, s * 1.1, s * 1.3);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x7a8a5a, transparent: true, opacity: 0.25 })
      );
      glow.position.y = 0.65 * s;
      group.add(glow);
    }
    if (type === 'RUNNER') {
      // Sprinter: glowing red eyes
      [-0.06, 0.06].forEach(x => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 4),
          new THREE.MeshBasicMaterial({ color: 0xff4400 })
        );
        eye.position.set(x * s, 1.18 * s, 0.18 * s);
        group.add(eye);
      });
    }

    group.position.copy(pos);
    this.scene.add(group);

    // Sound effect - zombie groan
    if (Math.random() < 0.3) {
      setTimeout(() => this.audioManager?.playSound('groan'), Math.random() * 1000);
    }

    return {
      mesh: group,
      body: bodyMesh,
      tail: null,  // Zombies don't have tails
      pos: pos.clone(),
      hp: stats.hp * (customScale ? customScale / stats.scale : 1),
      maxHp: stats.hp * (customScale ? customScale / stats.scale : 1),
      spd: stats.speed,
      dmg: stats.damage,
      val: stats.value,
      type,
      scale: s,
      bob: Math.random() * 6.28,
      slowMult: 1,
      slowTimer: 0,
      dead: false,
      healTimer: 0,
      bossPhase: type === 'BOSS' ? 3 : 0
    };
  }

  _updateAbilities(dt) {
    // Update rage timer
    if (this.state.rageActive > 0) {
      this.state.rageActive -= dt;
    }

    // Handle pending airstrike
    if (this.state.pendingAirstrike) {
      this._createExplosion(this.state.pendingAirstrike, AbilityTypes.AIRSTRIKE.radius, AbilityTypes.AIRSTRIKE.damage);
      this._applySplashDamage(this.state.pendingAirstrike, AbilityTypes.AIRSTRIKE.radius, AbilityTypes.AIRSTRIKE.damage);
      this.state.pendingAirstrike = null;
    }
  }

  _updateDamageSystem(dt) {
    this.damageManager.update(dt);

    // Check for destroyed turrets
    for (let i = this.state.turrets.length - 1; i >= 0; i--) {
      const turret = this.state.turrets[i];
      const damageable = this.damageManager.getDamageable(turret);

      if (damageable && damageable.health <= 0) {
        this.scene.remove(turret.mesh);
        this.state.turrets.splice(i, 1);
        this.turretGrid.remove(turret);
        this._emitCallback('onTurretsChange', [...this.state.turrets]);
      }
    }
  }

  _updateCamera(dt) {
    const pan = this.panOffset;

    // Handle panning input first
    const panSpeed = this.settings.panSpeed * dt;
    if (this.state.input.panUp) this.panOffset.z -= panSpeed;
    if (this.state.input.panDown) this.panOffset.z += panSpeed;
    if (this.state.input.panLeft) this.panOffset.x -= panSpeed;
    if (this.state.input.panRight) this.panOffset.x += panSpeed;

    if (this.cameraMode === 'FIRST_PERSON') {
      // First Person: Attach to player head, look based on mouse
      const headPos = this.state.player.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
      this.camera.position.copy(headPos);

      // Look direction based on player rotation and pitch
      const lookDir = new THREE.Vector3(
        Math.sin(this.state.player.rot) * Math.cos(this.state.player.pitch),
        Math.sin(this.state.player.pitch),
        Math.cos(this.state.player.rot) * Math.cos(this.state.player.pitch)
      );
      const target = headPos.clone().add(lookDir);
      this.camera.lookAt(target);
      this.camera.up.set(0, 1, 0);

      // Hide player model in FPS mode
      if (this.playerGroup) this.playerGroup.visible = false;

      // Screen shake for FPS
      if (this.state.shakeDuration > 0) {
        this.state.shakeDuration -= dt;
        const shake = this.state.shakeIntensity * 0.02;
        this.camera.rotation.x += (Math.random() - 0.5) * shake;
        this.camera.rotation.y += (Math.random() - 0.5) * shake;
      }

      // Update aim for FPS mode
      this.state.aim.copy(headPos).add(lookDir.multiplyScalar(30));
    } else if (this.cameraMode === 'TOPDOWN') {
      // Show player in other modes
      if (this.playerGroup) this.playerGroup.visible = true;

      // Top Down: High above, looking straight down
      const targetPos = this.state.player.pos.clone().add(pan).add(new THREE.Vector3(0, 50 * this.zoom, 0));

      // Rotate camera orientation based on angle
      this.camera.up.set(Math.sin(this.cameraAngle), 0, Math.cos(this.cameraAngle));

      this.camera.position.lerp(targetPos, this.settings.cameraSmoothing);
      this.camera.lookAt(this.state.player.pos.clone().add(pan));
    } else {
      // Show player in isometric mode
      if (this.playerGroup) this.playerGroup.visible = true;

      // Isometric (Default): Follow player with offset + Rotation + Pan
      const dist = 40 * this.zoom;
      const height = 32 * this.zoom;

      // Calculate offset based on angle
      const rotOffset = new THREE.Vector3(
        dist * Math.sin(this.cameraAngle),
        height,
        dist * Math.cos(this.cameraAngle)
      );

      const targetPos = this.state.player.pos.clone().add(pan).add(rotOffset);

      // Screen shake
      if (this.state.shakeDuration > 0) {
        this.state.shakeDuration -= dt;
        const shake = this.state.shakeIntensity * (this.state.shakeDuration > 0 ? 1 : 0);
        targetPos.add(new THREE.Vector3(
          (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake * 0.5,
          (Math.random() - 0.5) * shake * 0.3
        ));
      }

      this.camera.position.lerp(targetPos, this.settings.cameraSmoothing);
      this.camera.lookAt(this.state.player.pos.clone().add(pan));
    }
  }

  _updateVisuals(dt, t) {
    // Update leaves
    const leafPos = this.leafGeo.attributes.position.array;
    for (let i = 0; i < this.leafCount; i++) {
      const ld = this.leafData[i];
      leafPos[i * 3] += Math.sin(t * ld.swaySpeed + ld.rot) * 0.02;
      leafPos[i * 3 + 1] -= ld.fallSpeed * dt;
      leafPos[i * 3 + 2] += Math.cos(t * ld.swaySpeed * 0.7 + ld.rot) * 0.01;
      if (leafPos[i * 3 + 1] < 0) leafPos[i * 3 + 1] = 20 + Math.random() * 10;
    }
    this.leafGeo.attributes.position.needsUpdate = true;

    // Update particles
    const pPositions = this.particleGeo.attributes.position.array;
    const pColors = this.particleGeo.attributes.color.array;
    const pSizes = this.particleGeo.attributes.size.array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      p.vel.y -= 9.8 * dt;
    }

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        pPositions[i * 3] = p.pos.x;
        pPositions[i * 3 + 1] = p.pos.y;
        pPositions[i * 3 + 2] = p.pos.z;
        pColors[i * 3] = p.color.r;
        pColors[i * 3 + 1] = p.color.g;
        pColors[i * 3 + 2] = p.color.b;
        pSizes[i] = p.size * (p.life / p.maxLife);
      } else {
        pPositions[i * 3 + 1] = -1000;
        pSizes[i] = 0;
      }
    }

    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;
    this.particleGeo.attributes.size.needsUpdate = true;
  }

  _emitParticles(pos, count, colorHex, spread, lifetime) {
    const color = new THREE.Color(colorHex);
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        )),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * spread.x,
          Math.random() * spread.y,
          (Math.random() - 0.5) * spread.z
        ),
        color,
        size: 0.15 + Math.random() * 0.15,
        life: lifetime,
        maxLife: lifetime
      });
    }
  }

  _createExplosion(pos, radius, damage = 0) {
    this._emitParticles(pos.clone(), 25, 0xff6600, { x: radius * 3, y: radius * 4, z: radius * 3 }, 0.6);
    this._emitParticles(pos.clone(), 15, 0xffff00, { x: radius * 2, y: radius * 5, z: radius * 2 }, 0.4);

    this.audioManager?.playSound('explosion');
    this.state.shakeIntensity = Math.min(radius / 4, 1);
    this.state.shakeDuration = 0.35;
  }

  _applySplashDamage(pos, radius, damage) {
    for (const tk of this.state.zombies) {
      if (tk.dead) continue;
      const dx = tk.pos.x - pos.x;
      const dz = tk.pos.z - pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < radius) {
        const falloff = 1 - d / radius;
        tk.hp -= damage * falloff;

        // Flash red on damage
        if (tk.body && tk.body.material) {
          tk.body.material.color.set(0xff0000);
          setTimeout(() => {
            if (tk.body && tk.body.material) {
              tk.body.material.color.set(ZombieTypes[tk.type].body);
            }
          }, 80);
        }

        if (tk.hp <= 0) this._killZombie(tk);
      }
    }
  }

  // ========================================
  // PUBLIC API (called from React)
  // ========================================

  /**
   * Start a new game
   */
  startGame(endless = false) {
    this.reset();
    this.state.started = true;
    this.state.endlessMode = endless;
    this.state.waveComplete = true;
    this._emitCallback('onWaitingForWave', true);
    this._emitCallback('onBannerChange', 'Press SPACE to start Wave 1');
    this.audioManager?.startMusic();
  }

  /**
   * Start the next wave
   */
  startWave() {
    // Guard: must be started, waiting for wave, and not game over
    if (!this.state.started || !this.state.waveComplete || this.state.gameOver) {
      console.log('[GameEngine] startWave blocked:', {
        started: this.state.started,
        waveComplete: this.state.waveComplete,
        gameOver: this.state.gameOver
      });
      return;
    }

    // Mark wave as started
    this.state.waveComplete = false;
    this._emitCallback('onWaitingForWave', false);

    this.state.wave++;
    this.state.waveComp = this._getWaveComposition(this.state.wave, this.state.endlessMode);

    // Reset spawn counts
    this.spawnedCounts = {};
    Object.keys(this.state.waveComp).forEach(k => this.spawnedCounts[k] = 0);

    // Calculate total enemies
    this.state.toSpawn = Object.values(this.state.waveComp).reduce((a, b) => a + b, 0);
    this.state.expectedThisWave = this.state.toSpawn;
    this.state.totalSpawnedThisWave = 0;
    this.state.spawnTimer = 1;

    console.log('[GameEngine] Starting wave', this.state.wave, 'with', this.state.toSpawn, 'enemies');
    this.state.waveStartHealth = this.state.player.health;

    this._emitCallback('onBannerChange', `Wave ${this.state.wave}`);
    setTimeout(() => this._emitCallback('onBannerChange', ''), 2000);
    this.audioManager?.playSound('wave');
  }

  _getWaveComposition(wave, endless) {
    const mult = endless ? 1.3 : 1;
    const isBossWave = wave >= 5 && wave % 5 === 0;
    const isBreatherWave = wave > 5 && wave % 5 === 1;
    const isBuildupWave = wave % 5 === 4;

    let rhythmMult = 1.0;
    if (isBossWave) rhythmMult = 0.6;
    else if (isBreatherWave) rhythmMult = 0.7;
    else if (isBuildupWave) rhythmMult = 1.2;

    const comp = {
      STANDARD: Math.max(3, Math.round((3 + wave * 0.8) * mult * rhythmMult)),
      RUNNER: 0,
      TANK: 0,
      HEALER: 0,
      SPLITTER: 0,
      BOSS: 0
    };

    if (wave >= 3) {
      const cap = endless ? 8 + Math.floor(wave * 0.15) : 6;
      comp.RUNNER = Math.round(Math.min(1 + (wave - 3) * 0.5, cap) * mult * rhythmMult);
    }

    if (wave >= 5) {
      const cap = endless ? 5 + Math.floor(wave * 0.1) : 4;
      comp.TANK = Math.round(Math.min(1 + (wave - 5) * 0.3, cap) * mult * rhythmMult);
    }

    if (wave >= 7) {
      const cap = endless ? 4 + Math.floor(wave * 0.08) : 3;
      comp.HEALER = Math.round(Math.min(1 + (wave - 7) * 0.25, cap) * mult * rhythmMult);
    }

    if (wave >= 8) {
      const cap = endless ? 3 + Math.floor(wave * 0.06) : 2;
      comp.SPLITTER = Math.round(Math.min(1 + (wave - 8) * 0.2, cap) * mult * rhythmMult);
    }

    if (isBossWave) {
      comp.BOSS = 1 + Math.floor((wave - 5) / 10);
    }

    return comp;
  }

  _onWaveComplete() {
    console.log('[GameEngine] Wave', this.state.wave, 'complete! Setting waveComplete=true');
    this.state.waveComplete = true;
    this._emitCallback('onWaveComplete', this.state.wave);
    this._emitCallback('onWaitingForWave', true);
    this._emitCallback('onBannerChange', `Wave ${this.state.wave} Complete!`);
    this.audioManager?.playSound('wave');

    // Bonus currency
    this.state.currency += 20 + this.state.wave * 5;
  }

  /**
   * Set the current weapon
   */
  setWeapon(weaponKey) {
    if (WeaponTypes[weaponKey]) {
      this.state.currentWeapon = weaponKey;
      this._emitCallback('onWeaponChange', WeaponTypes[weaponKey]);
      this.audioManager?.playSound('click');
    }
  }

  /**
   * Set camera mode
   */
  setCameraMode(mode) {
    const prevMode = this.cameraMode;
    this.cameraMode = mode;

    if (mode === 'FIRST_PERSON') {
      // Initialize FPS look direction toward center/house
      if (prevMode !== 'FIRST_PERSON') {
        const dirToCenter = new THREE.Vector3().subVectors(
          new THREE.Vector3(0, 0, 0),
          this.state.player.pos
        ).setY(0);
        if (dirToCenter.lengthSq() > 0.01) {
          this.state.player.rot = Math.atan2(dirToCenter.x, dirToCenter.z);
        }
        this.state.player.pitch = 0;
      }
    } else if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    console.log('[GameEngine] Camera mode:', mode);
  }

  /**
   * Start placing a turret
   */
  startTurretPlacement(turretType) {
    if (!TurretTypes[turretType]) return;
    if (this.state.currency < TurretTypes[turretType].cost) {
      this._emitCallback('onBannerChange', 'Not enough corn!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return;
    }

    this.state.placingTurret = turretType;
    this.turretPreview.visible = true;

    // Update range indicator
    const range = TurretTypes[turretType].range;
    const rangeIndicator = this.turretPreview.userData.rangeIndicator;
    if (rangeIndicator) {
      rangeIndicator.geometry.dispose();
      rangeIndicator.geometry = new THREE.RingGeometry(0, range, 32);
    }
  }

  /**
   * Cancel turret placement
   */
  cancelTurretPlacement() {
    this.state.placingTurret = null;
    this.turretPreview.visible = false;
  }

  _placeTurretAtPreview() {
    const type = this.state.placingTurret;
    const stats = TurretTypes[type];
    const pos = this.turretPreview.position.clone();

    // Validate placement
    const dist = pos.distanceTo(this.state.house.pos);
    if (dist < this.config.turretMinDistance || dist > this.config.turretMaxDistance) {
      this._emitCallback('onBannerChange', 'Invalid placement position');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return;
    }

    // Check cost
    if (this.state.currency < stats.cost) {
      this._emitCallback('onBannerChange', 'Not enough corn!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return;
    }

    // Create turret
    const turret = this._createTurretMesh(type, pos);
    this.state.turrets.push(turret);
    this.turretGrid.insert(turret, pos);
    this.state.currency -= stats.cost;

    this.damageManager.registerPiece(turret, { maxHealth: stats.health });
    this.cancelTurretPlacement();

    this._emitCallback('onTurretsChange', [...this.state.turrets]);
    this.audioManager?.playSound('purchase');
  }

  _createTurretMesh(type, pos) {
    const stats = TurretTypes[type];
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    );
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: stats.color, roughness: 0.7 })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Type-specific decorations
    if (type === 'BASIC') {
      // Scarecrow head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.95 })
      );
      head.position.y = 1.3;
      group.add(head);
      // Hat
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d1f14 })
      );
      hat.position.y = 1.6;
      group.add(hat);
    } else if (type === 'SLOW') {
      // Ice crystal
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25),
        new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8, emissive: 0x88ccff, emissiveIntensity: 0.3 })
      );
      crystal.position.y = 1.3;
      group.add(crystal);
    } else if (type === 'EXPLOSIVE') {
      // Corn silo top
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.7 })
      );
      dome.position.y = 1.1;
      group.add(dome);
    }

    // Range indicator (hidden by default)
    const rangeIndicator = new THREE.Mesh(
      new THREE.RingGeometry(0, stats.range, 32),
      new THREE.MeshBasicMaterial({ color: stats.color, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
    );
    rangeIndicator.rotation.x = -Math.PI / 2;
    rangeIndicator.position.y = 0.02;
    rangeIndicator.visible = false;
    group.add(rangeIndicator);

    // Health bar
    const healthBarGroup = new THREE.Group();
    healthBarGroup.position.y = 2.0;
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    healthBarGroup.add(healthBarBg);
    const healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x44ff44, side: THREE.DoubleSide })
    );
    healthBarFill.position.z = 0.001;
    healthBarGroup.add(healthBarFill);
    healthBarGroup.visible = false;
    group.add(healthBarGroup);

    group.position.copy(pos);
    this.scene.add(group);

    return {
      mesh: group,
      range: rangeIndicator,
      pos: pos.clone(),
      type,
      damage: stats.damage,
      fireRate: stats.fireRate,
      turretRange: stats.range,
      slow: stats.slow || 0,
      slowDuration: stats.slowDuration || 0,
      splash: stats.splash || 0,
      lastFire: 0,
      target: null,
      health: stats.health,
      maxHealth: stats.health,
      cooldown: 0,
      healthBar: healthBarGroup,
      healthBarFill
    };
  }

  /**
   * Purchase an upgrade
   */
  buyUpgrade(upgradeKey, cost) {
    if (this.state.currency < cost) {
      this._emitCallback('onBannerChange', 'Not enough corn!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return false;
    }

    this.state.currency -= cost;
    this.state.upgrades[upgradeKey] = (this.state.upgrades[upgradeKey] || 0) + 1;

    // Apply player health upgrade
    if (upgradeKey === 'playerHealth') {
      this.state.player.maxHealth += 20;
      this.state.player.health = Math.min(this.state.player.health + 20, this.state.player.maxHealth);
    }

    this.audioManager?.playSound('purchase');
    this._updateStats();
    return true;
  }

  /**
   * Repair house
   */
  repairHouse() {
    if (this.state.currency < 50) {
      this._emitCallback('onBannerChange', 'Not enough corn!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return false;
    }

    this.state.currency -= 50;

    for (const door of this.houseDoors) {
      if (!door.destroyed) {
        door.health = Math.min(door.maxHealth, door.health + door.maxHealth * 0.5);
      }
    }

    for (const win of this.houseWindows) {
      if (!win.destroyed) {
        win.health = Math.min(win.maxHealth, win.health + win.maxHealth * 0.5);
      }
    }

    this.audioManager?.playSound('purchase');
    this._emitCallback('onBannerChange', 'House repaired!');
    setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
    return true;
  }

  /**
   * Upgrade house to next level
   */
  upgradeHouse() {
    const nextLevel = this.state.upgrades.houseLevel + 1;
    const nextKey = Object.keys(HouseUpgrades)[nextLevel];
    if (!nextKey) return false;

    const cost = HouseUpgrades[nextKey].cost;
    if (this.state.currency < cost) {
      this._emitCallback('onBannerChange', 'Not enough corn!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return false;
    }

    this.state.currency -= cost;
    this.state.upgrades.houseLevel = nextLevel;
    this._buildHouse(nextLevel);

    this.audioManager?.playSound('purchase');
    this._emitCallback('onBannerChange', `Upgraded to ${HouseUpgrades[nextKey].name}!`);
    setTimeout(() => this._emitCallback('onBannerChange', ''), 2000);
    return true;
  }

  /**
   * Use an ability
   */
  useAbility(abilityKey) {
    const ability = AbilityTypes[abilityKey];
    if (!ability) return;

    switch (abilityKey) {
      case 'AIRSTRIKE':
        this.state.pendingAirstrike = this.state.aim.clone();
        break;
      case 'FREEZE':
        this.state.globalFreeze = ability.duration;
        this.audioManager?.playSound('freeze');
        break;
      case 'RAGE':
        this.state.rageActive = ability.duration;
        break;
      case 'REPAIR':
        for (const door of this.houseDoors) {
          if (!door.destroyed) {
            door.health = Math.min(door.maxHealth, door.health + door.maxHealth * ability.healPercent);
          } else {
            door.health = door.maxHealth * ability.healPercent;
            door.destroyed = false;
            door.panel.visible = true;
          }
        }
        for (const win of this.houseWindows) {
          if (!win.destroyed) {
            win.health = Math.min(win.maxHealth, win.health + win.maxHealth * ability.healPercent);
          } else {
            win.health = win.maxHealth * ability.healPercent;
            win.destroyed = false;
            win.glass.visible = true;
          }
        }
        break;
    }

    this.audioManager?.playSound('ability');
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    this.state.paused = !this.state.paused;
    this._emitCallback('onPauseChange', this.state.paused);
  }

  /**
   * Take a screenshot
   */
  takeScreenshot() {
    try {
      this.renderer.render(this.scene, this.camera);
      const dataURL = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `HomesteadSiege_${timestamp}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.audioManager?.playSound('click');
      this._emitCallback('onBannerChange', 'Screenshot saved!');
      setTimeout(() => this._emitCallback('onBannerChange', ''), 1500);
      return true;
    } catch (e) {
      console.warn('Screenshot failed:', e);
      return false;
    }
  }

  /**
   * Reset game state for a new game
   */
  reset() {
    // Clean up zombies
    for (const tk of this.state.zombies) {
      this.scene.remove(tk.mesh);
    }
    this.state.zombies = [];

    // Clean up projectiles
    for (const p of this.state.projectiles) {
      this.scene.remove(p.mesh);
    }
    for (const p of this.state.turretProjectiles) {
      this.scene.remove(p.mesh);
    }
    this.state.projectiles = [];
    this.state.turretProjectiles = [];

    // Clean up turrets
    for (const t of this.state.turrets) {
      this.scene.remove(t.mesh);
    }
    this.state.turrets = [];

    // Reset state
    this.state.wave = 0;
    this.state.toSpawn = 0;
    this.state.totalSpawnedThisWave = 0;
    this.state.expectedThisWave = 0;
    this.state.currency = 100;
    this.state.score = 0;
    this.state.gameOver = false;
    this.state.waveComplete = false;
    this.state.currentWeapon = 'PITCHFORK';
    this.state.player.pos.set(0, 0, 10);
    this.state.player.health = 100;
    this.state.player.maxHealth = 100;
    this.state.player.isInside = false;
    this.state.globalFreeze = 0;
    this.state.rageActive = 0;
    this.state.upgrades = {
      houseArmor: 0,
      weaponDamage: 0,
      fireRate: 0,
      playerHealth: 0,
      houseLevel: 0
    };

    // Reset player position
    this.playerGroup.position.copy(this.state.player.pos);

    // Rebuild house
    this._buildHouse(0);

    // Clear spatial indices
    this.zombieGrid.clear();
    this.turretGrid.clear();
    this.buildingValidator.clear();
    this.damageManager.clear();

    this._updateStats();
  }

  _updateStats() {
    // Calculate house integrity
    let totalHealth = 0;
    let maxHealth = 0;
    for (const door of this.houseDoors) {
      totalHealth += door.health;
      maxHealth += door.maxHealth;
    }
    for (const win of this.houseWindows) {
      totalHealth += win.health;
      maxHealth += win.maxHealth;
    }
    const houseIntegrity = maxHealth > 0 ? Math.round((totalHealth / maxHealth) * 100) : 100;

    this._emitCallback('onStatsUpdate', {
      health: Math.round((this.state.player.health / this.state.player.maxHealth) * 100),
      currency: this.state.currency,
      wave: this.state.wave,
      enemies: this.state.zombies.filter(tk => !tk.dead).length,
      score: this.state.score,
      houseIntegrity,
      isInside: this.state.player.isInside
    });
  }

  _emitCallback(name, data) {
    if (this.callbacks[name]) {
      this.callbacks[name](data);
    }
  }

  /**
   * Register a callback for UI updates
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Get the current game state (for saving)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get upgrades
   */
  getUpgrades() {
    return { ...this.state.upgrades };
  }

  /**
   * Update settings from React
   */
  updateSettings(newSettings) {
    const prevSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };

    // Handle FOV changes
    if (newSettings.fov !== undefined && newSettings.fov !== prevSettings.fov && this.camera) {
      this.camera.fov = newSettings.fov;
      this.camera.updateProjectionMatrix();
    }

    // Handle shadow quality changes (requires light rebuild)
    if (newSettings.shadowQuality !== undefined && newSettings.shadowQuality !== prevSettings.shadowQuality) {
      this._updateShadowQuality(newSettings.shadowQuality);
    }

    // Handle particle count changes
    if (newSettings.particleCount !== undefined && newSettings.particleCount !== prevSettings.particleCount) {
      this.maxParticles = newSettings.particleCount;
    }
  }

  /**
   * Update shadow quality
   */
  _updateShadowQuality(quality) {
    const sizeMap = { LOW: 512, MEDIUM: 2048, HIGH: 4096 };
    const size = sizeMap[quality] || 2048;

    // Find the sun light (directional light with shadows)
    this.scene?.traverse((obj) => {
      if (obj.isDirectionalLight && obj.castShadow) {
        obj.shadow.mapSize.set(size, size);
        if (obj.shadow.map) {
          obj.shadow.map.dispose();
          obj.shadow.map = null;
        }
      }
    });
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Stop animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove event listeners
    window.removeEventListener('resize', this._boundHandlers.resize);
    window.removeEventListener('keydown', this._boundHandlers.keyDown);
    window.removeEventListener('keyup', this._boundHandlers.keyUp);
    document.removeEventListener('pointerlockchange', this._boundHandlers.pointerLockChange);

    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('mousedown', this._boundHandlers.mouseDown);
      this.renderer.domElement.removeEventListener('mouseup', this._boundHandlers.mouseUp);
      this.renderer.domElement.removeEventListener('mousemove', this._boundHandlers.mouseMove);
      this.renderer.domElement.removeEventListener('wheel', this._boundHandlers.wheel);
    }

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container?.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

export default GameEngine;
