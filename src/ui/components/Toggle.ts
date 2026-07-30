/**
 * Toggle — custom switch component replacing native checkbox.
 *
 * Role: Boolean parameter control with animated feedback.
 * Connections: Used by ParameterPanel for toggle-type schema fields.
 * Extension: Add indeterminate state if needed.
 */
export interface ToggleOptions {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ToggleElement {
  root: HTMLElement;
  input: HTMLInputElement;
  setChecked: (checked: boolean) => void;
}

export function createToggle(opts: ToggleOptions): ToggleElement {
  const root = document.createElement('div');
  root.className = 'toggle-field';

  const labelWrap = document.createElement('div');
  labelWrap.className = 'toggle-field__label-wrap';

  const label = document.createElement('span');
  label.className = 'toggle-field__label';
  label.textContent = opts.label;

  labelWrap.appendChild(label);
  root.appendChild(labelWrap);

  const toggle = document.createElement('label');
  toggle.className = 'ui-toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = opts.id;
  input.checked = opts.checked;

  const track = document.createElement('span');
  track.className = 'ui-toggle__track';
  const thumb = document.createElement('span');
  thumb.className = 'ui-toggle__thumb';
  track.appendChild(thumb);

  toggle.appendChild(input);
  toggle.appendChild(track);
  root.appendChild(toggle);

  input.addEventListener('change', () => opts.onChange(input.checked));

  return {
    root,
    input,
    setChecked: (checked: boolean) => {
      input.checked = checked;
    },
  };
}
