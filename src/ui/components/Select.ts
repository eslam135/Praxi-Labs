/**
 * Select — styled dropdown component.
 *
 * Role: Consistent select styling for experiment switcher and graph channel picker.
 * Connections: Used by ExperimentSwitcher and GraphSystem.
 * Extension: Add search/filter if option lists grow large.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptions {
  id?: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  className?: string;
  onChange?: (value: string) => void;
}

export interface SelectElement {
  root: HTMLElement;
  select: HTMLSelectElement;
  setValue: (value: string) => void;
  setOptions: (options: SelectOption[], value?: string) => void;
}

export function createSelect(opts: SelectOptions): SelectElement {
  const root = document.createElement('div');
  root.className = 'ui-select-wrap';
  if (opts.className) root.classList.add(opts.className);

  if (opts.label) {
    const label = document.createElement('label');
    label.textContent = opts.label;
    if (opts.id) label.htmlFor = opts.id;
    root.appendChild(label);
  }

  const select = document.createElement('select');
  select.className = 'ui-select';
  if (opts.id) select.id = opts.id;

  function populate(options: SelectOption[], value?: string): void {
    select.innerHTML = '';
    for (const opt of options) {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      select.appendChild(el);
    }
    if (value !== undefined) select.value = value;
    else if (options.length > 0) select.value = options[0].value;
  }

  populate(opts.options, opts.value);

  if (opts.onChange) {
    select.addEventListener('change', () => opts.onChange!(select.value));
  }

  root.appendChild(select);

  return {
    root,
    select,
    setValue: (value: string) => {
      select.value = value;
    },
    setOptions: (options: SelectOption[], value?: string) => {
      const current = value ?? select.value;
      populate(options, current);
      const hasCurrent = options.some((o) => o.value === current);
      if (!hasCurrent && options.length > 0) select.value = options[0].value;
    },
  };
}
