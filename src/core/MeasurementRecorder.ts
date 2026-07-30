/**
 * Measurement recorder — framework-owned ring buffer for time-series data.
 *
 * Role: Pre-allocated buffers; experiments write samples without per-frame allocation.
 * Connections: ExperimentHost clears on switch; experiments append via registerChannels.
 * Extension: Experiments declare channel ids at setup; recorder grows channels on demand.
 */
import type { MeasurementChannel, MeasurementSnapshot } from './types';

const DEFAULT_CAPACITY = 6000;

interface ChannelBuffer {
  id: string;
  label: string;
  unit: string;
  values: Float64Array;
}

export class MeasurementRecorder {
  private time: Float64Array;
  private channels = new Map<string, ChannelBuffer>();
  private count = 0;
  private capacity: number;
  private simTime = 0;

  constructor(capacity = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.time = new Float64Array(capacity);
  }

  registerChannel(id: string, label: string, unit: string): void {
    if (!this.channels.has(id)) {
      this.channels.set(id, {
        id,
        label,
        unit,
        values: new Float64Array(this.capacity),
      });
    }
  }

  clear(): void {
    this.count = 0;
    this.simTime = 0;
  }

  getSimTime(): number {
    return this.simTime;
  }

  append(dt: number, samples: Record<string, number>): void {
    if (this.count >= this.capacity) return;

    this.time[this.count] = this.simTime;
    for (const [id, channel] of this.channels) {
      channel.values[this.count] = samples[id] ?? 0;
    }
    this.count += 1;
    this.simTime += dt;
  }

  getSnapshot(scalars: MeasurementSnapshot['scalars'] = []): MeasurementSnapshot {
    const channels: MeasurementChannel[] = [];
    for (const channel of this.channels.values()) {
      channels.push({
        id: channel.id,
        label: channel.label,
        unit: channel.unit,
        values: channel.values,
      });
    }

    return {
      time: this.time,
      channels,
      scalars,
      count: this.count,
    };
  }
}
