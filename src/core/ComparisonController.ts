/**
 * ComparisonController — A/B parameter comparison for one experiment.
 *
 * Role: Owns A/B parameter sets and experiment B (second viewport); merges measurements for graphs.
 * Connections: Used by ExperimentHost; context factory injected from rendering/ (DIP).
 * Extension: Set B is shown in the right 3D pane; Time Series still overlays dashed B channels.
 */
import { getExperiment } from './ExperimentRegistry';
import { MeasurementRecorder } from './MeasurementRecorder';
import { mergeComparisonSnapshots } from './mergeComparisonSnapshots';
import type {
  ComparisonEditTarget,
  ComparisonContextFactory,
  Experiment,
  MeasurementSnapshot,
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
  private disposeContext: (() => void) | null = null;
  private readonly createContext: ComparisonContextFactory<C>;

  constructor(createContext: ComparisonContextFactory<C>) {
    this.createContext = createContext;
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
   * Route schema-panel edits to set A (primary) or set B (secondary viewport).
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

  render(alpha: number): void {
    if (!this.enabled || !this.experimentB) return;
    this.experimentB.render?.(alpha);
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
    const created = this.createContext(this.recorderB, experimentId);
    this.disposeContext = created.dispose;
    this.experimentB = registration.factory();
    this.experimentB.setup(created.context);
    this.experimentB.setParameters(this.paramsB);
    this.experimentB.reset();
  }

  private teardownB(): void {
    if (this.experimentB) {
      this.experimentB.dispose();
      this.experimentB = null;
    }
    this.disposeContext?.();
    this.disposeContext = null;
    this.recorderB.clear();
  }
}
