/**
 * ExperimentSwitcher — dropdown to load registered experiments.
 *
 * Role: Lists experiments from registry; triggers clean switch via ExperimentHost.
 * Connections: Reads ExperimentRegistry; calls host.switchExperiment().
 * Extension: No changes needed when adding experiments (registry auto-lists).
 */
import { listExperiments } from '../core/ExperimentRegistry';
import type { ExperimentHost } from '../core/ExperimentHost';
import { createSelect } from './components/Select';

export class ExperimentSwitcher {
  private host: ExperimentHost;
  private select: ReturnType<typeof createSelect>;
  private onSwitch: ((name: string) => void) | null = null;

  constructor(container: HTMLElement, host: ExperimentHost) {
    this.host = host;

    const experiments = listExperiments();
    this.select = createSelect({
      id: 'experiment-select',
      label: 'Experiment',
      options: experiments.map((e) => ({ value: e.id, label: e.name })),
      onChange: (id) => {
        this.host.switchExperiment(id);
        const exp = experiments.find((e) => e.id === id);
        this.onSwitch?.(exp?.name ?? id);
      },
    });

    container.appendChild(this.select.root);
  }

  setActive(id: string): void {
    this.select.setValue(id);
    const exp = listExperiments().find((e) => e.id === id);
    this.onSwitch?.(exp?.name ?? id);
  }

  setOnSwitch(callback: (name: string) => void): void {
    this.onSwitch = callback;
  }
}
