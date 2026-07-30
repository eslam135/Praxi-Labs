/**
 * MetricCard — scalar measurement readout with theory/error display.
 *
 * Role: Displays measured vs theoretical values from getMeasurements().
 * Connections: Used by ScalarDisplay for incremental metric updates.
 * Extension: Add sparkline mini-chart if needed.
 */
import type { ScalarMetric } from '../../core/types';

export type ErrorLevel = 'success' | 'warning' | 'error' | 'none';

export interface MetricCardElement {
  root: HTMLElement;
  update: (metric: ScalarMetric, highlight: boolean) => void;
}

function getErrorLevel(percentError?: number): ErrorLevel {
  if (percentError === undefined) return 'none';
  if (percentError < 2) return 'success';
  if (percentError <= 10) return 'warning';
  return 'error';
}

export function createMetricCard(): MetricCardElement {
  const root = document.createElement('div');
  root.className = 'metric-card';

  const labelEl = document.createElement('span');
  labelEl.className = 'metric-card__label';

  const valueEl = document.createElement('span');
  valueEl.className = 'metric-card__value';

  const theoryEl = document.createElement('span');
  theoryEl.className = 'metric-card__theory';

  const errorEl = document.createElement('span');
  errorEl.className = 'metric-card__error';

  root.appendChild(labelEl);
  root.appendChild(valueEl);
  root.appendChild(theoryEl);
  root.appendChild(errorEl);

  let lastKey = '';

  return {
    root,
    update: (metric: ScalarMetric, highlight: boolean) => {
      const unit = metric.unit ? ` ${metric.unit}` : '';
      const key = `${metric.value}|${metric.theoretical}|${metric.percentError}|${highlight}`;

      if (key === lastKey) return;
      lastKey = key;

      root.classList.toggle('metric-card--highlight', highlight);

      labelEl.textContent = metric.label;
      valueEl.textContent = `${metric.value.toFixed(4)}${unit}`;

      if (metric.theoretical !== undefined) {
        theoryEl.textContent = `Theory: ${metric.theoretical.toFixed(4)}${unit}`;
        theoryEl.style.display = '';
      } else {
        theoryEl.style.display = 'none';
      }

      if (metric.percentError !== undefined) {
        const level = getErrorLevel(metric.percentError);
        errorEl.textContent = `Δ ${metric.percentError.toFixed(2)}%`;
        errorEl.className = `metric-card__error metric-card__error--${level}`;
        errorEl.style.display = '';
      } else {
        errorEl.style.display = 'none';
      }
    },
  };
}
