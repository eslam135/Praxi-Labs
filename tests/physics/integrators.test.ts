import { describe, expect, it } from 'vitest';
import { ExplicitEuler } from '../../src/physics/integrators/ExplicitEuler';
import { RK4 } from '../../src/physics/integrators/RK4';
import { SemiImplicitEuler } from '../../src/physics/integrators/SemiImplicitEuler';

/** Simple harmonic oscillator: x'' = -x, state = [x, v] */
function harmonicDerivatives(state: Float64Array, out: Float64Array): void {
  out[0] = state[1];
  out[1] = -state[0];
}

function energy(state: Float64Array): number {
  return 0.5 * (state[0] ** 2 + state[1] ** 2);
}

function simulate(
  integrator: { step: (s: Float64Array, d: typeof harmonicDerivatives, dt: number) => void },
  dt: number,
  steps: number,
): Float64Array {
  const state = new Float64Array([1, 0]);
  for (let i = 0; i < steps; i++) {
    integrator.step(state, harmonicDerivatives, dt);
  }
  return state;
}

describe('RK4 integrator', () => {
  it('conserves energy approximately for harmonic oscillator', () => {
    const dt = 0.001;
    const steps = 10000;
    const state = simulate(new RK4(), dt, steps);
    const e = state[0] ** 2 + state[1] ** 2;
    expect(e).toBeCloseTo(1, 1);
  });
});

describe('SemiImplicitEuler integrator', () => {
  it('completes integration without NaN', () => {
    const state = simulate(new SemiImplicitEuler(), 0.01, 100);
    expect(Number.isFinite(state[0])).toBe(true);
    expect(Number.isFinite(state[1])).toBe(true);
  });
});

describe('ExplicitEuler integrator', () => {
  it('gains energy on undamped harmonic oscillator while RK4 stays bounded', () => {
    const dt = 0.05;
    const steps = 800;
    const e0 = 0.5;
    const eulerState = simulate(new ExplicitEuler(), dt, steps);
    const rk4State = simulate(new RK4(), dt, steps);

    expect(energy(eulerState)).toBeGreaterThan(e0 * 1.5);
    expect(energy(rk4State)).toBeLessThan(e0 * 1.05);
  });
});
