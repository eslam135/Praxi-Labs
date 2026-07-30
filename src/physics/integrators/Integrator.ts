/**
 * Integrator interface — contract for numerical integration strategies.
 *
 * Role: Defines the step() signature used by all physics equation modules.
 * Connections: Implemented by SemiImplicitEuler and RK4.
 * Extension: Add new integrators here; document choice in README.
 */
export type { DerivativeFunction, Integrator } from '../../core/types';
