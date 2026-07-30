/**
 * Explicit (forward) Euler integrator — intentionally unstable for oscillators.
 *
 * Role: Pedagogical contrast against RK4; systematically gains energy on SHOs.
 * Connections: Selected by Pendulum/Spring when useExplicitEuler is true.
 * Extension: Prefer RK4 or SemiImplicitEuler for production physics; never default this for oscillators.
 */
import type { DerivativeFunction } from '../../core/types';

let scratch: Float64Array | null = null;

export class ExplicitEuler {
  step(state: Float64Array, derivatives: DerivativeFunction, dt: number): void {
    if (!scratch || scratch.length < state.length) {
      scratch = new Float64Array(state.length);
    }

    derivatives(state, scratch);
    for (let i = 0; i < state.length; i++) {
      state[i] += scratch[i] * dt;
    }
  }
}
