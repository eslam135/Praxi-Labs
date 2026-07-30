/**
 * TopBar — application header with brand, experiment switcher, and global actions.
 *
 * Role: Top-level navigation and global controls (reset, comparison mode).
 * Connections: Hosts ExperimentSwitcher; reset/comparison wired in main.ts.
 * Extension: Add play/pause here if needed.
 */
import type { ComparisonEditTarget } from '../core/types';
import { createButton } from './components/Button';
import { createSelect, type SelectElement } from './components/Select';
import { createToggle, type ToggleElement } from './components/Toggle';

export interface TopBarOptions {
  brandContainer: HTMLElement;
  switcherContainer: HTMLElement;
  actionsContainer: HTMLElement;
  onReset: () => void;
  onComparisonChange: (enabled: boolean) => void;
  onEditTargetChange: (target: ComparisonEditTarget) => void;
}

export class TopBar {
  private subtitleEl: HTMLElement;
  private compareToggle: ToggleElement;
  private editSelect: SelectElement;
  private editWrap: HTMLElement;

  constructor(options: TopBarOptions) {
    const title = document.createElement('h1');
    title.className = 'text-title';
    title.textContent = 'Praxi Physics Lab';

    this.subtitleEl = document.createElement('span');
    this.subtitleEl.className = 'text-subtitle';

    options.brandContainer.appendChild(title);
    options.brandContainer.appendChild(this.subtitleEl);

    this.compareToggle = createToggle({
      id: 'comparison-toggle',
      label: 'Compare A/B',
      checked: false,
      onChange: (checked) => {
        this.editWrap.hidden = !checked;
        options.onComparisonChange(checked);
      },
    });
    options.actionsContainer.appendChild(this.compareToggle.root);

    this.editSelect = createSelect({
      id: 'comparison-edit-target',
      label: 'Edit',
      options: [
        { value: 'A', label: 'Set A (3D)' },
        { value: 'B', label: 'Set B (graph)' },
      ],
      value: 'A',
      onChange: (value) => options.onEditTargetChange(value as ComparisonEditTarget),
    });
    this.editWrap = this.editSelect.root;
    this.editWrap.hidden = true;
    options.actionsContainer.appendChild(this.editWrap);

    const resetBtn = createButton({
      label: 'Reset Simulation',
      variant: 'secondary',
      onClick: options.onReset,
    });
    options.actionsContainer.appendChild(resetBtn);
  }

  setExperimentName(name: string): void {
    this.subtitleEl.textContent = name;
  }

  setComparisonUi(enabled: boolean, editTarget: ComparisonEditTarget): void {
    this.compareToggle.setChecked(enabled);
    this.editWrap.hidden = !enabled;
    this.editSelect.setValue(editTarget);
  }
}
