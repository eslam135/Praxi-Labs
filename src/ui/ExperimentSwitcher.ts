/**
 * ExperimentSwitcher — pill/segment control to load registered experiments.
 *
 * Role: Lists experiments from registry; triggers clean switch via ExperimentHost.
 * Connections: Reads ExperimentRegistry; calls host.switchExperiment().
 * Extension: No changes needed when adding experiments (registry auto-lists).
 */
import { listExperiments } from '../core/ExperimentRegistry';
import type { ExperimentHost } from '../core/ExperimentHost';

export class ExperimentSwitcher {
  private host: ExperimentHost;
  private buttons = new Map<string, HTMLButtonElement>();
  private onSwitch: ((name: string) => void) | null = null;
  private activeId = '';

  constructor(container: HTMLElement, host: ExperimentHost) {
    this.host = host;

    const wrap = document.createElement('div');
    wrap.className = 'experiment-switch';
    wrap.setAttribute('role', 'listbox');
    wrap.setAttribute('aria-label', 'Experiment');

    const label = document.createElement('div');
    label.className = 'experiment-switch__label';
    label.textContent = 'Experiment';

    const grid = document.createElement('div');
    grid.className = 'experiment-switch__grid';

    const experiments = listExperiments();
    for (const exp of experiments) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'experiment-switch__btn';
      btn.textContent = exp.name;
      btn.setAttribute('role', 'option');
      btn.addEventListener('click', () => {
        this.host.switchExperiment(exp.id);
        this.setActive(exp.id);
      });
      this.buttons.set(exp.id, btn);
      grid.appendChild(btn);
    }

    wrap.appendChild(label);
    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  setActive(id: string): void {
    this.activeId = id;
    for (const [expId, btn] of this.buttons) {
      const active = expId === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    const exp = listExperiments().find((e) => e.id === id);
    this.onSwitch?.(exp?.name ?? id);
  }

  setOnSwitch(callback: (name: string) => void): void {
    this.onSwitch = callback;
    if (this.activeId) {
      const exp = listExperiments().find((e) => e.id === this.activeId);
      this.onSwitch(exp?.name ?? this.activeId);
    }
  }
}
