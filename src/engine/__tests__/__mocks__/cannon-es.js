/**
 * Cannon-es Mock for Testing
 *
 * Provides lightweight mock implementations of cannon-es classes
 * to enable testing without physics simulation.
 */

import { vi } from 'vitest';

// ============================================
// VEC3
// ============================================
export class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  vadd(v, target) {
    const t = target || new Vec3();
    t.x = this.x + v.x;
    t.y = this.y + v.y;
    t.z = this.z + v.z;
    return t;
  }

  vsub(v, target) {
    const t = target || new Vec3();
    t.x = this.x - v.x;
    t.y = this.y - v.y;
    t.z = this.z - v.z;
    return t;
  }

  scale(s, target) {
    const t = target || new Vec3();
    t.x = this.x * s;
    t.y = this.y * s;
    t.z = this.z * s;
    return t;
  }

  setZero() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
  }
}

// ============================================
// QUATERNION
// ============================================
export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
}

// ============================================
// SHAPES
// ============================================
export class Shape {
  constructor() {
    this.type = 0;
  }
}

export class Sphere extends Shape {
  constructor(radius = 1) {
    super();
    this.radius = radius;
    this.type = 1;
  }
}

export class Box extends Shape {
  constructor(halfExtents) {
    super();
    this.halfExtents = halfExtents || new Vec3(1, 1, 1);
    this.type = 4;
  }
}

export class Plane extends Shape {
  constructor() {
    super();
    this.type = 8;
  }
}

export class Heightfield extends Shape {
  constructor(data, options = {}) {
    super();
    this.data = data;
    this.elementSize = options.elementSize || 1;
    this.type = 16;
  }
}

// ============================================
// MATERIAL & CONTACT MATERIAL
// ============================================
export class Material {
  constructor(options = {}) {
    this.name = options.name || '';
    this.id = Math.floor(Math.random() * 1000000);
    this.friction = options.friction ?? 0.3;
    this.restitution = options.restitution ?? 0.3;
  }
}

export class ContactMaterial {
  constructor(m1, m2, options = {}) {
    this.materials = [m1, m2];
    this.friction = options.friction ?? 0.3;
    this.restitution = options.restitution ?? 0.0;
    this.contactEquationStiffness = options.contactEquationStiffness ?? 1e7;
    this.contactEquationRelaxation = options.contactEquationRelaxation ?? 3;
  }
}

// ============================================
// BODY
// ============================================
export class Body {
  static STATIC = 0;
  static DYNAMIC = 1;
  static KINEMATIC = 2;

  constructor(options = {}) {
    this.mass = options.mass ?? 0;
    this.position = options.position ? new Vec3(options.position.x, options.position.y, options.position.z) : new Vec3();
    this.velocity = new Vec3();
    this.angularVelocity = new Vec3();
    this.quaternion = new Quaternion();
    this.force = new Vec3();
    this.shapes = [];
    this.type = this.mass > 0 ? Body.DYNAMIC : Body.STATIC;
    this.material = options.material || null;
    this.linearDamping = options.linearDamping ?? 0.01;
    this.angularDamping = options.angularDamping ?? 0.01;
    this.fixedRotation = options.fixedRotation ?? false;
    this.collisionFilterGroup = options.collisionFilterGroup ?? 1;
    this.collisionFilterMask = options.collisionFilterMask ?? -1;

    if (options.shape) {
      this.shapes.push(options.shape);
    }
  }

  addShape(shape) {
    this.shapes.push(shape);
    return this;
  }
}

// ============================================
// BROADPHASE
// ============================================
export class NaiveBroadphase {
  constructor() {
    this.type = 'NaiveBroadphase';
  }
}

export class SAPBroadphase {
  constructor() {
    this.type = 'SAPBroadphase';
  }
}

// ============================================
// WORLD
// ============================================
export class World {
  constructor(options = {}) {
    this.gravity = options.gravity || new Vec3(0, -9.82, 0);
    this.broadphase = new NaiveBroadphase();
    this.bodies = [];
    this.contactmaterials = [];
    this.defaultContactMaterial = new ContactMaterial(new Material(), new Material());
    this.solver = {
      iterations: 10
    };
  }

  addBody(body) {
    this.bodies.push(body);
  }

  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
    }
  }

  addContactMaterial(cm) {
    this.contactmaterials.push(cm);
  }

  step(fixedTimeStep, timeSinceLastCalled, maxSubSteps) {
    // No-op in mock
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  Vec3,
  Quaternion,
  Shape,
  Sphere,
  Box,
  Plane,
  Heightfield,
  Material,
  ContactMaterial,
  Body,
  NaiveBroadphase,
  SAPBroadphase,
  World
};
