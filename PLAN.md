# TDD Protocol Implementation Plan - Turkey Trot Defense

## Executive Summary

This plan establishes a comprehensive Test-Driven Development (TDD) protocol for the Turkey Trot Defense game. The implementation will be meticulous, covering all 6 engine modules plus the React component with thorough unit tests, integration tests, and edge case coverage.

---

## Phase 1: Testing Infrastructure Setup

### 1.1 Install Testing Dependencies
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8 happy-dom
```

**Why Vitest?**
- Native Vite integration (already using Vite)
- Jest-compatible API
- Faster execution with native ESM support
- Built-in code coverage via v8

### 1.2 Configuration Files

**vitest.config.ts** - Test configuration with:
- jsdom environment for React/DOM tests
- Coverage thresholds (target: 80%+ line coverage)
- Path aliases matching vite.config.js
- Separate configs for unit vs integration tests

**vitest.setup.ts** - Global test setup:
- Three.js mocks (WebGL context)
- Tone.js mocks (audio context)
- localStorage mock
- Performance API mock
- Custom matchers for Three.js Vector3 comparisons

### 1.3 Directory Structure
```
src/
├── engine/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── GameConfig.test.js
│   │   │   ├── SpatialHashGrid2D.test.js
│   │   │   ├── BuildingValidator.test.js
│   │   │   ├── DamageManager.test.js
│   │   │   ├── StabilityOptimizer.test.js
│   │   │   └── GameEngine.test.js
│   │   ├── integration/
│   │   │   ├── engine-systems.test.js
│   │   │   ├── damage-stability.test.js
│   │   │   └── game-flow.test.js
│   │   └── __mocks__/
│   │       ├── three.js
│   │       └── tone.js
│   └── [existing files]
├── __tests__/
│   ├── TurkeyTrotDefense.test.jsx
│   └── integration/
│       └── full-game.test.jsx
└── test-utils/
    ├── factories.js        (test data factories)
    ├── matchers.js         (custom assertions)
    └── fixtures.js         (reusable test fixtures)
