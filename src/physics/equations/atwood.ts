/**
 * Atwood machine equations — pure physics (no Three.js).
 *
 * Role: Ideal frictionless massless pulley; a = (m1−m2)g/(m1+m2).
 * Connections: Used by AtwoodExperiment via RK4 integrator.
 * Extension: State layout is [x, v] where x is downward displacement of m1 from start.
 */
import type { EnergyBreakdown } from '../../core/types';

export interface AtwoodParams {
  mass1: number;
  mass2: number;
  gravity: number;
  /** Downward displacement of m1 from the visual/rest reference (m). */
  initialDisplacement: number;
}

/** Constant acceleration of m1 downward (m2 accelerates upward by the same magnitude). */
export function theoreticalAtwoodAcceleration(
  mass1: number,
  mass2: number,
  gravity: number,
): number {
  const total = mass1 + mass2;
  if (total <= 0) return 0;
  return ((mass1 - mass2) * gravity) / total;
}

export function createAtwoodState(params: AtwoodParams): Float64Array {
  return new Float64Array([params.initialDisplacement, 0]);
}

export function atwoodDerivatives(
  state: Float64Array,
  params: AtwoodParams,
  out: Float64Array,
): void {
  const v = state[1];
  const a = theoreticalAtwoodAcceleration(params.mass1, params.mass2, params.gravity);
  out[0] = v;
  out[1] = a;
}

/**
 * Mechanical energy with PE referenced so ΔPE = (m2 − m1) g x
 * (m1 descending lowers PE when m1 > m2).
 */
export function computeAtwoodEnergy(state: Float64Array, params: AtwoodParams): EnergyBreakdown {
  const x = state[0];
  const v = state[1];
  const { mass1, mass2, gravity } = params;

  const kinetic = 0.5 * (mass1 + mass2) * v * v;
  const potential = (mass2 - mass1) * gravity * x;
  return { kinetic, potential, total: kinetic + potential };
}

/** Analytic position of m1 for constant acceleration from rest at x0. */
export function theoreticalAtwoodPosition(
  x0: number,
  acceleration: number,
  time: number,
): number {
  return x0 + 0.5 * acceleration * time * time;
}
