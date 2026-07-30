/**
 * GraphSystem — generic time-series plotter with CSV export and time scrubbing.
 *
 * Role: Plots any measurement channel vs time; exports recorded data as CSV.
 * Also supports Energy overlay (all energy_* channels) and A/B comparison overlays.
 * Connections: Consumes MeasurementSnapshot via UIUpdateScheduler at ~15 Hz.
 * Extension: Channel list auto-populates from experiment measurement channels.
 *            Scrubbing is read-only over recorded buffers (no 3D rewind).
 */
import { COMPARISON_B_SUFFIX, type MeasurementChannel, type MeasurementSnapshot } from '../core/types';
import { createPanel } from './components/Panel';
import { createSelect, type SelectElement } from './components/Select';
import { createButton } from './components/Button';

const ENERGY_MODE = '__energy__';

const SERIES_COLORS = ['#38bdf8', '#fbbf24', '#4ade80', '#f472b6', '#a78bfa', '#fb923c'];

function readToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function isEnergyChannel(id: string): boolean {
  return id.startsWith('energy_') && !id.endsWith(COMPARISON_B_SUFFIX);
}

function isBChannel(id: string): boolean {
  return id.endsWith(COMPARISON_B_SUFFIX);
}

export interface GraphSystemOptions {
  /** Called when the user drags the scrub slider (implies pause / detach from live end). */
  onUserScrub?: () => void;
}

