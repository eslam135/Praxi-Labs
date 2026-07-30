/**
 * Theoretical physics formulas — shared reference calculations.
 *
 * Role: Centralizes analytic formulas for measured-vs-theoretical comparisons.
 * Connections: Used by experiments when building scalar metrics.
 * Extension: Add formulas here; never duplicate in experiment UI code.
 */
export { theoreticalAtwoodAcceleration, theoreticalAtwoodPosition } from '../equations/atwood';
export { theoreticalPendulumPeriod } from '../equations/pendulum';
export { theoreticalProjectileRange } from '../equations/projectile';
export { theoreticalSpringFrequency } from '../equations/spring';
