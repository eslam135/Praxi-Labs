/**
 * Energy analysis helpers — kinetic/potential/total breakdown utilities.
 *
 * Role: Re-exports per-system energy functions and shared drift metrics for tests/experiments.
 * Connections: Experiments call equation-specific computeEnergy functions; scalars use energyDriftPercent.
 * Extension: Add new system energy functions in physics/equations/.
 */
export { computeAtwoodEnergy } from '../equations/atwood';
export { computePendulumEnergy } from '../equations/pendulum';
export { computeProjectileEnergy } from '../equations/projectile';
export { computeSpringEnergy } from '../equations/spring';

/**
 * Percent drift of total energy from a reference E0.
 * Returns null when |E0| is ~0 so callers can omit the scalar.
 */
export function energyDriftPercent(e0: number, e: number): number | null {
  if (!Number.isFinite(e0) || !Number.isFinite(e)) return null;
  if (Math.abs(e0) < 1e-12) return null;
  return (Math.abs(e - e0) / Math.abs(e0)) * 100;
}
