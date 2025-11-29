/**
 * SettingsConfig - Centralized settings definitions, defaults, and presets
 */

export const SettingsCategories = {
  CONTROLS: 'controls',
  CAMERA: 'camera',
  GRAPHICS: 'graphics',
  AUDIO: 'audio'
};

export const SettingsDefinitions = {
  // === CONTROLS ===
  playerSpeed: {
    category: 'controls',
    label: 'Player Speed',
    type: 'slider',
    default: 8,
    min: 4,
    max: 16,
    step: 1,
    description: 'How fast the player moves'
  },
  mouseSensitivity: {
    category: 'controls',
    label: 'Mouse Sensitivity',
    type: 'slider',
    default: 1.0,
    min: 0.2,
    max: 3.0,
    step: 0.1,
    description: 'First-person look sensitivity'
  },
  invertY: {
    category: 'controls',
    label: 'Invert Y-Axis',
    type: 'toggle',
    default: false,
    description: 'Invert vertical mouse movement'
  },
  screenShake: {
    category: 'controls',
    label: 'Screen Shake',
    type: 'slider',
    default: 1.0,
    min: 0,
    max: 2.0,
    step: 0.1,
    description: 'Camera shake intensity when firing'
  },

  // === CAMERA ===
  zoomSensitivity: {
    category: 'camera',
    label: 'Zoom Sensitivity',
    type: 'slider',
    default: 1.0,
    min: 0.2,
    max: 3.0,
    step: 0.1,
    description: 'Scroll wheel zoom speed'
  },
  zoomMin: {
    category: 'camera',
    label: 'Min Zoom',
    type: 'slider',
    default: 0.5,
    min: 0.3,
    max: 0.8,
    step: 0.1,
    description: 'Closest zoom level'
  },
  zoomMax: {
    category: 'camera',
    label: 'Max Zoom',
    type: 'slider',
    default: 2.0,
    min: 1.5,
    max: 3.0,
    step: 0.1,
    description: 'Farthest zoom level'
  },
  panSpeed: {
    category: 'camera',
    label: 'Pan Speed',
    type: 'slider',
    default: 20,
    min: 10,
    max: 40,
    step: 5,
    description: 'Arrow key camera pan speed'
  },
  cameraSmoothing: {
    category: 'camera',
    label: 'Camera Smoothing',
    type: 'slider',
    default: 0.1,
    min: 0.05,
    max: 0.3,
    step: 0.05,
    description: 'Camera follow smoothness (lower = smoother)'
  },
  fov: {
    category: 'camera',
    label: 'Field of View',
    type: 'slider',
    default: 50,
    min: 40,
    max: 90,
    step: 5,
    description: 'Camera field of view angle'
  },

  // === GRAPHICS ===
  graphicsPreset: {
    category: 'graphics',
    label: 'Quality Preset',
    type: 'select',
    default: 'MEDIUM',
    options: [
      { value: 'LOW', label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH', label: 'High' },
      { value: 'CUSTOM', label: 'Custom' }
    ],
    description: 'Quick quality preset'
  },
  particleCount: {
    category: 'graphics',
    label: 'Particle Count',
    type: 'slider',
    default: 500,
    min: 100,
    max: 1000,
    step: 100,
    description: 'Maximum number of particles'
  },
  shadowQuality: {
    category: 'graphics',
    label: 'Shadow Quality',
    type: 'select',
    default: 'MEDIUM',
    options: [
      { value: 'LOW', label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH', label: 'High' }
    ],
    description: 'Shadow map resolution'
  },
  antialiasing: {
    category: 'graphics',
    label: 'Antialiasing',
    type: 'toggle',
    default: true,
    description: 'Enable anti-aliasing (smoother edges)'
  },
  showFps: {
    category: 'graphics',
    label: 'Show FPS',
    type: 'toggle',
    default: false,
    description: 'Display frames per second counter'
  },

  // === AUDIO ===
  masterVolume: {
    category: 'audio',
    label: 'Master Volume',
    type: 'slider',
    default: 0.7,
    min: 0,
    max: 1,
    step: 0.1,
    description: 'Overall game volume'
  },
  sfxVolume: {
    category: 'audio',
    label: 'SFX Volume',
    type: 'slider',
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.1,
    description: 'Sound effects volume'
  },
  musicVolume: {
    category: 'audio',
    label: 'Music Volume',
    type: 'slider',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    description: 'Background music volume'
  },
  muted: {
    category: 'audio',
    label: 'Mute All',
    type: 'toggle',
    default: false,
    description: 'Mute all game audio'
  }
};

// Graphics presets
export const GraphicsPresets = {
  LOW: {
    particleCount: 100,
    shadowQuality: 'LOW',
    antialiasing: false
  },
  MEDIUM: {
    particleCount: 500,
    shadowQuality: 'MEDIUM',
    antialiasing: true
  },
  HIGH: {
    particleCount: 1000,
    shadowQuality: 'HIGH',
    antialiasing: true
  }
};

// Shadow quality to texture size mapping
export const ShadowQualityMap = {
  LOW: 512,
  MEDIUM: 2048,
  HIGH: 4096
};

/**
 * Get default settings object with all default values
 */
export const getDefaultSettings = () => {
  const defaults = {};
  for (const [key, def] of Object.entries(SettingsDefinitions)) {
    defaults[key] = def.default;
  }
  return defaults;
};

/**
 * Get settings for a specific category
 */
export const getSettingsByCategory = (category) => {
  return Object.entries(SettingsDefinitions)
    .filter(([, def]) => def.category === category)
    .map(([key, def]) => ({ key, ...def }));
};

/**
 * Get all categories with their settings
 */
export const getAllCategories = () => {
  return Object.values(SettingsCategories).map(category => ({
    id: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
    settings: getSettingsByCategory(category)
  }));
};

/**
 * Validate a setting value
 */
export const validateSetting = (key, value) => {
  const def = SettingsDefinitions[key];
  if (!def) return false;

  if (def.type === 'slider') {
    return typeof value === 'number' && value >= def.min && value <= def.max;
  }
  if (def.type === 'toggle') {
    return typeof value === 'boolean';
  }
  if (def.type === 'select') {
    return def.options.some(opt => opt.value === value);
  }
  return true;
};

/**
 * Apply a graphics preset and return the new settings
 */
export const applyGraphicsPreset = (currentSettings, presetName) => {
  const preset = GraphicsPresets[presetName];
  if (!preset) return currentSettings;

  return {
    ...currentSettings,
    ...preset,
    graphicsPreset: presetName
  };
};

/**
 * Check if current graphics settings match a preset
 */
export const detectGraphicsPreset = (settings) => {
  for (const [presetName, preset] of Object.entries(GraphicsPresets)) {
    const matches = Object.entries(preset).every(
      ([key, value]) => settings[key] === value
    );
    if (matches) return presetName;
  }
  return 'CUSTOM';
};

/**
 * List of settings keys that affect the game engine (not just audio)
 */
export const GameEngineSettings = [
  'playerSpeed',
  'mouseSensitivity',
  'invertY',
  'screenShake',
  'zoomSensitivity',
  'zoomMin',
  'zoomMax',
  'panSpeed',
  'cameraSmoothing',
  'fov',
  'particleCount',
  'shadowQuality',
  'antialiasing'
];

/**
 * List of settings keys that affect audio
 */
export const AudioSettings = [
  'masterVolume',
  'sfxVolume',
  'musicVolume',
  'muted'
];