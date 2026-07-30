/**
 * Experiment host — manages experiment lifecycle (load, switch, reset, dispose).
 *
 * Role: Orchestrates registry, parameters, measurements, rendering, and optional A/B comparison.
 * Connections: Used by main.ts; delegates physics to active Experiment instance.
 * Extension: New experiments require no changes here — only registry entry.
 */
import * as THREE from 'three';
import { ComparisonController } from './ComparisonController';
import { getExperiment } from './ExperimentRegistry';
import { MeasurementRecorder } from './MeasurementRecorder';
import { ParameterStore } from './ParameterStore';
import type {
  ComparisonEditTarget,
  Experiment,
  ExperimentContext,
  MeasurementSnapshot,
  ParameterValues,
} from './types';
import { RenderKit } from '../rendering/RenderKit';
import type { EnvironmentStyle, SceneManager } from '../rendering/SceneManager';

const EXPERIMENT_ENV: Record<string, EnvironmentStyle> = {
  pendulum: 'pendulum',
  projectile: 'projectile',
  spring: 'spring',
};

export class ExperimentHost {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager | null;
  private experimentRoot: THREE.Group;
  private renderKit: RenderKit;
  private parameterStore: ParameterStore;
  private recorder: MeasurementRecorder;
  private current: Experiment | null = null;
  private currentId: string | null = null;
  private onExperimentChanged: (() => void) | null = null;
  private comparison = new ComparisonController();
  private paramsA: ParameterValues = {};

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    parameterStore: ParameterStore,
    sceneManager?: SceneManager,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.sceneManager = sceneManager ?? null;
    this.experimentRoot = new THREE.Group();
    this.scene.add(this.experimentRoot);
    this.renderKit = new RenderKit();
    this.parameterStore = parameterStore;
    this.recorder = new MeasurementRecorder();

    this.parameterStore.onChange((params) => {
      this.applyParameterChange(params);
    });
  }

  getRecorder(): MeasurementRecorder {
    return this.recorder;
  }

  getActiveExperiment(): Experiment | null {
    return this.current;
  }

  getActiveExperimentId(): string | null {
    return this.currentId;
  }

  isComparisonEnabled(): boolean {
    return this.comparison.isEnabled();
  }

  getComparisonEditTarget(): ComparisonEditTarget {
    return this.comparison.getEditTarget();
  }

  setOnExperimentChanged(callback: () => void): void {
    this.onExperimentChanged = callback;
  }

  setComparisonEnabled(enabled: boolean): void {
    const seed = this.parameterStore.getValues();
    this.paramsA = { ...seed };
    this.comparison.setEnabled(enabled, this.currentId, seed);
    if (enabled) {
      this.comparison.setEditTarget('A');
    }
    this.onExperimentChanged?.();
  }

  setComparisonEditTarget(target: ComparisonEditTarget): void {
    if (target === this.comparison.getEditTarget()) return;

    // Persist the set currently being edited before switching the panel.
    if (this.comparison.getEditTarget() === 'A') {
      this.paramsA = this.parameterStore.getValues();
    } else {
      this.comparison.setParamsB(this.parameterStore.getValues());
    }

    this.comparison.setEditTarget(target);
    const values = target === 'A' ? this.paramsA : this.comparison.getParamsB();
    this.parameterStore.setValues(values, { silent: true });
    this.onExperimentChanged?.();
  }

  switchExperiment(id: string): void {
    const registration = getExperiment(id);
    if (!registration) {
      throw new Error(`Unknown experiment id: ${id}`);
    }

    this.disposeCurrent();

    this.renderKit = new RenderKit();
    this.recorder.clear();
    this.current = registration.factory();
    this.currentId = id;

    const envStyle = EXPERIMENT_ENV[id] ?? 'default';
    this.sceneManager?.setEnvironmentStyle(envStyle);
    this.sceneManager?.resetCamera();

    const context: ExperimentContext = {
      scene: this.scene,
      root: this.experimentRoot,
      camera: this.camera,
      renderKit: this.renderKit,
      recorder: this.recorder,
      syncCameraTarget: (x, y, z) => this.sceneManager?.syncCameraTarget(x, y, z),
    };

    this.current.setup(context);
    this.parameterStore.setSchema(this.current.getParameterSchema());
    this.paramsA = this.parameterStore.getValues();
    this.current.setParameters(this.paramsA);
    this.current.reset();

    this.comparison.onPrimaryExperimentChanged(id, this.paramsA);
    if (this.comparison.isEnabled()) {
      this.comparison.setEditTarget('A');
      this.parameterStore.setValues(this.paramsA, { silent: true });
    }

    this.onExperimentChanged?.();
  }

  fixedUpdate(dt: number): void {
    if (!this.current) return;
    this.current.update(dt);
    this.comparison.fixedUpdate(dt);
  }

  render(alpha: number): void {
    this.current?.render?.(alpha);
  }

  reset(): void {
    this.recorder.clear();
    this.current?.reset();
    this.comparison.reset();
  }

  getMeasurements(): MeasurementSnapshot {
    if (!this.current) {
      return { time: new Float64Array(0), channels: [], scalars: [], count: 0 };
    }
    return this.comparison.mergeWithPrimary(this.current.getMeasurements());
  }

  private applyParameterChange(params: ParameterValues): void {
    if (!this.comparison.isEnabled() || this.comparison.getEditTarget() === 'A') {
      this.paramsA = { ...params };
      this.current?.setParameters(params);
      return;
    }
    this.comparison.setParamsB(params);
  }

  private disposeCurrent(): void {
    if (this.current) {
      this.current.dispose();
      this.current = null;
    }
    this.renderKit.disposeAll();

    while (this.experimentRoot.children.length > 0) {
      this.experimentRoot.remove(this.experimentRoot.children[0]);
    }
  }
}
