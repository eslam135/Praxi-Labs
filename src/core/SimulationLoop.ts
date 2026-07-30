/**
 * Fixed-timestep simulation loop with accumulator pattern.
 *
 * Role: Decouples physics updates from render frame rate.
 * Connections: ExperimentHost provides onFixedUpdate; SceneManager provides onRender.
 * Extension: Do not change FIXED_DT without updating physics validation tests.
 *            Use pause()/resume() for UI play-pause; rendering continues while paused.
 */
import type { SimulationStepCallbacks } from './types';

export const FIXED_DT = 1 / 120;
export const MAX_SUBSTEPS = 5;

export class SimulationLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private paused = false;
  private rafId = 0;
  private callbacks: SimulationStepCallbacks;

  constructor(callbacks: SimulationStepCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now() / 1000;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.rafId);
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.accumulator = 0;
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private tick(now: number): void {
    if (!this.running) return;

    const frameDelta = Math.min(now - this.lastTime, 0.25);
    this.lastTime = now;

    if (!this.paused) {
      this.accumulator += frameDelta;

      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
        this.callbacks.onFixedUpdate(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps += 1;
      }
    }

    const alpha = this.paused ? 1 : this.accumulator / FIXED_DT;
    this.callbacks.onRender(alpha);
    this.rafId = requestAnimationFrame(() => this.tick(performance.now() / 1000));
  }
}
