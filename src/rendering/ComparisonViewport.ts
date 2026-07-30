/**
 * ComparisonViewport — live secondary 3D view for Compare A/B set B.
 *
 * Role: Owns the right-hand canvas, SceneManager, experiment root, and RenderKit for set B.
 * Connections: Factory injected into ComparisonController; rendered from main.ts when active.
 * Extension: Keep camera synced from primary for fair visual A/B; orbit only the left (A) view.
 */
import * as THREE from 'three';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import type { ExperimentRenderContext } from './ExperimentRenderContext';
import { RenderKit } from './RenderKit';
import { SceneManager, type EnvironmentStyle } from './SceneManager';

const EXPERIMENT_ENV: Record<string, EnvironmentStyle> = {
  pendulum: 'pendulum',
  projectile: 'projectile',
  spring: 'spring',
  atwood: 'default',
};

export class ComparisonViewport {
  private readonly pane: HTMLElement;
  private readonly sceneManager: SceneManager;
  private readonly experimentRoot: THREE.Group;
  private renderKit = new RenderKit();
  private active = false;

  constructor(pane: HTMLElement, canvas: HTMLCanvasElement) {
    this.pane = pane;
    this.sceneManager = new SceneManager(canvas);
    this.sceneManager.controls.enabled = false;
    this.experimentRoot = new THREE.Group();
    this.sceneManager.scene.add(this.experimentRoot);
    this.setActive(false);
  }

  isActive(): boolean {
    return this.active;
  }

  setActive(active: boolean): void {
    this.active = active;
    this.pane.hidden = !active;
    this.pane.setAttribute('aria-hidden', active ? 'false' : 'true');
    if (active) {
      this.resize();
    }
  }

  prepareForExperiment(experimentId: string): void {
    this.renderKit = new RenderKit();
    const envStyle = EXPERIMENT_ENV[experimentId] ?? 'default';
    this.sceneManager.setEnvironmentStyle(envStyle);
    this.sceneManager.resetCamera();
    this.sceneManager.controls.enabled = false;
  }

  createContext(recorder: MeasurementRecorder): ExperimentRenderContext {
    return {
      scene: this.sceneManager.scene,
      root: this.experimentRoot,
      camera: this.sceneManager.camera,
      renderKit: this.renderKit,
      recorder,
      syncCameraTarget: (x, y, z) => this.sceneManager.syncCameraTarget(x, y, z),
    };
  }

  disposeVisuals(): void {
    this.renderKit.disposeAll();
    while (this.experimentRoot.children.length > 0) {
      this.experimentRoot.remove(this.experimentRoot.children[0]);
    }
  }

  /** Match primary camera so A/B differences are spatial, not viewpoint. */
  syncCameraFrom(primary: SceneManager): void {
    this.sceneManager.camera.position.copy(primary.camera.position);
    this.sceneManager.camera.quaternion.copy(primary.camera.quaternion);
    this.sceneManager.camera.fov = primary.camera.fov;
    this.sceneManager.camera.near = primary.camera.near;
    this.sceneManager.camera.far = primary.camera.far;
    this.sceneManager.controls.target.copy(primary.controls.target);
    this.sceneManager.camera.updateProjectionMatrix();
  }

  resize(): void {
    this.sceneManager.resize();
  }

  render(): void {
    if (!this.active) return;
    this.sceneManager.render();
  }
}
