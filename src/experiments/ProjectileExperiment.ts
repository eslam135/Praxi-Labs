/**
 * Projectile experiment — 2D projectile with drag and range comparison.
 *
 * Role: Glue layer wiring projectile physics to trajectory visualization.
 * Connections: Uses physics/equations/projectile; registered in experiments/index.ts.
 * Extension: Uses launched toggle for preview vs simulation modes.
 */
import * as THREE from 'three';
import type {
  Experiment,
  MeasurementSnapshot,
  ParameterSchema,
  ParameterValues,
  ScalarMetric,
} from '../core/types';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import type { RenderKit } from '../rendering/RenderKit';
import type { ExperimentRenderContext } from '../rendering/ExperimentRenderContext';
import { frameCameraToBounds } from '../rendering/cameraUtils';
import { SemiImplicitEuler } from '../physics/integrators/SemiImplicitEuler';
import {
  analyticTrajectoryPoints,
  computeProjectileEnergy,
  createProjectileState,
  getTrajectoryBounds,
  projectileDerivatives,
  theoreticalProjectileRange,
  type ProjectileParams,
} from '../physics/equations/projectile';
import { percentDifference } from '../physics/analysis/period';
import {
  createBox,
  createLine,
  createMarker,
  createRod,
  createSphere,
  updateLinePoints,
} from '../rendering/objects/primitives';

const DEFAULT_PARAMS: ProjectileParams = {
  launchAngle: 45,
  initialSpeed: 10,
  gravity: 9.81,
  dragCoefficient: 0,
};

const TRAIL_MAX = 400;
const COLOR_PREDICTED = 0x4ade80;
const COLOR_ACTUAL = 0x38bdf8;
const COLOR_PROJECTILE = 0xff7043;
const COLOR_LANDING = 0xfbbf24;

export class ProjectileExperiment implements Experiment<ExperimentRenderContext> {
  private params: ProjectileParams = { ...DEFAULT_PARAMS };
  private launched = false;
  private state = createProjectileState(this.params);
  private prevState = createProjectileState(this.params);
  private integrator = new SemiImplicitEuler();
  private recorder: MeasurementRecorder | null = null;
  private landed = false;
  private landingX = 0;

  private root: THREE.Group | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderKit: RenderKit | null = null;
  private syncCameraTarget: ((x: number, y: number, z: number) => void) | null = null;
  private projectile: THREE.Mesh | null = null;
  private predictedLine: THREE.Line | null = null;
  private actualTrail: THREE.Line | null = null;
  private landingMarker: THREE.Mesh | null = null;
  private launchPad: THREE.Mesh | null = null;
  private cannon: THREE.Mesh | null = null;
  private trailPoints: THREE.Vector3[] = [];

  setup(context: ExperimentRenderContext): void {
    this.recorder = context.recorder;
    this.root = context.root;
    this.camera = context.camera;
    this.renderKit = context.renderKit;
    this.syncCameraTarget = context.syncCameraTarget ?? null;

    this.recorder.registerChannel('x', 'Horizontal Position', 'm');
    this.recorder.registerChannel('y', 'Vertical Position', 'm');
    this.recorder.registerChannel('energy_kinetic', 'Kinetic Energy', 'J');
    this.recorder.registerChannel('energy_potential', 'Potential Energy', 'J');
    this.recorder.registerChannel('energy_total', 'Total Energy', 'J');

    this.buildLaunchPad(context);
    this.projectile = createSphere(
      context.renderKit,
      context.root,
      0.2,
      COLOR_PROJECTILE,
      undefined,
      COLOR_PROJECTILE,
    );
    this.landingMarker = createMarker(context.renderKit, context.root, COLOR_LANDING);
    this.landingMarker.visible = false;

    this.trailPoints = [new THREE.Vector3(0, 0.2, 0)];
    this.actualTrail = createLine(context.renderKit, context.root, this.trailPoints, COLOR_ACTUAL);
    this.actualTrail.visible = false;

    this.updatePredictedTrajectory();
    this.frameCamera();
  }

