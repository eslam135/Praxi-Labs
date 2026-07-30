/**
 * Classical 4th-order Runge-Kutta (RK4) integrator.
 *
 * Role: High-accuracy integrator for oscillatory/nonlinear systems (pendulum, spring).
 * Connections: State is [position..., velocity...]; derivatives returns same layout.
 * Extension: Default choice for oscillators to avoid energy drift of explicit Euler.
 */
import type { DerivativeFunction } from '../../core/types';

let k1: Float64Array | null = null;
let k2: Float64Array | null = null;
let k3: Float64Array | null = null;
let k4: Float64Array | null = null;
let temp: Float64Array | null = null;

function ensureBuffers(n: number): void {
  if (!k1 || k1.length !== n) {
    k1 = new Float64Array(n);
    k2 = new Float64Array(n);
    k3 = new Float64Array(n);
    k4 = new Float64Array(n);
    temp = new Float64Array(n);
  }
}

export class RK4 {
  step(state: Float64Array, derivatives: DerivativeFunction, dt: number): void {
    const n = state.length;
    ensureBuffers(n);

    derivatives(state, k1!);

    for (let i = 0; i < n; i++) temp![i] = state[i] + 0.5 * dt * k1![i];
    derivatives(temp!, k2!);

    for (let i = 0; i < n; i++) temp![i] = state[i] + 0.5 * dt * k2![i];
    derivatives(temp!, k3!);

    for (let i = 0; i < n; i++) temp![i] = state[i] + dt * k3![i];
    derivatives(temp!, k4!);

    for (let i = 0; i < n; i++) {
      state[i] += (dt / 6) * (k1![i] + 2 * k2![i] + 2 * k3![i] + k4![i]);
    }
  }
}
