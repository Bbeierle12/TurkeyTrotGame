/**
 * SpatialHashGrid2D - Optimized 2D spatial partitioning for Homestead Siege
 *
 * Adapted from the skills blueprint for the game's specific needs.
 * Uses 2D grid (ignores Y) since zombies and projectiles move on a plane.
 * 
 * Performance: O(1) cell lookup + O(k) objects per cell
 * Best for: <5000 entities with uniform distribution
 */

/**
 * 2D Spatial Hash Grid
 */
export class SpatialHashGrid2D {
  constructor(cellSize = 5) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.objectCells = new Map();
    this.objectCount = 0;
  }

  /**
   * Generate cell key from world coordinates (ignores Y)
   */
  _hash(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  /**
   * Insert object at position
   */
  insert(object, position) {
    const key = this._hash(position.x, position.z);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key).add(object);
    
    if (!this.objectCells.has(object)) {
      this.objectCells.set(object, new Set());
      this.objectCount++;
    }
    this.objectCells.get(object).add(key);
    
    return key;
  }

  /**
   * Remove object from grid
   */
  remove(object) {
    const cellKeys = this.objectCells.get(object);
    if (!cellKeys) return false;

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(object);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.objectCells.delete(object);
    this.objectCount--;
    return true;
  }

  /**
   * Update object position
   */
  update(object, newPosition) {
    this.remove(object);
    return this.insert(object, newPosition);
  }

  /**
   * Query all objects within radius of position
   */
  queryRadius(position, radius) {
    const results = new Set();
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(position.x / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);
    const radiusSq = radius * radius;

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerX + dx},${centerZ + dz}`;
        const cell = this.cells.get(key);
        
        if (cell) {
          for (const object of cell) {
            // Get object position - handle both {pos} and {position} patterns
            const objPos = object.pos || object.position || object;
            
            // Calculate 2D distance (ignore Y)
            const distSq = (objPos.x - position.x) ** 2 + (objPos.z - position.z) ** 2;
            if (distSq <= radiusSq) {
              results.add(object);
            }
          }
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Query single cell
   */
  queryCell(position) {
    const key = this._hash(position.x, position.z);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }

  /**
   * Find nearest object
   */
  findNearest(position, maxRadius = Infinity) {
    let nearest = null;
    let nearestDistSq = maxRadius * maxRadius;

    // Expand search outward from center cell
    let searchRadius = 0;
    const centerX = Math.floor(position.x / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);

    while (searchRadius * this.cellSize <= maxRadius || searchRadius === 0) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
          // Only check shell of current radius
          if (searchRadius > 0 && 
              Math.abs(dx) !== searchRadius && 
              Math.abs(dz) !== searchRadius) {
            continue;
          }

          const key = `${centerX + dx},${centerZ + dz}`;
          const cell = this.cells.get(key);
          
          if (cell) {
            for (const object of cell) {
              const objPos = object.pos || object.position || object;
              const distSq = (objPos.x - position.x) ** 2 + (objPos.z - position.z) ** 2;
              
              if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = object;
              }
            }
          }
        }
      }

      // If we found something and searched far enough
      if (nearest && (searchRadius + 1) * this.cellSize > Math.sqrt(nearestDistSq)) {
        break;
      }
      searchRadius++;
    }

    return nearest;
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalObjects = 0;
    let maxPerCell = 0;
    let occupiedCells = 0;

    for (const cell of this.cells.values()) {
      const count = cell.size;
      if (count > 0) {
        totalObjects += count;
        maxPerCell = Math.max(maxPerCell, count);
        occupiedCells++;
      }
    }

    return {
      cellCount: occupiedCells,
      objectCount: this.objectCount,
      cellSize: this.cellSize,
      maxObjectsPerCell: maxPerCell,
      avgObjectsPerCell: occupiedCells > 0 ? totalObjects / occupiedCells : 0
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.cells.clear();
    this.objectCells.clear();
    this.objectCount = 0;
  }
}

export default SpatialHashGrid2D;
