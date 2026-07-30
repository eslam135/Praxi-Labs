/**
 * ParameterPanel — schema-driven auto-generated experiment controls.
 *
 * Role: Renders sliders, number inputs, and toggles from getParameterSchema().
 * Connections: Writes to ParameterStore; never contains experiment-specific UI.
 * Extension: Add new ParameterType variants here if schema grows.
 */
import type { ParameterSchema, ParameterValues } from '../core/types';
import type { ParameterStore } from '../core/ParameterStore';
import { createPanel } from './components/Panel';
import { createSlider } from './components/Slider';
import { createToggle } from './components/Toggle';
import { createTooltip } from './components/Tooltip';

interface ControlEntry {
  setValue: (value: number | boolean) => void;
}

export class ParameterPanel {
  private container: HTMLElement;
  private store: ParameterStore;
  private panelBody: HTMLElement;
  private controls = new Map<string, ControlEntry>();

  constructor(container: HTMLElement, store: ParameterStore) {
    this.container = container;
    this.store = store;

    const panel = createPanel({ title: 'Parameters' });
    this.panelBody = panel.body;
    this.container.appendChild(panel.root);
  }

  bindSchema(schema: ParameterSchema[]): void {
    this.panelBody.innerHTML = '';
    this.controls.clear();

    for (const field of schema) {
      const el = this.createField(field);
      this.panelBody.appendChild(el);
    }
  }

  syncFromStore(values: ParameterValues): void {
    for (const [key, control] of this.controls) {
      const value = values[key];
      if (value !== undefined) control.setValue(value);
    }
  }

  private createField(field: ParameterSchema): HTMLElement {
    if (field.type === 'toggle') {
      const toggle = createToggle({
        id: `param-${field.key}`,
        label: field.label,
        checked: Boolean(field.default),
        onChange: (checked) => this.store.setValue(field.key, checked),
      });

      if (field.description) {
        const labelWrap = toggle.root.querySelector('.toggle-field__label-wrap');
        labelWrap?.appendChild(createTooltip(field.description));
      }

      this.controls.set(field.key, {
        setValue: (v) => toggle.setChecked(Boolean(v)),
      });
      return toggle.root;
    }

    if (field.type === 'slider') {
      const slider = createSlider({
        id: `param-${field.key}`,
        label: field.label,
        value: Number(field.default),
        min: field.min ?? 0,
        max: field.max ?? 100,
        step: field.step ?? 1,
        unit: field.unit,
        onChange: (value) => this.store.setValue(field.key, value),
      });

      if (field.description) {
        const labelWrap = slider.root.querySelector('.slider-field__label-wrap');
        labelWrap?.appendChild(createTooltip(field.description));
      }

      this.controls.set(field.key, {
        setValue: (v) => slider.setValue(Number(v)),
      });
      return slider.root;
    }

    return this.createNumberField(field);
  }

  private createNumberField(field: ParameterSchema): HTMLElement {
    const root = document.createElement('div');
    root.className = 'number-field';

    const header = document.createElement('div');
    header.className = 'number-field__header';

    const label = document.createElement('label');
    label.htmlFor = `param-${field.key}`;
    label.textContent = field.unit ? `${field.label} (${field.unit})` : field.label;
    header.appendChild(label);

    if (field.description) {
      header.appendChild(createTooltip(field.description));
    }

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `param-${field.key}`;
    input.value = String(field.default);
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.step !== undefined) input.step = String(field.step);

    const clamp = (v: number): number => {
      let result = v;
      if (field.min !== undefined) result = Math.max(field.min, result);
      if (field.max !== undefined) result = Math.min(field.max, result);
      return result;
    };

    const emit = () => {
      const clamped = clamp(parseFloat(input.value));
      if (clamped !== parseFloat(input.value)) input.value = String(clamped);
      this.store.setValue(field.key, clamped);
    };

    input.addEventListener('input', emit);
    input.addEventListener('change', emit);

    root.appendChild(header);
    root.appendChild(input);

    this.controls.set(field.key, {
      setValue: (v) => {
        input.value = String(clamp(Number(v)));
      },
    });

    return root;
  }
}
