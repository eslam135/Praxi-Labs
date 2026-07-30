/**
 * Spring-mass experiment — damped harmonic oscillator with frequency measurement.
 *
 * Role: Glue layer wiring spring physics (RK4) to spring mesh visualization.
 * Connections: Uses physics/equations/spring; registered in experiments/index.ts.
 * Extension: Copy for other 1D oscillator experiments.
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
import { RK4 } from '../physics/integrators/RK4';
import { ExplicitEuler } from '../physics/integrators/ExplicitEuler';
import type { Integrator } from '../physics/integrators/Integrator';
import {
  computeSpringEnergy,
  createSpringState,
  springDerivatives,
  theoreticalSpringFrequency,
  type SpringParams,
} from '../physics/equations/spring';
import { measureFrequency, percentDifference } from '../physics/analysis/period';
import {
  createBox,
  createSpring,
  springPointCount,
  updateSpringPoints,
} from '../rendering/objects/primitives';

const DEFAULT_PARAMS: SpringParams = {
  springConstant: 10,
  mass: 1,
  damping: 0.1,
  initialDisplacement: 1,
};

const SPRING_REST_LENGTH = 2;
const SPRING_COILS = 8;
const SPRING_RADIUS = 0.15;

export class SpringExperiment implements Experiment<ExperimentRenderContext> {
  private params: SpringParams = { ...DEFAULT_PARAMS };
  private useExplicitEuler = false;
  private state = createSpringState(this.params);
  private prevState = createSpringState(this.params);
  private rk4 = new RK4();
  private euler = new ExplicitEuler();
  private recorder: MeasurementRecorder | null = null;

  private anchor: THREE.Object3D | null = null;
  private springLine: THREE.Line | null = null;
  private massBlock: THREE.Mesh | null = null;
  private renderKit: RenderKit | null = null;
  private root: THREE.Group | null = null;
  private springPoints: THREE.Vector3[] = [];

  private get integrator(): Integrator {
    return this.useExplicitEuler ? this.euler : this.rk4;
  }

  setup(context: ExperimentRenderContext): void {
    this.recorder = context.recorder;
    this.renderKit = context.renderKit;
    this.root = context.root;

    this.recorder.registerChannel('displacement', 'Displacement', 'm');
    this.recorder.registerChannel('velocity', 'Velocity', 'm/s');
    this.recorder.registerChannel('energy_kinetic', 'Kinetic Energy', 'J');
    this.recorder.registerChannel('energy_potential', 'Potential Energy', 'J');
    this.recorder.registerChannel('energy_total', 'Total Energy', 'J');

    this.anchor = new THREE.Object3D();
    this.anchor.position.set(0, 4, 0);
    context.renderKit.addToScene(context.root, this.anchor);

    this.massBlock = createBox(context.renderKit, context.root, 0.5, 0.5, 0.5, 0xab47bc);
    this.buildSpring(context);
    this.syncVisuals(this.state[0]);
  }

  update(dt: number): void {
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];

    const derivatives = (s: Float64Array, out: Float64Array) => {
      springDerivatives(s, this.params, out);
    };
    this.integrator.step(this.state, derivatives, dt);

    const energy = computeSpringEnergy(this.state, this.params);
    this.recorder?.append(dt, {
      displacement: this.state[0],
      velocity: this.state[1],
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
    this.state = createSpringState(this.params);
    this.prevState[0] = this.state[0];
    this.prevState[1] = this.state[1];
    this.recorder?.clear();
    this.syncVisuals(this.state[0]);
  }

  dispose(): void {
    this.anchor = null;
    this.springLine = null;
    this.massBlock = null;
    this.renderKit = null;
    this.root = null;
    this.springPoints = [];
  }

  getMeasurements(): MeasurementSnapshot {
    const snapshot = this.recorder?.getSnapshot() ?? {
      time: new Float64Array(0),
      channels: [],
      scalars: [],
      count: 0,
    };
    return { ...snapshot, scalars: this.buildScalars(snapshot) };
  }

  getParameterSchema(): ParameterSchema[] {
    return [
      { key: 'springConstant', label: 'Spring Constant', type: 'slider', default: 10, min: 1, max: 50, step: 0.5, unit: 'N/m', description: 'Stiffness of the spring. Higher k = faster oscillation.' },
      { key: 'mass', label: 'Mass', type: 'slider', default: 1, min: 0.1, max: 5, step: 0.1, unit: 'kg' },
      { key: 'damping', label: 'Damping', type: 'slider', default: 0.1, min: 0, max: 2, step: 0.01, unit: 'N·s/m', description: 'Damping force proportional to velocity. Reduces measured frequency vs theory.' },
      { key: 'initialDisplacement', label: 'Initial Displacement', type: 'slider', default: 1, min: -2, max: 2, step: 0.05, unit: 'm', description: 'Starting position from equilibrium. Negative = compressed.' },
      {
        key: 'useExplicitEuler',
        label: 'Use explicit Euler',
        type: 'toggle',
        default: false,
        description:
          'Pedagogical: unstable for oscillators (energy grows). Compare A/B — Set A off, Set B on — to watch energy_total diverge.',
      },
    ];
  }

  setParameters(params: ParameterValues): void {
    this.params = {
      springConstant: Number(params.springConstant ?? this.params.springConstant),
      mass: Number(params.mass ?? this.params.mass),
      damping: Number(params.damping ?? this.params.damping),
      initialDisplacement: Number(params.initialDisplacement ?? this.params.initialDisplacement),
    };
    this.useExplicitEuler = Boolean(params.useExplicitEuler ?? this.useExplicitEuler);
    this.reset();
  }

  private syncVisuals(displacement: number): void {
    if (!this.massBlock || !this.anchor) return;
    const y = this.anchor.position.y - SPRING_REST_LENGTH - displacement;
    this.massBlock.position.set(0, y, 0);

    if (this.springLine && this.springPoints.length > 0) {
      const length = Math.max(SPRING_REST_LENGTH + displacement, 0.3);
      updateSpringPoints(this.springLine, this.springPoints, length, SPRING_COILS, SPRING_RADIUS);
    }
  }

  private buildSpring(context: ExperimentRenderContext): void {
    this.renderKit = context.renderKit;
    this.root = context.root;

    if (this.springLine?.parent) {
      this.springLine.parent.remove(this.springLine);
    }

    const length = Math.max(SPRING_REST_LENGTH + this.state[0], 0.3);
    const count = springPointCount(SPRING_COILS);
    this.springPoints = new Array(count);
    for (let i = 0; i < count; i++) {
      this.springPoints[i] = new THREE.Vector3();
    }

    this.springLine = createSpring(
      this.renderKit,
      this.root,
      length,
      SPRING_COILS,
      SPRING_RADIUS,
      0x78909c,
    );
    if (this.anchor) {
      this.springLine.position.copy(this.anchor.position);
    }
  }

  private buildScalars(snapshot: MeasurementSnapshot): ScalarMetric[] {
    const dispChannel = snapshot.channels.find((c) => c.id === 'displacement');
    const measuredFreq =
      dispChannel && snapshot.count > 0
        ? measureFrequency(snapshot.time, dispChannel.values, snapshot.count)
        : null;
    const theoretical = theoreticalSpringFrequency(this.params.springConstant, this.params.mass);

    const scalars: ScalarMetric[] = [
      {
        id: 'displacement',
        label: 'Current Displacement',
        value: this.state[0],
        unit: 'm',
      },
    ];

    if (measuredFreq !== null) {
      scalars.push({
        id: 'frequency',
        label: 'Frequency',
        value: measuredFreq,
        unit: 'Hz',
        theoretical,
        percentError: percentDifference(measuredFreq, theoretical),
      });
    }

    return scalars;
  }
}
