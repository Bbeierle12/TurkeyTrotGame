export function disposeMaterial(material) {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  for (const key of Object.keys(material)) {
    const value = material[key];
    if (value && value.isTexture && typeof value.dispose === 'function') {
      value.dispose();
    }
  }

  if (typeof material.dispose === 'function') {
    material.dispose();
  }
}

export function disposeObject(object) {
  if (!object || typeof object.traverse !== 'function') return;

  object.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
  });
}

export function disposeScene(scene) {
  disposeObject(scene);
}
