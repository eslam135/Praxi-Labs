/**
 * Core type contracts for the Physics Experiments Platform.
 *
 * Role: Single source of truth for experiment and measurement contracts (no Three.js).
 * Connections: Imported by core/, experiments/, ui/, rendering/, and physics/.
 * Extension: Read this file first when adding a new experiment or framework feature.
 * SOLID: Experiment is composed from narrow interfaces (ISP) while remaining one type for agents.
 */
import type { MeasurementRecorder } from './MeasurementRecorder';

export type ParameterType = 'slider' | 'number' | 'toggle';

export interface ParameterSchema {
  key: string;
  label: string;
  type: ParameterType;
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
}

export type ParameterValues = Record<string, number | boolean>;

export interface MeasurementChannel {
  id: string;
  label: string;
  unit: string;
  values: Float64Array;
}

export interface ScalarMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  theoretical?: number;
  percentError?: number;
}

export interface MeasurementSnapshot {
  time: Float64Array;
  channels: MeasurementChannel[];
  scalars: ScalarMetric[];
  /** Number of valid samples in the ring buffers (axis length when comparing = max A/B). */
  count: number;
  /** True when channels include set-B overlays (ids suffixed with __B). */
  comparisonActive?: boolean;
  /** Valid sample count for set A when comparison is active. */
  primaryCount?: number;
  /** Valid sample count for set B when comparison is active. */
  secondaryCount?: number;
}

/** Schema + writable parameters (ISP slice). */
export interface Parameterized {
  getParameterSchema(): ParameterSchema[];
  setParameters(params: ParameterValues): void;
}

/** Fixed-timestep simulation lifecycle (ISP slice). */
export interface Steppable {
  update(dt: number): void;
  reset(): void;
}

/** Measurement export for graphs/scalars (ISP slice). */
export interface Measurable {
  getMeasurements(): MeasurementSnapshot;
}

/**
 * Scene attachment lifecycle (ISP slice).
 * C is the render context type supplied by the rendering layer (DIP).
 */
export interface SceneAttached<C = unknown> {
  setup(context: C): void;
  dispose(): void;
  /**
   * Optional visual interpolation between fixed physics steps.
   * alpha is in [0, 1] from the simulation accumulator (0 = previous state, 1 = current).
   */
  render?(alpha: number): void;
}

/**
 * Full experiment contract required by the platform / assessment brief.
 * Composed from narrower interfaces; implement this one type in experiment files.
 */
export interface Experiment<C = unknown>
  extends Parameterized, Steppable, Measurable, SceneAttached<C> {}

export type ComparisonEditTarget = 'A' | 'B';

/** Suffix appended to measurement channel ids for comparison set B. */
export const COMPARISON_B_SUFFIX = '__B';

export interface ExperimentRegistration<C = unknown> {
  id: string;
  name: string;
  factory: () => Experiment<C>;
}

/**
 * Rendering-layer adapter injected into ExperimentHost (DIP).
 * Core never imports Three.js; main/rendering provide the concrete adapter.
 */
export interface ExperimentSceneAdapter<C> {
  /** Environment + camera reset before setup. */
  prepareForExperiment(experimentId: string): void;
  /** Build a fresh primary context bound to the live viewport. */
  createPrimaryContext(recorder: MeasurementRecorder): C;
  /** Dispose geometries/materials and clear the experiment root. */
  disposePrimaryVisuals(): void;
}

/** Factory for headless/offscreen comparison contexts. */
export type OffscreenContextFactory<C> = (recorder: MeasurementRecorder) => {
  context: C;
  dispose: () => void;
};

export type DerivativeFunction = (state: Float64Array, out: Float64Array) => void;

export interface Integrator {
  step(state: Float64Array, derivatives: DerivativeFunction, dt: number): void;
}

export interface EnergyBreakdown {
  kinetic: number;
  potential: number;
  total: number;
}

export type ParameterChangeListener = (params: ParameterValues) => void;

export interface SimulationStepCallbacks {
  onFixedUpdate: (dt: number) => void;
  onRender: (alpha: number) => void;
}
