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

export type SpringOscillationRegime = 'undamped' | 'underdamped' | 'critical' | 'overdamped';

/** Natural (undamped) angular frequency ω₀ = √(k/m). */
export function springNaturalOmega(springConstant: number, mass: number): number {
  return Math.sqrt(springConstant / mass);
}

/** Damping ratio parameter γ = c/(2m) in x'' + 2γ x' + ω₀² x = 0. */
export function springDampingGamma(damping: number, mass: number): number {
  return damping / (2 * mass);
}

export function springOscillationRegime(
  springConstant: number,
  mass: number,
  damping: number,
): SpringOscillationRegime {
  const omega0 = springNaturalOmega(springConstant, mass);
  const gamma = springDampingGamma(damping, mass);
  const disc = omega0 * omega0 - gamma * gamma;
  if (damping <= 0 || Math.abs(gamma) < 1e-15) return 'undamped';
  if (disc > 1e-12) return 'underdamped';
  if (Math.abs(disc) <= 1e-12) return 'critical';
  return 'overdamped';
}

/**
 * Oscillation frequency in Hz.
 * Undamped: √(k/m) / 2π
 * Underdamped: √(ω₀² − γ²) / 2π with γ = c/(2m)
 * Critical/overdamped: returns null (no sustained oscillation).
 */
export function theoreticalSpringFrequency(
  springConstant: number,
  mass: number,
  damping = 0,
): number | null {
  const regime = springOscillationRegime(springConstant, mass, damping);
  if (regime === 'critical' || regime === 'overdamped') return null;

  const omega0 = springNaturalOmega(springConstant, mass);
  if (regime === 'undamped') {
    return omega0 / (2 * Math.PI);
  }

  const gamma = springDampingGamma(damping, mass);
  const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
  return omegaD / (2 * Math.PI);
}
