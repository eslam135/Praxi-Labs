/**
 * Atwood machine experiment — two masses over an ideal pulley.
 *
 * Role: Glue layer wiring atwood physics to Three.js visuals.
 * Connections: Uses physics/equations/atwood; registered in experiments/index.ts.
 * Extension: Copy for other constrained 1-DOF mechanical systems.
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
import type { ExperimentRenderContext } from '../rendering/ExperimentRenderContext';
import { RK4 } from '../physics/integrators/RK4';
import {
  atwoodDerivatives,
  computeAtwoodEnergy,
  createAtwoodState,
  theoreticalAtwoodAcceleration,
  type AtwoodParams,
} from '../physics/equations/atwood';
import { percentDifference } from '../physics/analysis/period';
import { energyDriftPercent } from '../physics/analysis/energy';
import { createBox, createLine, createSphere, updateLinePoints } from '../rendering/objects/primitives';

const DEFAULT_PARAMS: AtwoodParams = {
  mass1: 2,
  mass2: 1,
  gravity: 9.81,
  initialDisplacement: 0,
};

/** Half-string length from pulley axle to each mass at x = 0 (m). */
const STRING_HALF = 2.5;
const PULLEY_Y = 4;
const PULLEY_RADIUS = 0.25;
const MASS_SEP_X = 0.9;

export class AtwoodExperiment implements Experiment<ExperimentRenderContext> {
  private params: AtwoodParams = { ...DEFAULT_PARAMS };
  private state = createAtwoodState(this.params);
  private prevState = createAtwoodState(this.params);
  private integrator = new RK4();
  private recorder: MeasurementRecorder | null = null;
  private initialEnergyTotal = 0;

