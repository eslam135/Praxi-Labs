/**
 * ComparisonController — light A/B parameter comparison for one experiment.
 *
 * Role: Runs a second headless experiment instance (set B) alongside the live 3D
 * experiment (set A). No second viewport — only measurement overlays on the graph.
 * Connections: Owned by ExperimentHost; GraphSystem overlays __B channels.
 * Extension: Do not add dual scenes here; keep comparison measurement-only.
 */
import * as THREE from 'three';
import { getExperiment } from './ExperimentRegistry';
import { MeasurementRecorder } from './MeasurementRecorder';
import { mergeComparisonSnapshots } from './mergeComparisonSnapshots';
import type {
  ComparisonEditTarget,
  Experiment,
  ExperimentContext,
  MeasurementSnapshot,
  ParameterValues,
} from './types';
import { RenderKit } from '../rendering/RenderKit';

export class ComparisonController {
  private enabled = false;
  private editTarget: ComparisonEditTarget = 'A';
  private paramsB: ParameterValues = {};
  private experimentB: Experiment | null = null;
  private recorderB = new MeasurementRecorder();
  private renderKitB = new RenderKit();
  private sceneB = new THREE.Scene();
  private rootB = new THREE.Group();
  private cameraB = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

  constructor() {
    this.sceneB.add(this.rootB);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getEditTarget(): ComparisonEditTarget {
    return this.editTarget;
  }

  getParamsB(): ParameterValues {
    return { ...this.paramsB };
  }

  setEditTarget(target: ComparisonEditTarget): void {
    this.editTarget = target;
  }

  setParamsB(params: ParameterValues): void {
    this.paramsB = { ...params };
    if (this.enabled && this.experimentB) {
      this.experimentB.setParameters(this.paramsB);
    }
  }

  /**
   * Enable/disable comparison for the given experiment id.
   * seedParams becomes the initial set-B values (typically a copy of set A).
   */
  setEnabled(enabled: boolean, experimentId: string | null, seedParams: ParameterValues): void {
    if (!enabled) {
      this.teardownB();
      this.enabled = false;
      return;
    }

    if (!experimentId) {
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.paramsB = { ...seedParams };
    this.attachExperiment(experimentId);
  }

  /** Recreate set B when the primary experiment switches. */
  onPrimaryExperimentChanged(experimentId: string, seedParams: ParameterValues): void {
    if (!this.enabled) return;
    this.paramsB = { ...seedParams };
    this.attachExperiment(experimentId);
  }

  fixedUpdate(dt: number): void {
    if (!this.enabled || !this.experimentB) return;
    this.experimentB.update(dt);
  }

  reset(): void {
    if (!this.enabled || !this.experimentB) return;
    this.recorderB.clear();
    this.experimentB.reset();
  }

  mergeWithPrimary(primary: MeasurementSnapshot): MeasurementSnapshot {
    if (!this.enabled || !this.experimentB) {
      return { ...primary, comparisonActive: false };
    }
    return mergeComparisonSnapshots(primary, this.experimentB.getMeasurements());
  }

  dispose(): void {
    this.teardownB();
    this.enabled = false;
  }

  private attachExperiment(experimentId: string): void {
    this.teardownB();

    const registration = getExperiment(experimentId);
    if (!registration) return;

    this.renderKitB = new RenderKit();
    this.recorderB = new MeasurementRecorder();
    this.rootB.clear();
    this.experimentB = registration.factory();

    const context: ExperimentContext = {
      scene: this.sceneB,
      root: this.rootB,
      camera: this.cameraB,
      renderKit: this.renderKitB,
      recorder: this.recorderB,
    };

    this.experimentB.setup(context);
    this.experimentB.setParameters(this.paramsB);
    this.experimentB.reset();
  }

  private teardownB(): void {
    if (this.experimentB) {
      this.experimentB.dispose();
      this.experimentB = null;
    }
    this.renderKitB.disposeAll();
    while (this.rootB.children.length > 0) {
      this.rootB.remove(this.rootB.children[0]);
    }
    this.recorderB.clear();
  }
}