```

---

## Phase 2: Unit Tests by Module (Priority Order)

### 2.1 GameConfig.test.js (~25 tests)
**Purpose:** Validate all game constants are properly defined

**Test Categories:**
1. **WeaponTypes validation**
   - All 4 weapons have required properties (damage, fireRate, speed, etc.)
   - Numeric values are positive and within reasonable ranges
   - Each weapon has unique characteristics
   - Pierce values are integers >= 0
   - Splash radius values are >= 0

2. **TurkeyTypes validation**
   - All 6 turkey types have required properties
   - HP values are positive integers
   - Speed values are between 0.1 and 5.0
   - Special abilities (heals, splits, phases) are properly typed
   - Value (score) correlates with difficulty

3. **HouseUpgrades validation**
   - 5 upgrade levels exist (BASIC through FORTRESS)
   - Each level has increasing dimensions
   - Cost increases with level
   - Door/window counts are valid integers

4. **TurretTypes validation**
   - All 3 turret types have cost, damage, range
   - Special effects (slow) have valid duration values

5. **AbilityTypes validation**
   - All 4 abilities have cooldown, duration
   - Damage/effect values are properly typed

6. **Achievements validation**
   - Each achievement has name, icon, description, check function
   - Check functions are callable and return boolean

---

### 2.2 SpatialHashGrid2D.test.js (~45 tests)
**Purpose:** Exhaustive testing of spatial partitioning system

**Test Categories:**

1. **Construction**
   - Default cell size (5)
   - Custom cell size
   - Initial state is empty

2. **Hash function (_hash)**
   - Correct cell calculation for positive coordinates
   - Correct cell calculation for negative coordinates
   - Boundary conditions (exact cell boundaries)
   - Large coordinates don't overflow

3. **Insert operations**
   - Single object insertion
   - Multiple objects same cell
   - Multiple objects different cells
   - Object count tracking
   - Returns correct cell key
   - Duplicate insertion handling

4. **Remove operations**
   - Remove existing object returns true
   - Remove non-existent object returns false
   - Cell cleanup when empty
   - Object count decrement
   - Double removal handling

5. **Update operations**
   - Update moves object between cells
   - Update within same cell
   - Update non-existent object

6. **queryRadius**
   - Objects within radius found
   - Objects outside radius excluded
   - Boundary cases (exact radius distance)
   - Empty query returns empty array
   - Handles object.pos pattern
   - Handles object.position pattern
   - Handles direct coordinate objects
   - Multi-cell queries
   - Performance with many objects

7. **queryCell**
   - Returns objects in specific cell
   - Returns empty array for empty cell
   - Returns copy (not reference)

8. **findNearest**
   - Finds nearest object
   - Respects maxRadius
   - Returns null when no objects
   - Handles ties consistently
   - Expanding search works correctly

9. **getStats**
   - Correct object count
   - Correct cell count
   - Max objects per cell
   - Average calculation

10. **clear**
    - Removes all objects
    - Resets counters
    - Multiple clears are idempotent

---

### 2.3 BuildingValidator.test.js (~60 tests)
**Purpose:** Test placement validation and support graph

**Test Categories:**

1. **Construction**
   - Default options applied
   - Custom barn position
   - Custom distance constraints
   - Default mode is SIMPLE

2. **SupportGraph (internal class)**
   - addPiece creates entries
   - removePiece cleans up all references
   - addSupportRelation creates bidirectional links
   - getSupports returns supporters
   - getSupportedPieces returns dependents
   - isGrounded for grounded pieces
   - hasPathToGround traversal
   - hasPathToGroundExcluding with excluded pieces
   - findDisconnectedAfterRemoval cascade detection
   - serialize/deserialize round-trip
   - clear resets all state

3. **addPiece**
   - Piece gets isGrounded default
   - Piece added to graph
   - Custom isGrounded respected

4. **removePiece**
   - Returns empty array in SIMPLE mode
   - Returns collapsed pieces in HEURISTIC mode
   - Clears stability cache

5. **validatePlacement**
   - Rejects if no position
   - Rejects if too close to barn (< minDistance)
   - Rejects if too far from barn (> maxDistance)
   - Rejects if overlapping existing piece (< 1.5 units)
   - Accepts valid placement in SIMPLE mode
   - Rejects unsupported floating pieces in HEURISTIC mode
   - Returns stability score
   - Returns reason for rejection

6. **findPotentialSupports**
   - Finds pieces within 3 units and below
   - Excludes pieces at same height
   - Excludes pieces above

7. **getStability**
   - Always 1.0 in SIMPLE mode
   - Calculates from graph in HEURISTIC mode
   - Uses cache when available

8. **Mode switching**
   - setMode changes validation behavior
   - Cache cleared on mode change

9. **Edge cases**
   - Exact boundary distances
   - Zero distance from barn
   - Negative coordinates
   - Very large coordinates

---

### 2.4 DamageManager.test.js (~70 tests)
**Purpose:** Test damage application, cascades, and animations

**Test Categories:**

1. **DamageState enum**
   - All states defined
   - State transitions at correct thresholds (61%, 26%, 1%)

2. **DamageType enum**
   - PHYSICAL, EXPLOSIVE, STRUCTURAL defined

3. **DamageablePiece (internal class)**
   - Constructor sets defaults
   - Custom maxHealth
   - takeDamage reduces health
   - takeDamage updates state
   - takeDamage records history
   - heal increases health
   - heal caps at maxHealth
   - getHealthPercent accurate
   - getStabilityModifier per state

4. **CollapseAnimation (internal class)**
   - Constructor sets initial values
   - update handles delay phase
   - update handles falling phase
   - Physics calculations (position, rotation, scale)
   - Material opacity transition
   - Completion detection

5. **DamageManager construction**
   - Links to validator
   - Default options
   - Custom cascade settings
   - Callbacks registered

6. **registerPiece**
   - Creates damageable wrapper
   - Generates ID if missing
   - Custom health options
   - Returns damageable

7. **unregisterPiece**
   - Removes from tracking
   - Handles non-existent piece

8. **applyDamage**
   - Reduces health
   - Updates damage state
   - Triggers onPieceDamaged callback
   - Triggers destruction at 0 health
   - Returns damage result object
   - Handles non-registered piece

9. **applyExplosiveDamage**
   - Damages all pieces in radius
   - Falloff calculation (inverse square)
   - Returns affected pieces list
   - Triggers destruction for killed pieces

10. **destroyPiece**
    - Creates collapse animation
    - Gets unstable pieces from validator
    - Queues cascading destructions
    - Applies cascade damage to neighbors
    - Unregisters piece
    - Triggers onPieceDestroyed callback
    - Returns result object

11. **findNeighbors**
    - Finds pieces within radius
    - Handles different position patterns
    - Excludes self

12. **update**
    - Processes pending destructions after delay
    - Updates active collapse animations
    - Removes completed animations
    - Calls onCollapseComplete
    - Cleans up meshes from scene

13. **getStats**
    - Accurate piece counts
    - Health percentage calculation
    - Damaged/critical counts
    - Active collapse count

14. **clear**
    - Resets all state
    - Stops animations

---

### 2.5 StabilityOptimizer.test.js (~55 tests)
**Purpose:** Test caching, batching, and update prioritization

**Test Categories:**

1. **UpdatePriority enum**
   - All 5 levels defined
   - Numeric ordering correct

2. **CacheEntry (internal class)**
   - Constructor sets values
   - access updates counters
   - isStale detection

3. **PriorityUpdateQueue (internal class)**
   - add to correct queue
   - Priority upgrade on re-add
   - remove from queues
   - getNextBatch respects priority order
   - getNextBatch limits count
   - getCount by priority
   - clear all queues

4. **DependencyTracker (internal class)**
   - addDependency creates links
   - removePiece cleans all references
   - getDependents returns dependents
   - getAffectedPieces transitive closure
   - clear resets state

5. **StabilityOptimizer construction**
   - Links to validator
   - Default config options
   - Custom options
   - Initial stats zeroed

6. **getStability**
   - Returns cached value if fresh
   - Recalculates if stale
   - Updates cache hit/miss stats

7. **calculateAndCache**
   - Uses validator.calculateStability if available
   - Falls back to grounded check
   - Creates cache entry
   - Tracks dependencies
   - Triggers eviction if over size

8. **queueUpdate**
   - Invalidates cache
   - Adds to queue
   - Queues dependents at lower priority

9. **queueBulkUpdate**
   - Handles multiple pieces
   - Deduplicates affected pieces

10. **updateImmediate**
    - Bypasses queue
    - Returns new stability

11. **processUpdates**
    - Processes IMMEDIATE every frame
    - Processes HIGH every frame
    - Processes NORMAL every 2 frames
    - Processes LOW every 5 frames
    - Respects time budget
    - Updates stats

12. **evictStaleEntries**
    - Removes stale entries
    - LRU eviction when needed
    - Maintains target cache size

13. **Event handlers**
    - onPiecePlaced queues immediate
    - onPieceDestroyed cleans up and queues affected

14. **ZonedStabilityOptimizer**
    - Zone key calculation
    - Piece registration by zone
    - Active zone tracking
    - Only processes active zones
    - Re-queues inactive pieces

---

### 2.6 GameEngine.test.js (~100+ tests)
**Purpose:** Core game logic testing (largest test file)

**Test Categories:**

1. **Construction**
   - Default config values
   - Custom config override
   - Initial state shape
   - Systems initialized (grids, validator, etc.)

2. **StateSnapshot**
   - Captures all state fields
   - Handles missing values gracefully

3. **Initialization (mocked Three.js)**
   - _initScene creates scene, camera, renderer
   - _initLighting adds lights
   - _initGround creates ground mesh
   - _initParticleSystem creates particle system
   - _initPlayer creates player group
   - _initHouse creates house structure
   - _initTurretPreview creates preview mesh
   - Event handlers bound

4. **Game flow**
   - startGame initializes state
   - startWave spawns correct enemies
   - Wave composition by wave number
   - Wave completion detection
   - Victory condition
   - Game over conditions

5. **Player mechanics**
   - Movement (WASD)
   - Position bounds checking
   - Rotation/aiming
   - Inside house detection
   - Health system
   - Invulnerability timer

6. **Weapon system**
   - Fire rate limiting
   - Projectile creation
   - Weapon switching
   - Damage calculation with upgrades
   - Pierce mechanics
   - Splash damage

7. **Turkey mechanics**
   - Spawn positioning
   - Movement toward barn
   - Attack behavior
   - Health and damage
   - Death and cleanup
   - Special types (HEALER, SPLITTER, BOSS)
   - Freeze effect

8. **Turret system**
   - Placement validation (delegates to BuildingValidator)
   - Firing logic
   - Target acquisition
   - Spatial grid updates
   - Destruction

9. **Economy**
   - Currency gain from kills
   - Purchase costs
   - Upgrade costs

10. **Abilities**
    - Cooldown tracking
    - Effect application (AIRSTRIKE, FREEZE, RAGE, REPAIR)
    - Duration management

11. **Camera system**
    - Mode switching (ISOMETRIC, TOP_DOWN, FIRST_PERSON, FREE)
    - Zoom controls
    - Pan controls
    - First-person mouse look

12. **Collision detection**
    - Projectile-turkey collisions
    - Turkey-barn collisions
    - Turkey-player collisions
    - Spatial grid optimization

13. **Particle system**
    - Particle emission
    - Particle update
    - Particle cleanup

14. **Performance metrics**
    - FPS calculation
    - Entity counting
    - Collision check counting

15. **Callbacks**
    - All UI callbacks fire correctly
    - Stats update frequency

16. **Cleanup**
    - dispose cleans up Three.js resources
    - Event handlers removed
    - Animation frame cancelled

---

## Phase 3: Integration Tests

### 3.1 engine-systems.test.js (~30 tests)
Test interactions between engine modules:
- SpatialHashGrid2D + GameEngine collision detection
- BuildingValidator + DamageManager piece destruction
- StabilityOptimizer + BuildingValidator stability updates
- Full damage cascade chain

### 3.2 damage-stability.test.js (~20 tests)
Deep integration of damage and stability:
- Turret destruction cascades
- Neighbor damage propagation
- Stability recalculation timing
- Cache invalidation chains

### 3.3 game-flow.test.js (~25 tests)
Complete game scenarios:
- Full wave completion
- Multiple waves with progression
- Boss wave handling
- Victory path
- Defeat paths (player death, barn destruction)
- Endless mode progression

---

## Phase 4: React Component Tests

### 4.1 TurkeyTrotDefense.test.jsx (~40 tests)

**Test Categories:**

1. **Rendering**
   - Initial menu renders
   - Game canvas mounts
   - UI overlay elements

2. **User interactions**
   - Start game button
   - Pause/resume
   - Shop opening/closing
   - Weapon selection
   - Turret placement mode

3. **State synchronization**
   - Engine callbacks update React state
   - Stats display accuracy
   - Wave banner display

4. **Audio integration**
   - AudioManager initialization
   - Sound triggers on events
   - Volume controls

5. **Save/Load**
   - loadSaveData parses correctly
   - saveGameData persists
   - Handles corrupted data
   - Version migration

6. **Achievements**
   - Check function evaluation
   - Unlock tracking
   - Display notifications

---

## Phase 5: Test Utilities

### 5.1 factories.js
```javascript
// Example factory functions
createMockPiece({ id, position, health })
createMockTurkey({ type, position, health })
createMockProjectile({ weapon, position, direction })
createMockGameState({ wave, currency, turkeys })
```

### 5.2 matchers.js
```javascript
// Custom assertions
expect.toBeNearVector3(expected, tolerance)
expect.toBeInRange(min, max)
expect.toHaveDamageState(state)
```

### 5.3 fixtures.js
```javascript
// Reusable test data
standardWaveComposition
maxDifficultyWaveComposition
emptyGameState
fullUpgradeState
```

---

## Phase 6: Coverage Requirements

### Target Metrics
| Module | Line Coverage | Branch Coverage | Function Coverage |
|--------|--------------|-----------------|-------------------|
| GameConfig | 100% | 100% | 100% |
| SpatialHashGrid2D | 95%+ | 90%+ | 100% |
| BuildingValidator | 95%+ | 90%+ | 100% |
| DamageManager | 90%+ | 85%+ | 100% |
| StabilityOptimizer | 90%+ | 85%+ | 100% |
| GameEngine | 85%+ | 80%+ | 95%+ |
| TurkeyTrotDefense | 80%+ | 75%+ | 90%+ |

### Overall Target: 85% line coverage minimum

---

## Phase 7: npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config vitest.config.unit.ts",
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui"
  }
}
```

