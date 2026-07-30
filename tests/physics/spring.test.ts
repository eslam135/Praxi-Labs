import { describe, expect, it } from 'vitest';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  createSpringState,
  springDerivatives,
  springOscillationRegime,
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
    const theoreticalFreq = theoreticalSpringFrequency(
      params.springConstant,
      params.mass,
      params.damping,
    );
    expect(theoreticalFreq).not.toBeNull();
    const period = 1 / theoreticalFreq!;
    const dt = 1 / 600;
    const samples = simulateSpring(params, dt, period * 3);

    let peaks = 0;
    for (let i = 1; i < samples.length - 1; i++) {
      if (samples[i] > samples[i - 1] && samples[i] > samples[i + 1]) peaks++;
    }

    const measuredPeriod = (period * 3) / (peaks || 1);
    const measuredFreq = 1 / measuredPeriod;
    expect(measuredFreq).toBeCloseTo(theoreticalFreq!, 0);
  });

  it('underdamped frequency is below undamped natural frequency', () => {
    const k = 16;
    const m = 1;
    const c = 1;
    const undamped = theoreticalSpringFrequency(k, m, 0)!;
    const damped = theoreticalSpringFrequency(k, m, c)!;
    expect(springOscillationRegime(k, m, c)).toBe('underdamped');
    expect(damped).toBeLessThan(undamped);

    // ωd = √(ω0² − γ²), γ = c/(2m) = 0.5, ω0 = 4 → ωd = √(16-0.25)=√15.75
    expect(damped).toBeCloseTo(Math.sqrt(15.75) / (2 * Math.PI), 10);
  });

  it('returns null for overdamped springs', () => {
    expect(theoreticalSpringFrequency(1, 1, 5)).toBeNull();
    expect(springOscillationRegime(1, 1, 5)).toBe('overdamped');
  });
});
