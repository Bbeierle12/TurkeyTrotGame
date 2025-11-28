/**
 * Three.js Mock for Testing
 *
 * Provides lightweight mock implementations of Three.js classes
 * to enable testing without WebGL context.
 */

import { vi } from 'vitest';

// ============================================
// VECTOR3 - Real implementation for math tests
// ============================================
export class Vector3 {
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

  setScalar(scalar) {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.divideScalar(len);
    }
    return this;
  }

  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v) {
    const ax = this.x,
      ay = this.y,
      az = this.z;
    this.x = ay * v.z - az * v.y;
    this.y = az * v.x - ax * v.z;
    this.z = ax * v.y - ay * v.x;
    return this;
  }

  applyMatrix4(m) {
    // Simplified - just return self for mocking
    return this;
  }

  applyQuaternion(q) {
    return this;
  }

  equals(v) {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  toArray() {
    return [this.x, this.y, this.z];
  }
}

// ============================================
// EULER
// ============================================
export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }

  set(x, y, z, order) {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order) this.order = order;
    return this;
  }

  clone() {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  copy(e) {
    this.x = e.x;
    this.y = e.y;
    this.z = e.z;
    this.order = e.order;
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

  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  setFromEuler(euler) {
    return this;
  }
}

// ============================================
// COLOR
// ============================================
export class Color {
  constructor(r = 1, g = 1, b = 1) {
    if (typeof r === 'number' && g === undefined) {
      // Hex color
      this.setHex(r);
    } else {
      this.r = r;
      this.g = g ?? r;
      this.b = b ?? r;
    }
  }

  setHex(hex) {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }

  set(color) {
    if (color instanceof Color) {
      this.copy(color);
    } else if (typeof color === 'number') {
      this.setHex(color);
    }
    return this;
  }

  clone() {
    return new Color(this.r, this.g, this.b);
  }

  copy(c) {
    this.r = c.r;
    this.g = c.g;
    this.b = c.b;
    return this;
  }

  lerp(c, alpha) {
    this.r += (c.r - this.r) * alpha;
    this.g += (c.g - this.g) * alpha;
    this.b += (c.b - this.b) * alpha;
    return this;
  }

  getHex() {
    return (
      ((this.r * 255) << 16) ^ ((this.g * 255) << 8) ^ ((this.b * 255) << 0)
    );
  }
}

// ============================================
// OBJECT3D
// ============================================
export class Object3D {
  constructor() {
    this.id = Math.floor(Math.random() * 1000000);
    this.uuid = `${Date.now()}-${Math.random()}`;
    this.name = '';
    this.type = 'Object3D';
    this.parent = null;
    this.children = [];
    this.position = new Vector3();
    this.rotation = new Euler();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
    this.userData = {};
    this.matrixAutoUpdate = true;
  }

  add(object) {
    if (object === this) return this;
    if (object.parent) object.parent.remove(object);
    object.parent = this;
    this.children.push(object);
    return this;
  }

  remove(object) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
    }
    return this;
  }

  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  lookAt(x, y, z) {
    // Simplified
    return this;
  }

  clone() {
    return new this.constructor().copy(this);
  }

  copy(source) {
    this.name = source.name;
    this.position.copy(source.position);
    this.rotation.copy(source.rotation);
    this.scale.copy(source.scale);
    return this;
  }

  updateMatrix() {}
  updateMatrixWorld() {}
}

// ============================================
// GROUP
// ============================================
export class Group extends Object3D {
  constructor() {
    super();
    this.type = 'Group';
  }
}

// ============================================
// SCENE
// ============================================
export class Scene extends Object3D {
  constructor() {
    super();
    this.type = 'Scene';
    this.background = null;
    this.fog = null;
  }
}

// ============================================
// CAMERA
// ============================================
export class Camera extends Object3D {
  constructor() {
    super();
    this.type = 'Camera';
    this.matrixWorldInverse = {};
    this.projectionMatrix = {};
  }
}

export class PerspectiveCamera extends Camera {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    super();
    this.type = 'PerspectiveCamera';
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.zoom = 1;
  }

  updateProjectionMatrix() {}
}

