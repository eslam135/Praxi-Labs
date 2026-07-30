/**
 * Core type contracts for the Physics Experiments Platform.
 *
 * Role: Single source of truth for all interfaces shared across modules.
 * Connections: Imported by core/, experiments/, ui/, rendering/, and physics/.
 * Extension: Read this file first when adding a new experiment or framework feature.
 */
import type * as THREE from 'three';
import type { MeasurementRecorder } from './MeasurementRecorder';
import type { RenderKit } from '../rendering/RenderKit';

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

export interface ExperimentContext {
  scene: THREE.Scene;
  root: THREE.Group;
  camera: THREE.PerspectiveCamera;
  renderKit: RenderKit;
  recorder: MeasurementRecorder;
  /** Sync orbit-controls target after programmatic camera framing. */
  syncCameraTarget?: (x: number, y: number, z: number) => void;
}

export interface Experiment {
  setup(context: ExperimentContext): void;
  update(dt: number): void;
  /**
   * Optional visual interpolation between fixed physics steps.
   * alpha is in [0, 1] from the simulation accumulator (0 = previous state, 1 = current).
   */
  render?(alpha: number): void;
  reset(): void;
  dispose(): void;
  getMeasurements(): MeasurementSnapshot;
  getParameterSchema(): ParameterSchema[];
  setParameters(params: ParameterValues): void;
}

export type ComparisonEditTarget = 'A' | 'B';

/** Suffix appended to measurement channel ids for comparison set B. */
export const COMPARISON_B_SUFFIX = '__B';

export interface ExperimentRegistration {
  id: string;
  name: string;
  factory: () => Experiment;
}

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
