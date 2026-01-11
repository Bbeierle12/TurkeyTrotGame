/**
 * Homestead Siege - Engine Module
 * 
 * This module provides the decoupled game engine systems based on the
 * architectural blueprints in .claude/skills/3d-building-mechanics/
 * 
 * Architecture Overview:
 * - GameEngine: Core state management, decoupled from React
 * - SpatialHashGrid2D: O(1) spatial queries for collision detection
 * - BuildingValidator: Structural validation for turret placement
 * - DamageManager: Damage states and cascading destruction
 * - StabilityOptimizer: Caching and batch updates for large turret counts
 */

export { GameEngine, StateSnapshot } from './GameEngine.js';
export { SpatialHashGrid2D } from './SpatialHashGrid2D.js';
export { BuildingValidator, ValidationMode } from './BuildingValidator.js';
export { DamageManager, DamageState, DamageType, DamageVisualizer } from './DamageManager.js';
export { StabilityOptimizer, ZonedStabilityOptimizer, UpdatePriority } from './StabilityOptimizer.js';
