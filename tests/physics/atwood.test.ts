import { describe, expect, it } from 'vitest';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  atwoodDerivatives,
  computeAtwoodEnergy,
  createAtwoodState,
  theoreticalAtwoodAcceleration,
  theoreticalAtwoodPosition,
  type AtwoodParams,
} from '../../src/physics/equations/atwood';

describe('atwood physics', () => {
  it('theoretical acceleration matches (m1-m2)g/(m1+m2)', () => {
    expect(theoreticalAtwoodAcceleration(3, 1, 10)).toBeCloseTo(5, 10);
    expect(theoreticalAtwoodAcceleration(1, 1, 9.81)).toBeCloseTo(0, 10);
    expect(theoreticalAtwoodAcceleration(1, 3, 10)).toBeCloseTo(-5, 10);
  });

  it('simulated position matches analytic constant-a motion', () => {
    const params: AtwoodParams = {
      mass1: 3,
      mass2: 1,
      gravity: 10,
      initialDisplacement: 0,
    };
    const a = theoreticalAtwoodAcceleration(params.mass1, params.mass2, params.gravity);
    const integrator = new RK4();
    const state = createAtwoodState(params);
    const dt = 1 / 600;
    const duration = 0.5;
    const steps = Math.floor(duration / dt);

    for (let i = 0; i < steps; i++) {
      integrator.step(state, (s, out) => atwoodDerivatives(s, params, out), dt);
    }

    const expected = theoreticalAtwoodPosition(0, a, steps * dt);
    expect(state[0]).toBeCloseTo(expected, 5);
    expect(state[1]).toBeCloseTo(a * steps * dt, 5);
  });

  it('conserves total energy for ideal Atwood (no friction)', () => {
    const params: AtwoodParams = {
      mass1: 2.5,
      mass2: 1.5,
      gravity: 9.81,
      initialDisplacement: 0.2,
    };
    const integrator = new RK4();
    const state = createAtwoodState(params);
    const e0 = computeAtwoodEnergy(state, params).total;
    const dt = 1 / 240;

    for (let i = 0; i < 120; i++) {
      integrator.step(state, (s, out) => atwoodDerivatives(s, params, out), dt);
    }

    const e1 = computeAtwoodEnergy(state, params).total;
    expect(Math.abs(e1 - e0)).toBeLessThan(1e-6);
  });
});