  update(dt: number): void {
    if (!this.launched || this.landed) return;

    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];
    this.prevState[2] = this.state[2];
    this.prevState[3] = this.state[3];

    const derivatives = (s: Float64Array, out: Float64Array) => {
      projectileDerivatives(s, this.params, out);
    };
    this.integrator.step(this.state, derivatives, dt);

    if (this.state[1] <= 0 && this.state[3] < 0) {
      this.state[1] = 0;
      this.landed = true;
      this.landingX = this.state[0];
      if (this.landingMarker) {
        this.landingMarker.position.set(this.landingX, 0.15, 0);
        this.landingMarker.visible = true;
      }
    }

    this.appendTrailPoint();

    const energy = computeProjectileEnergy(this.state, this.params);
    this.recorder?.append(dt, {
      x: this.state[0],
      y: Math.max(this.state[1], 0),
      energy_kinetic: energy.kinetic,
      energy_potential: energy.potential,
      energy_total: energy.total,
    });
  }

  render(alpha: number): void {
    const x = this.prevState[0] + (this.state[0] - this.prevState[0]) * alpha;
    const y = this.prevState[1] + (this.state[1] - this.prevState[1]) * alpha;
    this.syncVisuals(x, y);
  }

  reset(): void {
    this.state = createProjectileState(this.params);
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];
    this.prevState[2] = this.state[2];
    this.prevState[3] = this.state[3];
    this.landed = false;
    this.landingX = 0;
    this.recorder?.clear();
    this.trailPoints = [new THREE.Vector3(0, 0.2, 0)];

    if (this.projectile) {
      this.projectile.position.set(0, 0.2, 0);
    }
    if (this.landingMarker) {
      this.landingMarker.visible = false;
    }
    if (this.actualTrail) {
      this.actualTrail.visible = false;
      updateLinePoints(this.actualTrail, this.trailPoints);
    }
    if (this.predictedLine) {
      this.predictedLine.visible = !this.launched;
    }

    this.updateLaunchAngleVisual();
    this.updatePredictedTrajectory();
    this.frameCamera();
  }

  dispose(): void {
    this.projectile = null;
    this.predictedLine = null;
    this.actualTrail = null;
    this.landingMarker = null;
    this.launchPad = null;
    this.cannon = null;
    this.root = null;
    this.camera = null;
    this.renderKit = null;
    this.syncCameraTarget = null;
  }

  getMeasurements(): MeasurementSnapshot {
    const snapshot = this.recorder?.getSnapshot() ?? {
      time: new Float64Array(0),
      channels: [],
      scalars: [],
      count: 0,
    };
    return { ...snapshot, scalars: this.buildScalars() };
  }

  getParameterSchema(): ParameterSchema[] {
    return [
      { key: 'launchAngle', label: 'Launch Angle', type: 'slider', default: 45, min: 5, max: 85, step: 1, unit: '°', description: 'Angle above horizontal. Dotted line shows predicted no-drag trajectory.' },
      { key: 'initialSpeed', label: 'Initial Speed', type: 'slider', default: 10, min: 1, max: 30, step: 0.5, unit: 'm/s' },
      { key: 'gravity', label: 'Gravity', type: 'slider', default: 9.81, min: 1, max: 20, step: 0.01, unit: 'm/s²' },
      { key: 'dragCoefficient', label: 'Drag Coefficient', type: 'slider', default: 0, min: 0, max: 0.5, step: 0.01, unit: '1/s', description: 'Air resistance strength. 0 = vacuum (matches analytic prediction).' },
      { key: 'launched', label: 'Launched', type: 'toggle', default: false, description: 'Toggle on to start the simulation. Off shows predicted trajectory preview.' },
    ];
  }

  setParameters(params: ParameterValues): void {
    const prevLaunched = this.launched;

    this.params = {
      launchAngle: Number(params.launchAngle ?? this.params.launchAngle),
      initialSpeed: Number(params.initialSpeed ?? this.params.initialSpeed),
      gravity: Number(params.gravity ?? this.params.gravity),
      dragCoefficient: Number(params.dragCoefficient ?? this.params.dragCoefficient),
    };
    this.launched = Boolean(params.launched);

    if (this.launched && !prevLaunched) {
      this.reset();
      this.launched = true;
      if (this.predictedLine) this.predictedLine.visible = false;
      if (this.actualTrail) this.actualTrail.visible = true;
      this.frameCamera();
    } else if (!this.launched) {
      this.reset();
    } else if (!this.landed) {
      this.updatePredictedTrajectory();
      this.updateLaunchAngleVisual();
      this.frameCamera();
    }
  }

  private buildLaunchPad(context: ExperimentRenderContext): void {
    this.launchPad = createBox(context.renderKit, context.root, 1.2, 0.15, 0.8, 0x334155);
    this.launchPad.position.set(0, 0.075, 0);

    this.cannon = createRod(context.renderKit, context.root, 0.6, 0.06, 0x64748b);
    this.cannon.position.set(0, 0.2, 0);
    this.updateLaunchAngleVisual();
  }

  private updateLaunchAngleVisual(): void {
    if (!this.cannon) return;
    const angleRad = (this.params.launchAngle * Math.PI) / 180;
    this.cannon.rotation.z = angleRad;
  }

  private frameCamera(): void {
    if (!this.camera) return;
    const { maxX, maxY } = getTrajectoryBounds(this.params);
    const aspect = this.camera.aspect > 0 ? this.camera.aspect : 16 / 9;
    frameCameraToBounds(
      this.camera,
      { minX: -1, maxX, minY: -0.5, maxY },
      aspect,
      1.35,
      this.syncCameraTarget ?? undefined,
    );
  }

  private syncVisuals(x: number, y: number): void {
    if (this.projectile) {
      this.projectile.position.set(x, Math.max(y, 0.2), 0);
    }
  }

  private appendTrailPoint(): void {
    if (!this.actualTrail) return;
    const x = this.state[0];
    const y = Math.max(this.state[1], 0.05);

    const last = this.trailPoints[this.trailPoints.length - 1];
    if (last && Math.abs(last.x - x) < 0.01 && Math.abs(last.y - y) < 0.01) return;

    this.trailPoints.push(new THREE.Vector3(x, y, 0));
    if (this.trailPoints.length > TRAIL_MAX) {
      this.trailPoints.shift();
    }

    updateLinePoints(this.actualTrail, this.trailPoints);
  }

  private updatePredictedTrajectory(): void {
    if (!this.root || !this.renderKit) return;

    if (this.predictedLine?.parent) {
      this.predictedLine.parent.remove(this.predictedLine);
      this.predictedLine = null;
    }

    const points = analyticTrajectoryPoints(this.params, 120).map(
      (p) => new THREE.Vector3(p.x, Math.max(p.y, 0.05), 0),
    );
    if (points.length > 1) {
      this.predictedLine = createLine(
        this.renderKit,
        this.root,
        points,
        COLOR_PREDICTED,
        true,
      );
      this.predictedLine.visible = !this.launched;
    }

    this.frameCamera();
  }

  private buildScalars(): ScalarMetric[] {
    const theoretical = theoreticalProjectileRange(
      this.params.launchAngle,
      this.params.initialSpeed,
      this.params.gravity,
    );

    const scalars: ScalarMetric[] = [
      {
        id: 'range_predicted',
        label: 'Predicted Range (no drag)',
        value: theoretical,
        unit: 'm',
      },
    ];

    if (this.landed) {
      scalars.push({
        id: 'range_actual',
        label: 'Actual Range',
        value: this.landingX,
        unit: 'm',
        theoretical,
        percentError: percentDifference(this.landingX, theoretical),
      });
    }

    return scalars;
  }
}
