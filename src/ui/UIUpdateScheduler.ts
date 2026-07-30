/**
 * UIUpdateScheduler — throttles DOM updates to ~15 Hz, decoupled from render loop.
 *
 * Role: Prevents per-frame DOM rebuilds while simulation runs at full rate.
 * Connections: Called from main.ts onRender; delegates to ScalarDisplay + GraphSystem.
 * Extension: Adjust UI_UPDATE_INTERVAL_MS if profiling shows need.
 */
import type { MeasurementSnapshot } from '../core/types';
import type { ScalarDisplay } from './ScalarDisplay';
import type { GraphSystem } from './GraphSystem';

const UI_UPDATE_INTERVAL_MS = 1000 / 15;

export class UIUpdateScheduler {
  private scalarDisplay: ScalarDisplay;
  private graphSystem: GraphSystem;
  private lastUpdate = 0;
  private pending: MeasurementSnapshot | null = null;
  private scheduled = false;

  constructor(scalarDisplay: ScalarDisplay, graphSystem: GraphSystem) {
    this.scalarDisplay = scalarDisplay;
    this.graphSystem = graphSystem;
  }

  tick(measurements: MeasurementSnapshot): void {
    this.pending = measurements;
    const now = performance.now();

    if (now - this.lastUpdate >= UI_UPDATE_INTERVAL_MS) {
      this.flush();
      this.lastUpdate = now;
      return;
    }

    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.scheduled = false;
        if (this.pending && performance.now() - this.lastUpdate >= UI_UPDATE_INTERVAL_MS) {
          this.flush();
          this.lastUpdate = performance.now();
        }
      });
    }
  }

  forceUpdate(measurements: MeasurementSnapshot): void {
    this.pending = measurements;
    this.flush();
    this.lastUpdate = performance.now();
  }

  private flush(): void {
    if (!this.pending) return;
    this.scalarDisplay.update(this.pending.scalars);
    this.graphSystem.updateSnapshot(this.pending);
    this.pending = null;
  }
}
