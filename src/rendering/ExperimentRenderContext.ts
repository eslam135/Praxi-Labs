/**
 * ExperimentRenderContext — Three.js-bearing setup context for experiment glue.
 *
 * Role: Concrete context passed to Experiment.setup(); lives in rendering/ so core
 * stays free of Three.js imports (DIP).
 * Connections: Built by ExperimentSceneAdapter / comparison viewport factory; used by experiments/.
 * Extension: Add shared render helpers here; do not put physics in this file.
 */
import type * as THREE from 'three';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import type { RenderKit } from './RenderKit';

export interface ExperimentRenderContext {
  scene: THREE.Scene;
  root: THREE.Group;
  camera: THREE.PerspectiveCamera;
  renderKit: RenderKit;
  recorder: MeasurementRecorder;
  /** Sync orbit-controls target after programmatic camera framing. */
  syncCameraTarget?: (x: number, y: number, z: number) => void;
}
