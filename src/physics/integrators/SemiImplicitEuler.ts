/**
 * Semi-implicit (symplectic) Euler integrator.
 *
 * Role: First-order integrator suitable for non-oscillatory systems (e.g. projectile).
 * Connections: Used by projectile motion; state layout: [x, y, vx, vy].
 * Extension: Prefer RK4 for oscillators; never use plain explicit Euler for those.
 */
import type { DerivativeFunction } from '../../core/types';

let scratch: Float64Array | null = null;

export class SemiImplicitEuler {
  step(state: Float64Array, derivatives: DerivativeFunction, dt: number): void {
    if (!scratch || scratch.length < state.length) {
      scratch = new Float64Array(state.length);
    }

    derivatives(state, scratch);
    const half = state.length / 2;

    for (let i = 0; i < half; i++) {
      state[half + i] += scratch[half + i] * dt;
    }
    for (let i = 0; i < half; i++) {
      state[i] += state[half + i] * dt;
    }
  }
}
