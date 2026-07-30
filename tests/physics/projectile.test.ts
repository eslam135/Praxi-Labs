import { describe, expect, it } from 'vitest';
import {
  theoreticalProjectileRange,
  analyticTrajectoryPoints,
  type ProjectileParams,
} from '../../src/physics/equations/projectile';

describe('projectile physics', () => {
  const params: ProjectileParams = {
    launchAngle: 45,
    initialSpeed: 10,
    gravity: 9.81,
    dragCoefficient: 0,
  };

  it('computes correct no-drag range', () => {
    const range = theoreticalProjectileRange(45, 10, 9.81);
    expect(range).toBeCloseTo(10.19, 1);
  });

  it('analytic trajectory ends at ground level', () => {
    const points = analyticTrajectoryPoints(params);
    const last = points[points.length - 1];
    expect(last.y).toBeCloseTo(0, 1);
    expect(last.x).toBeCloseTo(theoreticalProjectileRange(45, 10, 9.81), 1);
  });
});
