/**
 * Slider — range input with live value readout.
 *
 * Role: Schema-driven slider control for experiment parameters.
 * Connections: Used by ParameterPanel for slider-type schema fields.
 * Extension: Add logarithmic scale support if needed.
 */
export interface SliderOptions {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export interface SliderElement {
  root: HTMLElement;
  input: HTMLInputElement;
  setValue: (value: number) => void;
}

function formatValue(value: number, step: number): string {
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0;
  return value.toFixed(decimals);
}

export function createSlider(opts: SliderOptions): SliderElement {
  const root = document.createElement('div');
  root.className = 'slider-field';

  const header = document.createElement('div');
  header.className = 'slider-field__header';

  const labelWrap = document.createElement('div');
  labelWrap.className = 'slider-field__label-wrap';

  const label = document.createElement('label');
  label.className = 'slider-field__label';
  label.htmlFor = opts.id;
  label.textContent = opts.unit ? `${opts.label} (${opts.unit})` : opts.label;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'slider-field__value';
  valueDisplay.textContent = opts.unit
    ? `${formatValue(opts.value, opts.step)} ${opts.unit}`
    : formatValue(opts.value, opts.step);

  labelWrap.appendChild(label);
  header.appendChild(labelWrap);
  header.appendChild(valueDisplay);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = opts.id;
  input.value = String(opts.value);
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);

  const clamp = (v: number): number => Math.min(opts.max, Math.max(opts.min, v));

  const emit = () => {
    const raw = parseFloat(input.value);
    const clamped = clamp(raw);
    if (clamped !== raw) input.value = String(clamped);
    valueDisplay.textContent = opts.unit
      ? `${formatValue(clamped, opts.step)} ${opts.unit}`
      : formatValue(clamped, opts.step);
    opts.onChange(clamped);
  };

  input.addEventListener('input', emit);
  input.addEventListener('change', emit);

  root.appendChild(header);
  root.appendChild(input);

  return {
    root,
    input,
    setValue: (value: number) => {
      const clamped = clamp(value);
      input.value = String(clamped);
      valueDisplay.textContent = opts.unit
        ? `${formatValue(clamped, opts.step)} ${opts.unit}`
        : formatValue(clamped, opts.step);
    },
  };
}
