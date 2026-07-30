import { describe, expect, it } from 'vitest';
import { energyDriftPercent } from '../../src/physics/analysis/energy';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  computeSpringEnergy,
  createSpringState,
  springDerivatives,
  type SpringParams,
} from '../../src/physics/equations/spring';

describe('energyDriftPercent', () => {
  it('returns percent |E-E0|/|E0|', () => {
    expect(energyDriftPercent(100, 101)).toBeCloseTo(1, 10);
    expect(energyDriftPercent(-50, -55)).toBeCloseTo(10, 10);
  });

  it('returns null when |E0| is near zero', () => {
    expect(energyDriftPercent(0, 1)).toBeNull();
    expect(energyDriftPercent(1e-13, 1)).toBeNull();
  });
});

describe('energy conservation', () => {
  it('RK4 spring oscillator conserves energy with no damping', () => {
    const params: SpringParams = {
      springConstant: 10,
      mass: 1,
      damping: 0,
      initialDisplacement: 1,
    };
    const integrator = new RK4();
    const state = createSpringState(params);
    const dt = 0.001;
    const initialEnergy = computeSpringEnergy(state, params).total;

    for (let i = 0; i < 5000; i++) {
      integrator.step(state, (s, out) => springDerivatives(s, params, out), dt);
    }

    const finalEnergy = computeSpringEnergy(state, params).total;
    const drift = energyDriftPercent(initialEnergy, finalEnergy);
    expect(drift).not.toBeNull();
    expect(drift!).toBeLessThan(1);
  });
});
