/**
 * Button — reusable button component with variant support.
 *
 * Role: Consistent interactive button styling across the UI.
 * Connections: Used by TopBar, GraphSystem, and other panels.
 * Extension: Add new variants here; keep styles in components.css.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = options.label;
  btn.className = `ui-btn ui-btn--${options.variant ?? 'secondary'}`;
  if (options.className) btn.classList.add(options.className);
  if (options.disabled) btn.disabled = true;
  if (options.onClick) btn.addEventListener('click', options.onClick);
  return btn;
}
