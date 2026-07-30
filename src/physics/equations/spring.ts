/**
 * Spring-mass oscillator equations — pure physics (no Three.js).
 *
 * Role: x'' = -(k/m)·x - (c/m)·x' (damped harmonic oscillator).
 * Connections: Used by SpringExperiment via RK4 integrator.
 * Extension: State layout is [x, v].
 */
import type { EnergyBreakdown } from '../../core/types';

export interface SpringParams {
  springConstant: number;
  mass: number;
  damping: number;
  initialDisplacement: number;
}

export function createSpringState(params: SpringParams): Float64Array {
  return new Float64Array([params.initialDisplacement, 0]);
}

export function springDerivatives(
  state: Float64Array,
  params: SpringParams,
  out: Float64Array,
): void {
  const x = state[0];
  const v = state[1];
  const { springConstant, mass, damping } = params;

  out[0] = v;
  out[1] = -(springConstant / mass) * x - (damping / mass) * v;
}

export function computeSpringEnergy(state: Float64Array, params: SpringParams): EnergyBreakdown {
  const x = state[0];
  const v = state[1];
  const { springConstant, mass } = params;

  const kinetic = 0.5 * mass * v * v;
  const potential = 0.5 * springConstant * x * x;
  return { kinetic, potential, total: kinetic + potential };
}

export function theoreticalSpringFrequency(springConstant: number, mass: number): number {
  return Math.sqrt(springConstant / mass) / (2 * Math.PI);
}
