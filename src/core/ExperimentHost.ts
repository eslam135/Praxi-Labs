/**
 * Experiment host — orchestrates experiment lifecycle (load, switch, reset, dispose).
 *
 * Role: Thin coordinator over registry, ParameterStore, scene adapter, and comparison.
 * Connections: Used by main.ts; delegates physics to Experiment; rendering via adapter (DIP).
 * Extension: New experiments require no changes here — only registry entry.
 */
import { ComparisonController } from './ComparisonController';
import { getExperiment } from './ExperimentRegistry';
import { MeasurementRecorder } from './MeasurementRecorder';
import { ParameterStore } from './ParameterStore';
import type {
  ComparisonEditTarget,
  ComparisonContextFactory,
  Experiment,
  ExperimentSceneAdapter,
  MeasurementSnapshot,
} from './types';

export class ExperimentHost<C = unknown> {
  private readonly parameterStore: ParameterStore;
  private readonly scene: ExperimentSceneAdapter<C>;
  private readonly recorder = new MeasurementRecorder();
  private readonly comparison: ComparisonController<C>;
  private current: Experiment<C> | null = null;
  private currentId: string | null = null;
  private onExperimentChanged: (() => void) | null = null;

  constructor(
    parameterStore: ParameterStore,
    scene: ExperimentSceneAdapter<C>,
    createComparisonContext: ComparisonContextFactory<C>,
  ) {
    this.parameterStore = parameterStore;
    this.scene = scene;
    this.comparison = new ComparisonController(createComparisonContext);

    this.parameterStore.onChange((params) => {
      this.comparison.applyPanelParams(params, this.current);
    });
  }

  getRecorder(): MeasurementRecorder {
    return this.recorder;
  }

  getActiveExperiment(): Experiment<C> | null {
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
    this.comparison.setEnabled(enabled, this.currentId, seed);
    this.onExperimentChanged?.();
  }

  setComparisonEditTarget(target: ComparisonEditTarget): void {
    const values = this.comparison.switchEditTarget(target, this.parameterStore.getValues());
    this.parameterStore.setValues(values, { silent: true });
    this.onExperimentChanged?.();
  }

  switchExperiment(id: string): void {
    const registration = getExperiment<C>(id);
    if (!registration) {
      throw new Error(`Unknown experiment id: ${id}`);
    }

    this.disposeCurrent();

    this.recorder.clear();
    this.current = registration.factory();
    this.currentId = id;

    this.scene.prepareForExperiment(id);
    const context = this.scene.createPrimaryContext(this.recorder);
    this.current.setup(context);
    this.parameterStore.setSchema(this.current.getParameterSchema());

    const paramsA = this.parameterStore.getValues();
    this.current.setParameters(paramsA);
    this.current.reset();

    this.comparison.onPrimaryExperimentChanged(id, paramsA);
    if (this.comparison.isEnabled()) {
      this.parameterStore.setValues(this.comparison.getParamsA(), { silent: true });
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
    this.comparison.render(alpha);
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

  private disposeCurrent(): void {
    if (this.current) {
      this.current.dispose();
      this.current = null;
    }
    this.scene.disposePrimaryVisuals();
  }
}
