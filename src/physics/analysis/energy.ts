/**
 * Energy analysis helpers — kinetic/potential/total breakdown utilities.
 *
 * Role: Re-exports per-system energy functions for tests and experiments.
 * Connections: Experiments call equation-specific computeEnergy functions.
 * Extension: Add new system energy functions in physics/equations/.
 */
export { computeAtwoodEnergy } from '../equations/atwood';
export { computePendulumEnergy } from '../equations/pendulum';
export { computeProjectileEnergy } from '../equations/projectile';
export { computeSpringEnergy } from '../equations/spring';