export class OrthographicCamera extends Camera {
  constructor(left, right, top, bottom, near, far) {
    super();
    this.type = 'OrthographicCamera';
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
    this.zoom = 1;
  }

  updateProjectionMatrix() {}
}

// ============================================
// MESH
// ============================================
export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.type = 'Mesh';
    this.geometry = geometry;
    this.material = material;
  }
}

// ============================================
// LIGHTS
// ============================================
export class Light extends Object3D {
  constructor(color, intensity = 1) {
    super();
    this.type = 'Light';
    this.color = new Color(color);
    this.intensity = intensity;
  }
}

export class AmbientLight extends Light {
  constructor(color, intensity) {
    super(color, intensity);
    this.type = 'AmbientLight';
  }
}

export class DirectionalLight extends Light {
  constructor(color, intensity) {
    super(color, intensity);
    this.type = 'DirectionalLight';
    this.target = new Object3D();
    this.shadow = {
      mapSize: { set: vi.fn() },
      camera: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        near: 0,
        far: 0
      },
      bias: 0
    };
  }
}

export class HemisphereLight extends Light {
  constructor(skyColor, groundColor, intensity) {
    super(skyColor, intensity);
    this.type = 'HemisphereLight';
    this.groundColor = new Color(groundColor);
  }
}

export class PointLight extends Light {
  constructor(color, intensity, distance, decay) {
    super(color, intensity);
    this.type = 'PointLight';
    this.distance = distance || 0;
    this.decay = decay || 2;
  }
}

// ============================================
// GEOMETRY
// ============================================
export class BufferGeometry {
  constructor() {
    this.uuid = `${Date.now()}-${Math.random()}`;
    this.type = 'BufferGeometry';
    this.attributes = {};
    this.index = null;
  }

  setAttribute(name, attribute) {
    this.attributes[name] = attribute;
    return this;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  setIndex(index) {
    this.index = index;
    return this;
  }

  computeVertexNormals() {}
  computeBoundingBox() {}
  computeBoundingSphere() {}
  dispose() {}
}

export class BoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, depth = 1) {
    super();
    this.type = 'BoxGeometry';
    this.parameters = { width, height, depth };
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 32, heightSegments = 16) {
    super();
    this.type = 'SphereGeometry';
    this.parameters = { radius, widthSegments, heightSegments };
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(
    radiusTop = 1,
    radiusBottom = 1,
    height = 1,
    radialSegments = 32
  ) {
    super();
    this.type = 'CylinderGeometry';
    this.parameters = { radiusTop, radiusBottom, height, radialSegments };
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    super();
    this.type = 'PlaneGeometry';
    this.parameters = { width, height, widthSegments, heightSegments };
    this.attributes = {
      position: { array: new Float32Array((widthSegments + 1) * (heightSegments + 1) * 3) }
    };
  }
}

export class RingGeometry extends BufferGeometry {
  constructor(innerRadius = 0.5, outerRadius = 1, thetaSegments = 32) {
    super();
    this.type = 'RingGeometry';
    this.parameters = { innerRadius, outerRadius, thetaSegments };
  }
}

export class ConeGeometry extends BufferGeometry {
  constructor(radius = 1, height = 1, radialSegments = 32) {
    super();
    this.type = 'ConeGeometry';
    this.parameters = { radius, height, radialSegments };
  }
}

// ============================================
// MATERIALS
// ============================================
export class Material {
  constructor() {
    this.uuid = `${Date.now()}-${Math.random()}`;
    this.type = 'Material';
    this.transparent = false;
    this.opacity = 1;
    this.visible = true;
    this.side = 0;
    this.needsUpdate = false;
  }

  clone() {
    return new this.constructor().copy(this);
  }

  copy(source) {
    this.transparent = source.transparent;
    this.opacity = source.opacity;
    this.visible = source.visible;
    return this;
  }

  dispose() {}
}

export class MeshBasicMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.type = 'MeshBasicMaterial';
    this.color = new Color(parameters.color ?? 0xffffff);
    Object.assign(this, parameters);
  }
}