  private pulley: THREE.Mesh | null = null;
  private mass1: THREE.Mesh | null = null;
  private mass2: THREE.Mesh | null = null;
  private string1: THREE.Line | null = null;
  private string2: THREE.Line | null = null;
  private string1Pts: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3()];
  private string2Pts: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3()];
  private stopped = false;

  setup(context: ExperimentRenderContext): void {
    this.recorder = context.recorder;
    this.recorder.registerChannel('displacement', 'm1 Displacement', 'm');
    this.recorder.registerChannel('velocity', 'Velocity', 'm/s');
    this.recorder.registerChannel('acceleration', 'Acceleration', 'm/s²');
    this.recorder.registerChannel('energy_kinetic', 'Kinetic Energy', 'J');
    this.recorder.registerChannel('energy_potential', 'Potential Energy', 'J');
    this.recorder.registerChannel('energy_total', 'Total Energy', 'J');

    const stand = createBox(context.renderKit, context.root, 0.15, 4.2, 0.15, 0x607d8b);
    stand.position.set(0, PULLEY_Y - 2.1, -0.4);

    this.pulley = createSphere(context.renderKit, context.root, PULLEY_RADIUS, 0x90a4ae);
    this.pulley.position.set(0, PULLEY_Y, 0);
    this.pulley.scale.set(1, 0.35, 1);

    this.mass1 = createBox(context.renderKit, context.root, 0.4, 0.4, 0.4, 0x4fc3f7);
    this.mass2 = createBox(context.renderKit, context.root, 0.4, 0.4, 0.4, 0xff7043);

    this.string1Pts = [new THREE.Vector3(), new THREE.Vector3()];
    this.string2Pts = [new THREE.Vector3(), new THREE.Vector3()];
    this.string1 = createLine(context.renderKit, context.root, this.string1Pts, 0xcfd8dc);
    this.string2 = createLine(context.renderKit, context.root, this.string2Pts, 0xcfd8dc);

    this.syncVisuals(this.state[0]);
  }

  update(dt: number): void {
    if (this.stopped) return;

    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];

    const a = theoreticalAtwoodAcceleration(this.params.mass1, this.params.mass2, this.params.gravity);
    this.integrator.step(this.state, (s, out) => atwoodDerivatives(s, this.params, out), dt);

    // Travel limits: freeze at last valid sample (avoid zeroing v, which spikes energy loss).
    const maxX = STRING_HALF - 0.35;
    const minX = -(STRING_HALF - 0.35);
    if (this.state[0] > maxX || this.state[0] < minX) {
      this.state[0] = this.prevState[0];
      this.state[1] = this.prevState[1];
      this.stopped = true;
      return;
    }

    const energy = computeAtwoodEnergy(this.state, this.params);
    this.recorder?.append(dt, {
      displacement: this.state[0],
      velocity: this.state[1],
      acceleration: a,
      energy_kinetic: energy.kinetic,
      energy_potential: energy.potential,
      energy_total: energy.total,
    });
  }

  render(alpha: number): void {
    const x = this.prevState[0] + (this.state[0] - this.prevState[0]) * alpha;
    this.syncVisuals(x);
  }

  reset(): void {
    this.state = createAtwoodState(this.params);
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];
    this.stopped = false;
    this.initialEnergyTotal = computeAtwoodEnergy(this.state, this.params).total;
    this.recorder?.clear();
    this.syncVisuals(this.state[0]);
  }

  dispose(): void {
    this.pulley = null;
    this.mass1 = null;
    this.mass2 = null;
    this.string1 = null;
    this.string2 = null;
    this.string1Pts = [];
    this.string2Pts = [];
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
      {
        key: 'mass1',
        label: 'Mass 1 (left)',
        type: 'slider',
        default: 2,
        min: 0.1,
        max: 10,
        step: 0.1,
        unit: 'kg',
        description: 'Left hanging mass. Larger than mass 2 → descends.',
      },
      {
        key: 'mass2',
        label: 'Mass 2 (right)',
        type: 'slider',
        default: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        unit: 'kg',
      },
      {
        key: 'gravity',
        label: 'Gravity',
        type: 'slider',
        default: 9.81,
        min: 1,
        max: 20,
        step: 0.01,
        unit: 'm/s²',
      },
      {
        key: 'initialDisplacement',
        label: 'Initial m1 Displacement',
        type: 'slider',
        default: 0,
        min: -1.5,
        max: 1.5,
        step: 0.05,
        unit: 'm',
        description: 'Downward offset of mass 1 from the symmetric string position.',
      },
    ];
  }

  setParameters(params: ParameterValues): void {
    this.params = {
      mass1: Number(params.mass1 ?? this.params.mass1),
      mass2: Number(params.mass2 ?? this.params.mass2),
      gravity: Number(params.gravity ?? this.params.gravity),
      initialDisplacement: Number(params.initialDisplacement ?? this.params.initialDisplacement),
    };
    this.reset();
  }

  private syncVisuals(x: number): void {
    if (!this.mass1 || !this.mass2) return;

    const y1 = PULLEY_Y - (STRING_HALF + x);
    const y2 = PULLEY_Y - (STRING_HALF - x);

    this.mass1.position.set(-MASS_SEP_X, y1, 0);
    this.mass2.position.set(MASS_SEP_X, y2, 0);

    // Scale boxes slightly with mass for visual feedback (no per-frame alloc).
    const s1 = 0.35 + 0.08 * Math.cbrt(this.params.mass1);
    const s2 = 0.35 + 0.08 * Math.cbrt(this.params.mass2);
    this.mass1.scale.setScalar(s1 / 0.4);
    this.mass2.scale.setScalar(s2 / 0.4);

    if (this.string1 && this.string1Pts.length === 2) {
      this.string1Pts[0].set(-PULLEY_RADIUS, PULLEY_Y, 0);
      this.string1Pts[1].set(-MASS_SEP_X, y1 + 0.2 * (s1 / 0.4), 0);
      updateLinePoints(this.string1, this.string1Pts);
    }
    if (this.string2 && this.string2Pts.length === 2) {
      this.string2Pts[0].set(PULLEY_RADIUS, PULLEY_Y, 0);
      this.string2Pts[1].set(MASS_SEP_X, y2 + 0.2 * (s2 / 0.4), 0);
      updateLinePoints(this.string2, this.string2Pts);
    }
  }

  private buildScalars(): ScalarMetric[] {
    const theoretical = theoreticalAtwoodAcceleration(
      this.params.mass1,
      this.params.mass2,
      this.params.gravity,
    );
    // Prefer finite-difference from velocity when enough samples exist.
    const snapshot = this.recorder?.getSnapshot();
    let accelMeasured = theoretical;
    if (snapshot && snapshot.count >= 2) {
      const vel = snapshot.channels.find((c) => c.id === 'velocity');
      if (vel) {
        const i = snapshot.count - 1;
        const i0 = Math.max(0, i - 1);
        const dt = snapshot.time[i] - snapshot.time[i0];
        if (dt > 1e-9) {
          accelMeasured = (vel.values[i] - vel.values[i0]) / dt;
        }
      }
    }

    const scalars: ScalarMetric[] = [
      {
        id: 'displacement',
        label: 'm1 Displacement',
        value: this.state[0],
        unit: 'm',
      },
      {
        id: 'acceleration',
        label: 'Acceleration',
        value: accelMeasured,
        unit: 'm/s²',
        theoretical,
        percentError: percentDifference(accelMeasured, theoretical),
      },
      {
        id: 'velocity',
        label: 'Velocity',
        value: this.state[1],
        unit: 'm/s',
      },
    ];

    const drift = energyDriftPercent(
      this.initialEnergyTotal,
      computeAtwoodEnergy(this.state, this.params).total,
    );
    if (drift !== null) {
      scalars.push({
        id: 'energy_drift',
        label: 'Energy Drift',
        value: drift,
        unit: '%',
      });
    }

    return scalars;
  }
}
