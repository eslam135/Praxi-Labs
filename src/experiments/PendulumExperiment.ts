/**
 * Pendulum experiment — nonlinear damped pendulum with period measurement.
 *
 * Role: Glue layer wiring pendulum physics (RK4) to Three.js visuals.
 * Connections: Uses physics/equations/pendulum; registered in experiments/index.ts.
 * Extension: Copy this file as template for new oscillatory experiments.
 */
import * as THREE from 'three';
import type {
  Experiment,
  ExperimentContext,
  MeasurementSnapshot,
  ParameterSchema,
  ParameterValues,
  ScalarMetric,
} from '../core/types';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import { RK4 } from '../physics/integrators/RK4';
import {
  computePendulumEnergy,
  createPendulumState,
  pendulumDerivatives,
  theoreticalPendulumPeriod,
  type PendulumParams,
} from '../physics/equations/pendulum';
import { measurePeriod, percentDifference } from '../physics/analysis/period';
import { createRod, createSphere } from '../rendering/objects/primitives';

const DEFAULT_PARAMS: PendulumParams = {
  length: 2,
  gravity: 9.81,
  damping: 0.05,
  initialAngle: Math.PI / 4,
};

export class PendulumExperiment implements Experiment {
  private params: PendulumParams = { ...DEFAULT_PARAMS };
  private state = createPendulumState(this.params);
  private prevState = createPendulumState(this.params);
  private integrator = new RK4();
  private recorder: MeasurementRecorder | null = null;

  private pivot: THREE.Object3D | null = null;
  private rod: THREE.Mesh | null = null;
  private bob: THREE.Mesh | null = null;
  private baseRodLength = 2;

  setup(context: ExperimentContext): void {
    this.recorder = context.recorder;
    this.recorder.registerChannel('angle', 'Angle', 'rad');
    this.recorder.registerChannel('angular_velocity', 'Angular Velocity', 'rad/s');
    this.recorder.registerChannel('energy_kinetic', 'Kinetic Energy', 'J');
    this.recorder.registerChannel('energy_potential', 'Potential Energy', 'J');
    this.recorder.registerChannel('energy_total', 'Total Energy', 'J');

    this.pivot = new THREE.Object3D();
    this.pivot.position.set(0, 3, 0);
    context.renderKit.addToScene(context.root, this.pivot);

    this.rod = createRod(context.renderKit, context.root, this.params.length, 0.03, 0x8899aa, this.pivot);
    this.bob = createSphere(context.renderKit, context.root, 0.2, 0x4fc3f7, this.pivot, 0x4fc3f7);
    this.baseRodLength = this.params.length;
    this.bob.position.set(0, -this.params.length, 0);
  }

  update(dt: number): void {
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];

    const derivatives = (s: Float64Array, out: Float64Array) => {
      pendulumDerivatives(s, this.params, out);
    };
    this.integrator.step(this.state, derivatives, dt);

    const energy = computePendulumEnergy(this.state, this.params);
    this.recorder?.append(dt, {
      angle: this.state[0],
      angular_velocity: this.state[1],
      energy_kinetic: energy.kinetic,
      energy_potential: energy.potential,
      energy_total: energy.total,
    });
  }

  render(alpha: number): void {
    const theta = this.prevState[0] + (this.state[0] - this.prevState[0]) * alpha;
    this.syncVisuals(theta);
  }

  reset(): void {
    this.state = createPendulumState(this.params);
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];
    this.recorder?.clear();
    this.syncVisuals(this.state[0]);
  }

  dispose(): void {
    this.pivot = null;
    this.rod = null;
    this.bob = null;
  }

  getMeasurements(): MeasurementSnapshot {
    const snapshot = this.recorder?.getSnapshot() ?? {
      time: new Float64Array(0),
      channels: [],
      scalars: [],
      count: 0,
    };

    const scalars = this.buildScalars(snapshot);
    return { ...snapshot, scalars };
  }

  getParameterSchema(): ParameterSchema[] {
    return [
      { key: 'length', label: 'Length', type: 'slider', default: 2, min: 0.5, max: 5, step: 0.1, unit: 'm' },
      { key: 'gravity', label: 'Gravity', type: 'slider', default: 9.81, min: 1, max: 20, step: 0.01, unit: 'm/s²' },
      { key: 'initialAngle', label: 'Initial Angle', type: 'slider', default: Math.PI / 4, min: -Math.PI, max: Math.PI, step: 0.01, unit: 'rad', description: 'Starting angle from vertical. Uses full nonlinear sin(θ), not small-angle approximation.' },
      { key: 'damping', label: 'Damping', type: 'slider', default: 0.05, min: 0, max: 2, step: 0.01, unit: '1/s', description: 'Velocity damping coefficient. Higher values slow the swing faster.' },
    ];
  }

  setParameters(params: ParameterValues): void {
    this.params = {
      length: Number(params.length ?? this.params.length),
      gravity: Number(params.gravity ?? this.params.gravity),
      damping: Number(params.damping ?? this.params.damping),
      initialAngle: Number(params.initialAngle ?? this.params.initialAngle),
    };
    this.reset();
  }

  private syncVisuals(theta: number): void {
    if (!this.pivot || !this.bob || !this.rod) return;
    const length = this.params.length;

    this.pivot.rotation.z = theta;
    this.bob.position.set(0, -length, 0);
    this.rod.scale.y = length / this.baseRodLength;
    this.rod.position.set(0, -length / 2, 0);
  }

  private buildScalars(snapshot: MeasurementSnapshot): ScalarMetric[] {
    const angleChannel = snapshot.channels.find((c) => c.id === 'angle');
    const measuredPeriod =
      angleChannel && snapshot.count > 0
        ? measurePeriod(snapshot.time, angleChannel.values, snapshot.count)
        : null;
    const theoretical = theoreticalPendulumPeriod(this.params.length, this.params.gravity);

    const scalars: ScalarMetric[] = [
      {
        id: 'angle',
        label: 'Current Angle',
        value: this.state[0],
        unit: 'rad',
      },
    ];

    if (measuredPeriod !== null) {
      scalars.push({
        id: 'period',
        label: 'Period',
        value: measuredPeriod,
        unit: 's',
        theoretical,
        percentError: percentDifference(measuredPeriod, theoretical),
      });
    }

    return scalars;
  }
}