export class MeshStandardMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.type = 'MeshStandardMaterial';
    this.color = new Color(parameters.color ?? 0xffffff);
    this.roughness = parameters.roughness ?? 1;
    this.metalness = parameters.metalness ?? 0;
    Object.assign(this, parameters);
  }
}

export class MeshPhongMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.type = 'MeshPhongMaterial';
    this.color = new Color(parameters.color ?? 0xffffff);
    Object.assign(this, parameters);
  }
}

export class PointsMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.type = 'PointsMaterial';
    this.color = new Color(parameters.color ?? 0xffffff);
    this.size = parameters.size ?? 1;
    this.sizeAttenuation = parameters.sizeAttenuation ?? true;
    this.vertexColors = parameters.vertexColors ?? false;
    Object.assign(this, parameters);
  }
}

export class LineBasicMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.type = 'LineBasicMaterial';
    this.color = new Color(parameters.color ?? 0xffffff);
    Object.assign(this, parameters);
  }
}

// ============================================
// BUFFER ATTRIBUTE
// ============================================
export class BufferAttribute {
  constructor(array, itemSize, normalized = false) {
    this.array = array;
    this.itemSize = itemSize;
    this.normalized = normalized;
    this.count = array.length / itemSize;
    this.needsUpdate = false;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) {
    super(array instanceof Float32Array ? array : new Float32Array(array), itemSize);
  }
}

// ============================================
// POINTS
// ============================================
export class Points extends Object3D {
  constructor(geometry, material) {
    super();
    this.type = 'Points';
    this.geometry = geometry;
    this.material = material;
  }
}

// ============================================
// LINE
// ============================================
export class Line extends Object3D {
  constructor(geometry, material) {
    super();
    this.type = 'Line';
    this.geometry = geometry;
    this.material = material;
  }
}

// ============================================
// FOG
// ============================================
export class Fog {
  constructor(color, near, far) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  }
}

// ============================================
// RAYCASTER
// ============================================
export class Raycaster {
  constructor(origin, direction, near = 0, far = Infinity) {
    this.ray = { origin: origin || new Vector3(), direction: direction || new Vector3() };
    this.near = near;
    this.far = far;
  }

  setFromCamera(coords, camera) {
    return this;
  }

  intersectObject(object, recursive = false) {
    return [];
  }

  intersectObjects(objects, recursive = false) {
    return [];
  }
}

// ============================================
// RENDERER
// ============================================
export class WebGLRenderer {
  constructor(parameters = {}) {
    this.domElement = {
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    this.shadowMap = {
      enabled: false,
      type: 0
    };
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
  }

  setSize(width, height) {}
  setPixelRatio(ratio) {}
  render(scene, camera) {}
  dispose() {}
  setClearColor(color, alpha) {}
  getSize(target) {
    target.set(800, 600);
    return target;
  }
}

// ============================================
// CONSTANTS
// ============================================
export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const PCFSoftShadowMap = 2;
export const ACESFilmicToneMapping = 4;

// ============================================
// MATH UTILITIES
// ============================================
export const MathUtils = {
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  lerp: (a, b, t) => a + (b - a) * t,
  degToRad: (degrees) => degrees * (Math.PI / 180),
  radToDeg: (radians) => radians * (180 / Math.PI),
  randFloat: (min, max) => min + Math.random() * (max - min),
  randFloatSpread: (range) => range * (0.5 - Math.random())
};

// ============================================
// DEFAULT EXPORT
// ============================================
export default {
  Vector3,
  Euler,
  Quaternion,
  Color,
  Object3D,
  Group,
  Scene,
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  Mesh,
  Light,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PointLight,
  BufferGeometry,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  PlaneGeometry,
  RingGeometry,
  ConeGeometry,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhongMaterial,
  PointsMaterial,
  LineBasicMaterial,
  BufferAttribute,
  Float32BufferAttribute,
  Points,
  Line,
  Fog,
  Raycaster,
  WebGLRenderer,
  DoubleSide,
  FrontSide,
  BackSide,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  MathUtils
};
