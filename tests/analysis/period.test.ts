import { describe, expect, it } from 'vitest';
import { measurePeriod, measureFrequency, percentDifference } from '../../src/physics/analysis/period';

describe('period analysis', () => {
  it('detects period from synthetic sine wave', () => {
    const period = 2;
    const count = 500;
    const time = new Float64Array(count);
    const values = new Float64Array(count);
    const dt = 0.01;

    for (let i = 0; i < count; i++) {
      time[i] = i * dt;
      values[i] = Math.sin((2 * Math.PI * time[i]) / period);
    }

    const measured = measurePeriod(time, values, count);
    expect(measured).not.toBeNull();
    expect(measured!).toBeCloseTo(period, 0);
  });

  it('computes frequency from period', () => {
    const period = 2;
    const count = 500;
    const time = new Float64Array(count);
    const values = new Float64Array(count);
    const dt = 0.01;

    for (let i = 0; i < count; i++) {
      time[i] = i * dt;
      values[i] = Math.sin((2 * Math.PI * time[i]) / period);
    }

    const freq = measureFrequency(time, values, count);
    expect(freq).not.toBeNull();
    expect(freq!).toBeCloseTo(0.5, 1);
  });

  it('computes percent difference', () => {
    expect(percentDifference(110, 100)).toBeCloseTo(10);
    expect(percentDifference(90, 100)).toBeCloseTo(10);
  });
});