export class GraphSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private channelSelect: SelectElement;
  private scrubInput: HTMLInputElement;
  private scrubReadout: HTMLElement;
  private latestSnapshot: MeasurementSnapshot | null = null;
  private cachedChannelIds = '';
  private drawPending = false;
  private resizeObserver: ResizeObserver;
  private followLive = true;
  private scrubIndex = 0;
  private onUserScrub: (() => void) | undefined;

  constructor(container: HTMLElement, options: GraphSystemOptions = {}) {
    this.onUserScrub = options.onUserScrub;
    const panel = createPanel({ title: 'Time Series', className: 'graph-panel' });

    const controls = document.createElement('div');
    controls.className = 'graph-controls';

    this.channelSelect = createSelect({
      id: 'graph-channel',
      label: 'Channel',
      options: [],
      onChange: () => this.scheduleDraw(),
    });
    controls.appendChild(this.channelSelect.root);

    const exportBtn = createButton({
      label: 'Export CSV',
      variant: 'secondary',
      onClick: () => this.exportCsv(),
    });
    controls.appendChild(exportBtn);

    const scrubRow = document.createElement('div');
    scrubRow.className = 'graph-scrub';

    const scrubLabel = document.createElement('label');
    scrubLabel.className = 'graph-scrub__label';
    scrubLabel.htmlFor = 'graph-scrub';
    scrubLabel.textContent = 'Scrub';

    this.scrubInput = document.createElement('input');
    this.scrubInput.type = 'range';
    this.scrubInput.id = 'graph-scrub';
    this.scrubInput.className = 'graph-scrub__input';
    this.scrubInput.min = '0';
    this.scrubInput.max = '0';
    this.scrubInput.value = '0';
    this.scrubInput.step = '1';
    this.scrubInput.addEventListener('input', () => {
      this.followLive = false;
      this.scrubIndex = Number(this.scrubInput.value) || 0;
      this.onUserScrub?.();
      this.updateScrubReadout();
      this.scheduleDraw();
    });

    this.scrubReadout = document.createElement('div');
    this.scrubReadout.className = 'graph-scrub__readout';
    this.scrubReadout.textContent = 't = —';

    scrubRow.appendChild(scrubLabel);
    scrubRow.appendChild(this.scrubInput);
    scrubRow.appendChild(this.scrubReadout);
    controls.appendChild(scrubRow);

    panel.body.appendChild(controls);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'graph-canvas';
    panel.body.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    container.appendChild(panel.root);
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.canvas);
    this.resizeCanvas();
  }

  /** Resume auto-following the live end of the recording (e.g. on Play). */
  setFollowLive(follow: boolean): void {
    this.followLive = follow;
    if (follow && this.latestSnapshot && this.latestSnapshot.count > 0) {
      this.scrubIndex = this.latestSnapshot.count - 1;
      this.scrubInput.value = String(this.scrubIndex);
      this.updateScrubReadout();
      this.scheduleDraw();
    }
  }

  /** Public hook for panel resize / layout changes. */
  notifyLayoutChange(): void {
    this.resizeCanvas();
  }

  updateSnapshot(snapshot: MeasurementSnapshot): void {
    this.latestSnapshot = snapshot;

    const channelIds = snapshot.channels.map((c) => c.id).join(',');
    if (channelIds !== this.cachedChannelIds) {
      this.cachedChannelIds = channelIds;
      this.rebuildChannelOptions(snapshot);
    }

    const maxIdx = Math.max(0, snapshot.count - 1);
    this.scrubInput.max = String(maxIdx);
    if (this.followLive) {
      this.scrubIndex = maxIdx;
      this.scrubInput.value = String(maxIdx);
    } else if (this.scrubIndex > maxIdx) {
      this.scrubIndex = maxIdx;
      this.scrubInput.value = String(maxIdx);
    }
    this.updateScrubReadout();

    this.scheduleDraw();
  }

  private updateScrubReadout(): void {
    const snapshot = this.latestSnapshot;
    if (!snapshot || snapshot.count < 1) {
      this.scrubReadout.textContent = 't = —';
      return;
    }
    const i = Math.min(this.scrubIndex, snapshot.count - 1);
    const t = snapshot.time[i];
    const series = this.resolveSeries(snapshot);
    const parts = [`t = ${t.toFixed(3)} s`];
    for (let s = 0; s < Math.min(series.length, 3); s++) {
      const ch = series[s];
      const n = this.seriesSampleCount(snapshot, ch.id);
      if (i < n) {
        parts.push(`${ch.label}=${ch.values[i].toFixed(3)}`);
      }
    }
    this.scrubReadout.textContent = parts.join(' · ');
  }

  private rebuildChannelOptions(snapshot: MeasurementSnapshot): void {
    const hasEnergy = snapshot.channels.some((c) => isEnergyChannel(c.id));
    const options = [];

    if (hasEnergy) {
      options.push({ value: ENERGY_MODE, label: 'Energy (KE / PE / Total)' });
    }

    for (const channel of snapshot.channels) {
      if (isBChannel(channel.id)) continue;
      options.push({
        value: channel.id,
        label: `${channel.label} (${channel.unit})`,
      });
    }

    const preferEnergy = hasEnergy && this.channelSelect.select.value === '';
    this.channelSelect.setOptions(options, preferEnergy ? ENERGY_MODE : undefined);

    if (hasEnergy) {
      const current = this.channelSelect.select.value;
      const valid = options.some((o) => o.value === current);
      if (!valid) this.channelSelect.setValue(ENERGY_MODE);
    }
  }

  private scheduleDraw(): void {
    if (this.drawPending) return;
    this.drawPending = true;
    requestAnimationFrame(() => {
      this.drawPending = false;
      this.draw();
    });
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const nextW = Math.floor(rect.width * devicePixelRatio);
    const nextH = Math.floor(rect.height * devicePixelRatio);
    if (this.canvas.width === nextW && this.canvas.height === nextH) {
      this.draw();
      return;
    }
    this.canvas.width = nextW;
    this.canvas.height = nextH;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.draw();
  }

  private seriesSampleCount(snapshot: MeasurementSnapshot, channelId: string): number {
    if (isBChannel(channelId)) {
      return snapshot.secondaryCount ?? snapshot.count;
    }
    if (snapshot.comparisonActive) {
      return snapshot.primaryCount ?? snapshot.count;
    }
    return snapshot.count;
  }

  private resolveSeries(snapshot: MeasurementSnapshot): MeasurementChannel[] {
    const mode = this.channelSelect.select.value;

    if (mode === ENERGY_MODE) {
      const series = snapshot.channels.filter((c) => isEnergyChannel(c.id));
      if (snapshot.comparisonActive) {
        const bEnergy = snapshot.channels.filter(
          (c) => c.id.startsWith('energy_') && isBChannel(c.id),
        );
        return [...series, ...bEnergy];
      }
      return series;
    }

    const primary = snapshot.channels.find((c) => c.id === mode);
    if (!primary) return [];

    const series = [primary];
    if (snapshot.comparisonActive) {
      const b = snapshot.channels.find((c) => c.id === `${mode}${COMPARISON_B_SUFFIX}`);
      if (b) series.push(b);
    }
    return series;
  }

  private draw(): void {
    const snapshot = this.latestSnapshot;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width < 2 || height < 2) return;
    this.ctx.clearRect(0, 0, width, height);

    const textMuted = readToken('--color-text-muted', '#5c6b7a');
    const border = readToken('--color-border', '#2e3f52');
    const textPrimary = readToken('--color-text-primary', '#f0f4f8');
    const accent = readToken('--color-accent', '#38bdf8');

    if (!snapshot || snapshot.count < 2) {
      this.ctx.fillStyle = textMuted;
      this.ctx.font = '14px Inter, sans-serif';
      this.ctx.fillText('Recording data...', 16, 32);
      return;
    }

    const series = this.resolveSeries(snapshot);
    if (series.length === 0) return;

    const padL = 48;
    const padR = 16;
    const padT = series.length > 3 ? 44 : 32;
    const padB = 32;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    if (plotW < 8 || plotH < 8) return;

    let minY = Infinity;
    let maxY = -Infinity;
    for (const channel of series) {
      const n = Math.min(this.seriesSampleCount(snapshot, channel.id), channel.values.length);
      for (let i = 0; i < n; i++) {
        const v = channel.values[i];
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY === maxY) {
      minY = (Number.isFinite(minY) ? minY : 0) - 1;
      maxY = (Number.isFinite(maxY) ? maxY : 0) + 1;
    }

    const yPad = (maxY - minY) * 0.06;
    minY -= yPad;
    maxY += yPad;

    const maxT = snapshot.time[snapshot.count - 1] || 1;
    const yRange = maxY - minY;

    const toX = (t: number) => padL + (t / maxT) * plotW;
    const toY = (v: number) => padT + plotH - ((v - minY) / yRange) * plotH;

    this.ctx.strokeStyle = border;
    this.ctx.lineWidth = 0.5;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (plotH / gridLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padL, y);
      this.ctx.lineTo(width - padR, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = border;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(padL, padT);
    this.ctx.lineTo(padL, height - padB);
    this.ctx.lineTo(width - padR, height - padB);
    this.ctx.stroke();

    for (let s = 0; s < series.length; s++) {
      const channel = series[s];
      const color = SERIES_COLORS[s % SERIES_COLORS.length];
      const n = Math.min(this.seriesSampleCount(snapshot, channel.id), channel.values.length, snapshot.count);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = isBChannel(channel.id) ? 1.75 : 2;
      this.ctx.setLineDash(isBChannel(channel.id) ? [6, 4] : []);
      this.ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = toX(snapshot.time[i]);
        const y = toY(channel.values[i]);
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
    this.ctx.setLineDash([]);

    // Scrub cursor
    const scrubI = Math.min(this.scrubIndex, snapshot.count - 1);
    const scrubT = snapshot.time[scrubI];
    const scrubX = toX(scrubT);
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 1.25;
    this.ctx.setLineDash([4, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(scrubX, padT);
    this.ctx.lineTo(scrubX, height - padB);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Wrapped legend
    this.ctx.font = '11px Inter, sans-serif';
    let legendX = padL;
    let legendY = 14;
    const legendRowH = 14;
    for (let s = 0; s < series.length; s++) {
      const color = SERIES_COLORS[s % SERIES_COLORS.length];
      const label = series[s].label;
      const labelW = this.ctx.measureText(label).width + 28;
      if (legendX + labelW > width - padR && legendX > padL) {
        legendX = padL;
        legendY += legendRowH;
      }
      this.ctx.fillStyle = color;
      this.ctx.fillRect(legendX, legendY - 8, 10, 10);
      this.ctx.fillStyle = textPrimary;
      this.ctx.fillText(label, legendX + 14, legendY);
      legendX += labelW;
    }

    this.ctx.fillStyle = textMuted;
    this.ctx.font = '11px Inter, sans-serif';
    this.ctx.fillText('0', padL - 2, height - padB + 14);
    this.ctx.fillText(`${maxT.toFixed(1)}s`, width - padR - 28, height - padB + 14);
    this.ctx.fillText(minY.toFixed(2), 4, height - padB);
    this.ctx.fillText(maxY.toFixed(2), 4, padT + 4);

    this.ctx.fillStyle = textPrimary;
    this.ctx.fillText('Time (s)', width / 2 - 20, height - 6);
  }

  private exportCsv(): void {
    const snapshot = this.latestSnapshot;
    if (!snapshot || snapshot.count === 0) return;

    const headers = ['time', ...snapshot.channels.map((c) => c.id)];
    const rows: string[] = [headers.join(',')];

    for (let i = 0; i < snapshot.count; i++) {
      const cols = [snapshot.time[i].toFixed(6)];
      for (const channel of snapshot.channels) {
        const n = this.seriesSampleCount(snapshot, channel.id);
        cols.push(i < n ? channel.values[i].toFixed(6) : '');
      }
      rows.push(cols.join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'physics_data.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
