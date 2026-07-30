/**
 * Integrator interface — contract for numerical integration strategies.
 *
 * Role: Defines the step() signature used by all physics equation modules.
 * Connections: Implemented by SemiImplicitEuler and RK4.
 * Extension: Add new integrators here; document choice in README.
 * ExplicitEuler exists only to demonstrate energy blow-up vs RK4 via Compare A/B.
 */
export type { DerivativeFunction, Integrator } from '../../core/types';