---

## Implementation Order

1. **Infrastructure** (Phase 1)
   - Install dependencies
   - Create config files
   - Create mocks for Three.js/Tone.js
   - Create test utilities

2. **Foundation Tests** (Phase 2.1-2.2)
   - GameConfig.test.js (simplest, builds confidence)
   - SpatialHashGrid2D.test.js (pure logic, no mocks needed)

3. **Core System Tests** (Phase 2.3-2.5)
   - BuildingValidator.test.js
   - DamageManager.test.js
   - StabilityOptimizer.test.js

4. **Engine Tests** (Phase 2.6)
   - GameEngine.test.js (requires all mocks)

5. **Integration Tests** (Phase 3)
   - System interaction tests
   - Game flow tests

6. **React Tests** (Phase 4)
   - Component tests
   - UI interaction tests

---

## Estimated Test Count

| Category | Test Count |
|----------|-----------|
| GameConfig | ~25 |
| SpatialHashGrid2D | ~45 |
| BuildingValidator | ~60 |
| DamageManager | ~70 |
| StabilityOptimizer | ~55 |
| GameEngine | ~100 |
| Integration | ~75 |
| React Component | ~40 |
| **Total** | **~470 tests** |

---

## Success Criteria

1. All ~470 tests passing
2. 85%+ overall code coverage
3. Zero flaky tests
4. Tests run in < 30 seconds
5. Clear test output with descriptive names
6. Tests serve as documentation for expected behavior
