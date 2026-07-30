/**
 * RenderKit — tracks Three.js resources for safe disposal on experiment switch.
 *
 * Role: Wraps geometry/material/mesh creation; prevents GPU memory leaks.
 * Connections: Injected into ExperimentRenderContext; used by all experiments.
 * Extension: Use track() for any custom Three.js resource an experiment creates.
 */
import * as THREE from 'three';

type Disposable = THREE.BufferGeometry | THREE.Material | THREE.Texture;

export class RenderKit {
  private disposables: Disposable[] = [];
  private meshes: THREE.Object3D[] = [];

  track<T extends Disposable>(resource: T): T {
    this.disposables.push(resource);
    return resource;
  }

  addToScene(parent: THREE.Object3D, object: THREE.Object3D): THREE.Object3D {
    this.meshes.push(object);
    parent.add(object);
    return object;
  }

  disposeAll(): void {
    for (const mesh of this.meshes) {
      mesh.parent?.remove(mesh);
    }
    this.meshes = [];

    for (const item of this.disposables) {
      item.dispose();
    }
    this.disposables = [];
  }
}
