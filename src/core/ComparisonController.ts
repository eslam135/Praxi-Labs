/**
 * ComparisonController — light A/B parameter comparison for one experiment.
 *
 * Role: Owns A/B parameter sets and a headless experiment B; merges measurements for graphs.
 * Connections: Used by ExperimentHost; offscreen context factory injected (DIP).
 * Extension: Do not add dual viewports; keep comparison measurement-only.
 */
import { getExperiment } from './ExperimentRegistry';
import { MeasurementRecorder } from './MeasurementRecorder';
import { mergeComparisonSnapshots } from './mergeComparisonSnapshots';
import type {
  ComparisonEditTarget,
  Experiment,
  MeasurementSnapshot,
  OffscreenContextFactory,
  Parameterized,
  ParameterValues,
} from './types';

export class ComparisonController<C = unknown> {
  private enabled = false;
  private editTarget: ComparisonEditTarget = 'A';
  private paramsA: ParameterValues = {};
  private paramsB: ParameterValues = {};
  private experimentB: Experiment<C> | null = null;
  private recorderB = new MeasurementRecorder();
  private disposeOffscreen: (() => void) | null = null;
  private readonly createOffscreen: OffscreenContextFactory<C>;

  constructor(createOffscreen: OffscreenContextFactory<C>) {
    this.createOffscreen = createOffscreen;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getEditTarget(): ComparisonEditTarget {
    return this.editTarget;
  }

  getParamsA(): ParameterValues {
    return { ...this.paramsA };
  }

  getParamsB(): ParameterValues {
    return { ...this.paramsB };
  }

  setEditTarget(target: ComparisonEditTarget): void {
    this.editTarget = target;
  }

  /**
   * Persist the set currently shown in the panel, switch edit target, return values for the store.
   */
  switchEditTarget(target: ComparisonEditTarget, currentPanelValues: ParameterValues): ParameterValues {
    if (target === this.editTarget) {
      return target === 'A' ? this.getParamsA() : this.getParamsB();
    }

    if (this.editTarget === 'A') {
      this.paramsA = { ...currentPanelValues };
    } else {
      this.paramsB = { ...currentPanelValues };
      if (this.experimentB) {
        this.experimentB.setParameters(this.paramsB);
      }
    }

    this.editTarget = target;
    return target === 'A' ? this.getParamsA() : this.getParamsB();
  }

  /**
   * Route schema-panel edits to set A (primary experiment) or set B (headless).
   */
  applyPanelParams(params: ParameterValues, primary: Parameterized | null): void {
    if (!this.enabled || this.editTarget === 'A') {
      this.paramsA = { ...params };
      primary?.setParameters(params);
      return;
    }
    this.paramsB = { ...params };
    this.experimentB?.setParameters(this.paramsB);
  }

  /**
   * Enable/disable comparison for the given experiment id.
   * seedParams becomes the initial A and B values.
   */
  setEnabled(enabled: boolean, experimentId: string | null, seedParams: ParameterValues): void {
    if (!enabled) {
      this.teardownB();
      this.enabled = false;
      this.editTarget = 'A';
      return;
    }

    if (!experimentId) {
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.paramsA = { ...seedParams };
    this.paramsB = { ...seedParams };
    this.editTarget = 'A';
    this.attachExperiment(experimentId);
  }

  /** Recreate set B when the primary experiment switches. */
  onPrimaryExperimentChanged(experimentId: string, seedParams: ParameterValues): void {
    this.paramsA = { ...seedParams };
    if (!this.enabled) return;
    this.paramsB = { ...seedParams };
    this.editTarget = 'A';
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

    const registration = getExperiment<C>(experimentId);
    if (!registration) return;

    this.recorderB = new MeasurementRecorder();
    const offscreen = this.createOffscreen(this.recorderB);
    this.disposeOffscreen = offscreen.dispose;
    this.experimentB = registration.factory();
    this.experimentB.setup(offscreen.context);
    this.experimentB.setParameters(this.paramsB);
    this.experimentB.reset();
  }

  private teardownB(): void {
    if (this.experimentB) {
      this.experimentB.dispose();
      this.experimentB = null;
    }
    this.disposeOffscreen?.();
    this.disposeOffscreen = null;
    this.recorderB.clear();
  }
}
