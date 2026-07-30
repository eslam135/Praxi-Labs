import { describe, expect, it } from 'vitest';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  computeSpringEnergy,
  createSpringState,
  springDerivatives,
  type SpringParams,
} from '../../src/physics/equations/spring';

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
    const drift = Math.abs(finalEnergy - initialEnergy) / initialEnergy;
    expect(drift).toBeLessThan(0.01);
  });
});
