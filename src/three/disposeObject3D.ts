import * as THREE from 'three'

/** Disposes geometries and materials (including texture maps) of every mesh in a subtree. */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      material.map?.dispose()
      material.dispose()
    }
  })
}
