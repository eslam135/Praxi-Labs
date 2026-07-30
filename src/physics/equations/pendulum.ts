/**
 * Pendulum equations of motion — pure physics (no Three.js).
 *
 * Role: θ'' = -(g/L)·sin(θ) - c·θ' (full nonlinear pendulum with damping).
 * Connections: Used by PendulumExperiment via RK4 integrator.
 * Extension: State layout is [θ, ω].
 */
import type { EnergyBreakdown } from '../../core/types';

export interface PendulumParams {
  length: number;
  gravity: number;
  damping: number;
  initialAngle: number;
}

export function createPendulumState(params: PendulumParams): Float64Array {
  return new Float64Array([params.initialAngle, 0]);
}

export function pendulumDerivatives(
  state: Float64Array,
  params: PendulumParams,
  out: Float64Array,
): void {
  const theta = state[0];
  const omega = state[1];
  const { length, gravity, damping } = params;

  out[0] = omega;
  out[1] = -(gravity / length) * Math.sin(theta) - damping * omega;
}

export function computePendulumEnergy(state: Float64Array, params: PendulumParams): EnergyBreakdown {
  const theta = state[0];
  const omega = state[1];
  const { length, gravity } = params;
  const mass = 1;

  const kinetic = 0.5 * mass * (length * omega) ** 2;
  const potential = mass * gravity * length * (1 - Math.cos(theta));
  return { kinetic, potential, total: kinetic + potential };
}

/**
 * Small-angle period T₀ = 2π√(L/g).
 * Large-angle correction (first elliptic series term):
 *   T ≈ T₀ · (1 + (1/2) sin²(θ₀/2))
 * Truncation: higher-order terms (k⁴, …) omitted; accurate for moderate amplitudes.
 */
export function theoreticalPendulumPeriod(
  length: number,
  gravity: number,
  initialAngle = 0,
): number {
  const t0 = 2 * Math.PI * Math.sqrt(length / gravity);
  const k = Math.sin(Math.abs(initialAngle) / 2);
  return t0 * (1 + 0.5 * k * k);
}
