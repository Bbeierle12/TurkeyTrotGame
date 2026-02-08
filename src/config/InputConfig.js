export const InputBindings = {
  movement: {
    forward: ['KeyW'],
    backward: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['Space']
  },
  pan: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight']
  },
  wave: {
    start: ['Space', 'KeyN']
  },
  camera: {
    rotateLeft: ['Comma'],
    rotateRight: ['Period'],
    reset: ['KeyZ'],
    cycleMode: ['KeyC']
  },
  menu: {
    shop: ['KeyB'],
    turrets: ['KeyT'],
    help: ['KeyH'],
    pause: ['Escape']
  },
  ability: {
    airstrike: ['KeyQ'],
    freeze: ['KeyX'],
    rage: ['KeyR'],
    repair: ['KeyF']
  },
  weapons: {
    slot1: ['Digit1', 'Numpad1'],
    slot2: ['Digit2', 'Numpad2'],
    slot3: ['Digit3', 'Numpad3'],
    slot4: ['Digit4', 'Numpad4']
  }
};

export const StartScreenHint =
  'WASD: Move - Mouse: Aim/Shoot - 1-4: Weapons - Q/E/R/F: Abilities';

export const ControlHelp = [
  { key: 'WASD', label: 'Move' },
  { key: 'Mouse', label: 'Aim & Shoot' },
  { key: 'E', label: 'Enter/Exit house' },
  { key: '1-4', label: 'Switch weapons' },
  { key: 'Q/X/R/F', label: 'Use abilities' },
  { key: 'T', label: 'Turret menu' },
  { key: 'B', label: 'Shop' },
  { key: 'C', label: 'Cycle camera mode' }
];

export const AbilityHelp = [
  { key: 'Q', label: 'Artillery Strike', description: 'Airstrike at cursor' },
  { key: 'X', label: 'Frost Nova', description: 'Freeze all enemies' },
  { key: 'R', label: 'Survival Fury', description: '2x damage & fire rate' },
  { key: 'F', label: 'Emergency Repair', description: 'Repair doors/windows' }
];
