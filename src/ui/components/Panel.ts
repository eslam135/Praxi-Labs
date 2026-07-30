/**
 * Panel — card wrapper with title for grouped UI sections.
 *
 * Role: Consistent panel/card container across parameter, results, and graph areas.
 * Connections: Used by ParameterPanel, ScalarDisplay, GraphSystem.
 * Extension: Add optional action slot if needed.
 */
export interface PanelOptions {
  title: string;
  className?: string;
}

export interface PanelElement {
  root: HTMLElement;
  body: HTMLElement;
}

export function createPanel(options: PanelOptions): PanelElement {
  const root = document.createElement('div');
  root.className = 'ui-panel';
  if (options.className) root.classList.add(options.className);

  const title = document.createElement('h2');
  title.className = 'ui-panel__title';
  title.textContent = options.title;

  const body = document.createElement('div');
  body.className = 'ui-panel__body';

  root.appendChild(title);
  root.appendChild(body);

  return { root, body };
}
