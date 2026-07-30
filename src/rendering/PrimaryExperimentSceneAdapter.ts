/**
 * PrimaryExperimentSceneAdapter — live-viewport ExperimentSceneAdapter implementation.
 *
 * Role: Owns the Three.js experiment root + RenderKit for the primary (3D) experiment.
 * Connections: Constructed in main.ts; injected into ExperimentHost (DIP).
 * Extension: Keep Three.js here; do not leak scene objects into core/.
 */
import * as THREE from 'three';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import type { ExperimentSceneAdapter } from '../core/types';
import type { ExperimentRenderContext } from './ExperimentRenderContext';
import { RenderKit } from './RenderKit';
import type { EnvironmentStyle, SceneManager } from './SceneManager';

const EXPERIMENT_ENV: Record<string, EnvironmentStyle> = {
  pendulum: 'pendulum',
  projectile: 'projectile',
  spring: 'spring',
};

export class PrimaryExperimentSceneAdapter implements ExperimentSceneAdapter<ExperimentRenderContext> {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sceneManager: SceneManager;
  private readonly experimentRoot: THREE.Group;
  private renderKit = new RenderKit();

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;
    this.experimentRoot = new THREE.Group();
    this.scene.add(this.experimentRoot);
  }

  prepareForExperiment(experimentId: string): void {
    this.renderKit = new RenderKit();
    const envStyle = EXPERIMENT_ENV[experimentId] ?? 'default';
    this.sceneManager.setEnvironmentStyle(envStyle);
    this.sceneManager.resetCamera();
  }

  createPrimaryContext(recorder: MeasurementRecorder): ExperimentRenderContext {
    return {
      scene: this.scene,
      root: this.experimentRoot,
      camera: this.camera,
      renderKit: this.renderKit,
      recorder,
      syncCameraTarget: (x, y, z) => this.sceneManager.syncCameraTarget(x, y, z),
    };
  }

  disposePrimaryVisuals(): void {
    this.renderKit.disposeAll();
    while (this.experimentRoot.children.length > 0) {
      this.experimentRoot.remove(this.experimentRoot.children[0]);
    }
  }
}
