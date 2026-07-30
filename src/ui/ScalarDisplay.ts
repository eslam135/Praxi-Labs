/**
 * ScalarDisplay — generic measured vs theoretical readout panel.
 *
 * Role: Renders scalar metrics from getMeasurements() without per-experiment UI.
 * Connections: Updated via UIUpdateScheduler at ~15 Hz.
 * Extension: Automatically shows theoretical comparison when scalar provides it.
 */
import type { ScalarMetric } from '../core/types';
import { createPanel } from './components/Panel';
import { createMetricCard, type MetricCardElement } from './components/MetricCard';

export class ScalarDisplay {
  private list: HTMLElement;
  private cards = new Map<string, MetricCardElement>();
  private emptyEl: HTMLElement | null = null;
  private lastIds = '';

  constructor(container: HTMLElement) {
    const panel = createPanel({ title: 'Results' });
    this.list = document.createElement('div');
    this.list.className = 'scalar-list';
    panel.body.appendChild(this.list);
    container.appendChild(panel.root);
  }

  update(scalars: ScalarMetric[]): void {
    const ids = scalars.map((s) => s.id).join(',');
    const structureChanged = ids !== this.lastIds;
    this.lastIds = ids;

    if (scalars.length === 0) {
      if (!this.emptyEl) {
        this.list.innerHTML = '';
        this.cards.clear();
        this.emptyEl = document.createElement('p');
        this.emptyEl.className = 'metric-empty';
        this.emptyEl.textContent = 'Run the simulation to see measurements.';
        this.list.appendChild(this.emptyEl);
      }
      return;
    }

    if (this.emptyEl) {
      this.emptyEl.remove();
      this.emptyEl = null;
    }

    const highlightId = scalars.find((s) => s.theoretical !== undefined)?.id;

    if (structureChanged) {
      this.list.innerHTML = '';
      this.cards.clear();
      for (const metric of scalars) {
        const card = createMetricCard();
        this.cards.set(metric.id, card);
        this.list.appendChild(card.root);
      }
    }

    for (const metric of scalars) {
      const card = this.cards.get(metric.id);
      if (card) {
        card.update(metric, metric.id === highlightId);
      }
    }

    const currentIds = new Set(scalars.map((s) => s.id));
    for (const [id, card] of this.cards) {
      if (!currentIds.has(id)) {
        card.root.remove();
        this.cards.delete(id);
      }
    }
  }
}
