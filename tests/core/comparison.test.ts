import { describe, expect, it } from 'vitest';
import { mergeComparisonSnapshots } from '../../src/core/mergeComparisonSnapshots';
import { COMPARISON_B_SUFFIX, type MeasurementSnapshot } from '../../src/core/types';
import { RK4 } from '../../src/physics/integrators/RK4';
import {
  createPendulumState,
  pendulumDerivatives,
  type PendulumParams,
} from '../../src/physics/equations/pendulum';

function makeSnapshot(
  id: string,
  values: number[],
  label = id,
): MeasurementSnapshot {
  const count = values.length;
  const time = new Float64Array(count);
  const channelValues = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    time[i] = i * 0.01;
    channelValues[i] = values[i];
  }
  return {
    time,
    channels: [{ id, label, unit: 'rad', values: channelValues }],
    scalars: [],
    count,
  };
}

describe('comparison merge', () => {
  it('suffixes B channel ids for graph overlay', () => {
    const a = makeSnapshot('angle', [0.1, 0.2, 0.3]);
    const b = makeSnapshot('angle', [0.4, 0.5, 0.6]);
    const merged = mergeComparisonSnapshots(a, b);

    expect(merged.comparisonActive).toBe(true);
    expect(merged.channels).toHaveLength(2);
    expect(merged.channels[0].id).toBe('angle');
    expect(merged.channels[1].id).toBe(`angle${COMPARISON_B_SUFFIX}`);
    expect(merged.channels[1].label).toContain('(B)');
    expect(merged.primaryCount).toBe(3);
    expect(merged.secondaryCount).toBe(3);
  });

  it('uses the longer series for time axis when B outlasts A', () => {
    const a = makeSnapshot('angle', [0.1, 0.2]);
    const b = makeSnapshot('angle', [0.4, 0.5, 0.6, 0.7]);
    const merged = mergeComparisonSnapshots(a, b);

    expect(merged.count).toBe(4);
    expect(merged.primaryCount).toBe(2);
    expect(merged.secondaryCount).toBe(4);
    expect(merged.time).toBe(b.time);
  });
});

describe('comparison physics divergence', () => {
  it('different pendulum lengths produce different angles after equal steps', () => {
    const dt = 1 / 120;
    const steps = 240;
    const integratorA = new RK4();
    const integratorB = new RK4();

    const paramsA: PendulumParams = {
      length: 1,
      gravity: 9.81,
      damping: 0,
      initialAngle: Math.PI / 4,
    };
    const paramsB: PendulumParams = {
      ...paramsA,
      length: 2,
    };

    const stateA = createPendulumState(paramsA);
    const stateB = createPendulumState(paramsB);

    for (let i = 0; i < steps; i++) {
      integratorA.step(stateA, (s, out) => pendulumDerivatives(s, paramsA, out), dt);
      integratorB.step(stateB, (s, out) => pendulumDerivatives(s, paramsB, out), dt);
    }

    expect(stateA[0]).not.toBeCloseTo(stateB[0], 2);
  });
});
