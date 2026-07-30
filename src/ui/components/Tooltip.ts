/**
 * Tooltip — help icon with hover/focus description text.
 *
 * Role: Provides context for complex experiment parameters.
 * Connections: Used by ParameterPanel when schema includes description.
 * Extension: Position auto-flip if near viewport edge.
 */
export function createTooltip(text: string): HTMLElement {
  const root = document.createElement('span');
  root.className = 'ui-tooltip';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ui-tooltip__trigger';
  trigger.textContent = '?';
  trigger.setAttribute('aria-label', 'Help');

  const content = document.createElement('span');
  content.className = 'ui-tooltip__content';
  content.textContent = text;
  content.setAttribute('role', 'tooltip');

  root.appendChild(trigger);
  root.appendChild(content);

  return root;
}
