import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../../src/core/SimulationLoop';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  createPendulumState,
  pendulumDerivatives,
  type PendulumParams,
} from '../../src/physics/equations/pendulum';

function runSimulation(stepsPerSecond: number, totalSteps: number): number {
  const params: PendulumParams = {
    length: 1,
    gravity: 9.81,
    damping: 0,
    initialAngle: 0.5,
  };
  const integrator = new RK4();
  const state = createPendulumState(params);
  const dt = 1 / stepsPerSecond;

  for (let i = 0; i < totalSteps; i++) {
    integrator.step(state, (s, out) => pendulumDerivatives(s, params, out), dt);
  }
  return state[0];
}

describe('frame-rate independence', () => {
  it('produces same result regardless of step rate for same simulated time', () => {
    const simTime = 2;
    const result120 = runSimulation(120, Math.round(simTime * 120));
    const result240 = runSimulation(240, Math.round(simTime * 240));
    const resultFixed = runSimulation(1 / FIXED_DT, Math.round(simTime / FIXED_DT));

    expect(result120).toBeCloseTo(resultFixed, 2);
    expect(result240).toBeCloseTo(resultFixed, 2);
  });
});
