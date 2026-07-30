import { describe, expect, it } from 'vitest';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  createSpringState,
  springDerivatives,
  theoreticalSpringFrequency,
  type SpringParams,
} from '../../src/physics/equations/spring';

function simulateSpring(params: SpringParams, dt: number, duration: number): number[] {
  const integrator = new RK4();
  const state = createSpringState(params);
  const steps = Math.floor(duration / dt);
  const displacements: number[] = [];

  for (let i = 0; i < steps; i++) {
    integrator.step(state, (s, out) => springDerivatives(s, params, out), dt);
    if (i % 5 === 0) displacements.push(state[0]);
  }
  return displacements;
}

describe('spring physics', () => {
  it('theoretical frequency matches undamped simulation', () => {
    const params: SpringParams = {
      springConstant: 16,
      mass: 1,
      damping: 0,
      initialDisplacement: 1,
    };
    const theoreticalFreq = theoreticalSpringFrequency(params.springConstant, params.mass);
    const period = 1 / theoreticalFreq;
    const dt = 1 / 600;
    const samples = simulateSpring(params, dt, period * 3);

    let peaks = 0;
    for (let i = 1; i < samples.length - 1; i++) {
      if (samples[i] > samples[i - 1] && samples[i] > samples[i + 1]) peaks++;
    }

    const measuredPeriod = (period * 3) / (peaks || 1);
    const measuredFreq = 1 / measuredPeriod;
    expect(measuredFreq).toBeCloseTo(theoreticalFreq, 0);
  });
});
