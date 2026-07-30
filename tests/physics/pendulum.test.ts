import { describe, expect, it } from 'vitest';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  createPendulumState,
  pendulumDerivatives,
  theoreticalPendulumPeriod,
  type PendulumParams,
} from '../../src/physics/equations/pendulum';
import { measurePeriod } from '../../src/physics/analysis/period';

function simulatePendulum(params: PendulumParams, dt: number, duration: number): {
  time: Float64Array;
  angles: Float64Array;
  count: number;
} {
  const integrator = new RK4();
  const state = createPendulumState(params);
  const steps = Math.floor(duration / dt);
  const time = new Float64Array(steps);
  const angles = new Float64Array(steps);

  for (let i = 0; i < steps; i++) {
    integrator.step(state, (s, out) => pendulumDerivatives(s, params, out), dt);
    time[i] = i * dt;
    angles[i] = state[0];
  }
  return { time, angles, count: steps };
}

describe('pendulum physics', () => {
  it('theoretical period matches small-angle simulation', () => {
    const params: PendulumParams = {
      length: 1,
      gravity: 9.81,
      damping: 0,
      initialAngle: 0.1,
    };
    const theoretical = theoreticalPendulumPeriod(params.length, params.gravity);
    const dt = 1 / 600;
    const duration = theoretical * 4;
    const { time, angles, count } = simulatePendulum(params, dt, duration);

    const measured = measurePeriod(time, angles, count);
    expect(measured).not.toBeNull();
    expect(measured!).toBeCloseTo(theoretical, 0);
  });
});
