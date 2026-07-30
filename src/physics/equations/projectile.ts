/**
 * Projectile motion equations — pure physics (no Three.js).
 *
 * Role: 2D projectile with optional quadratic air drag.
 * Connections: Used by ProjectileExperiment via SemiImplicitEuler.
 * Extension: State layout is [x, y, vx, vy].
 */
import type { EnergyBreakdown } from '../../core/types';

export interface ProjectileParams {
  launchAngle: number;
  initialSpeed: number;
  gravity: number;
  dragCoefficient: number;
}

export function createProjectileState(params: ProjectileParams): Float64Array {
  const angleRad = (params.launchAngle * Math.PI) / 180;
  const vx = params.initialSpeed * Math.cos(angleRad);
  const vy = params.initialSpeed * Math.sin(angleRad);
  return new Float64Array([0, 0, vx, vy]);
}

export function projectileDerivatives(
  state: Float64Array,
  params: ProjectileParams,
  out: Float64Array,
): void {
  const vx = state[2];
  const vy = state[3];
  const speed = Math.sqrt(vx * vx + vy * vy);
  const drag = params.dragCoefficient * speed;

  out[0] = vx;
  out[1] = vy;
  out[2] = -drag * vx;
  out[3] = -params.gravity - drag * vy;
}

export function computeProjectileEnergy(state: Float64Array, params: ProjectileParams): EnergyBreakdown {
  const mass = 1;
  const vx = state[2];
  const vy = state[3];
  const y = state[1];

  const kinetic = 0.5 * mass * (vx * vx + vy * vy);
  const potential = mass * params.gravity * Math.max(y, 0);
  return { kinetic, potential, total: kinetic + potential };
}

export function theoreticalProjectileRange(
  launchAngleDeg: number,
  speed: number,
  gravity: number,
): number {
  const angleRad = (launchAngleDeg * Math.PI) / 180;
  return (speed * speed * Math.sin(2 * angleRad)) / gravity;
}

export function getTrajectoryBounds(params: ProjectileParams): {
  maxX: number;
  maxY: number;
  range: number;
} {
  const points = analyticTrajectoryPoints(params, 120);
  let maxX = 2;
  let maxY = 1;
  for (const p of points) {
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const range = theoreticalProjectileRange(params.launchAngle, params.initialSpeed, params.gravity);
  maxX = Math.max(maxX, range) * 1.15;
  maxY = Math.max(maxY, 0.5) * 1.25;
  return { maxX, maxY, range };
}

export function analyticTrajectoryPoints(
  params: ProjectileParams,
  steps = 100,
): { x: number; y: number }[] {
  const angleRad = (params.launchAngle * Math.PI) / 180;
  const v0x = params.initialSpeed * Math.cos(angleRad);
  const v0y = params.initialSpeed * Math.sin(angleRad);
  const totalTime = (2 * v0y) / params.gravity;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalTime;
    const x = v0x * t;
    const y = v0y * t - 0.5 * params.gravity * t * t;
    if (y < 0) break;
    points.push({ x, y });
  }
  return points;
}
