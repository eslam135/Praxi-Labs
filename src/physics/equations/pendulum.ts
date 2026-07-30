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

export function theoreticalPendulumPeriod(length: number, gravity: number): number {
  return 2 * Math.PI * Math.sqrt(length / gravity);
}
