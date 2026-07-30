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
    const theoretical = theoreticalPendulumPeriod(
      params.length,
      params.gravity,
      params.initialAngle,
    );
    const dt = 1 / 600;
    const duration = theoretical * 4;
    const { time, angles, count } = simulatePendulum(params, dt, duration);

    const measured = measurePeriod(time, angles, count);
    expect(measured).not.toBeNull();
    expect(measured!).toBeCloseTo(theoretical, 0);
  });

  it('large-angle series exceeds small-angle period', () => {
    const length = 1;
    const gravity = 9.81;
    const small = theoreticalPendulumPeriod(length, gravity, 0.05);
    const large = theoreticalPendulumPeriod(length, gravity, Math.PI / 2);
    expect(large).toBeGreaterThan(small);

    // T ≈ T0 (1 + 0.5 sin²(θ/2)); θ=π/2 → sin(π/4)=√2/2 → factor 1.25
    const t0 = 2 * Math.PI * Math.sqrt(length / gravity);
    expect(large).toBeCloseTo(t0 * 1.25, 10);
  });

  it('large-angle theory tracks nonlinear simulation better than small-angle-only', () => {
    const params: PendulumParams = {
      length: 1,
      gravity: 9.81,
      damping: 0,
      initialAngle: Math.PI / 3,
    };
    const largeAngleTheory = theoreticalPendulumPeriod(
      params.length,
      params.gravity,
      params.initialAngle,
    );
    const smallAngleOnly = theoreticalPendulumPeriod(params.length, params.gravity, 0);
    const dt = 1 / 600;
    const { time, angles, count } = simulatePendulum(params, dt, largeAngleTheory * 5);
    const measured = measurePeriod(time, angles, count);
    expect(measured).not.toBeNull();

    const errLarge = Math.abs(measured! - largeAngleTheory) / largeAngleTheory;
    const errSmall = Math.abs(measured! - smallAngleOnly) / smallAngleOnly;
    expect(errLarge).toBeLessThan(errSmall);
  });
});
