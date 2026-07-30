/**
 * TopBar — application header with brand, experiment switcher, and global actions.
 *
 * Role: Top-level navigation and global controls (play/pause, reset, comparison mode).
 * Connections: Hosts ExperimentSwitcher; controls wired in main.ts.
 * Extension: Keep global transport controls here; experiment params stay schema-driven.
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
  onPlayPause: () => void;
  onComparisonChange: (enabled: boolean) => void;
  onEditTargetChange: (target: ComparisonEditTarget) => void;
}

export class TopBar {
  private subtitleEl: HTMLElement;
  private compareToggle: ToggleElement;
  private editSelect: SelectElement;
  private editWrap: HTMLElement;
  private playPauseBtn: HTMLButtonElement;

  constructor(options: TopBarOptions) {
    const title = document.createElement('h1');
    title.className = 'text-title';
    title.textContent = 'Praxi Physics Lab';

    this.subtitleEl = document.createElement('span');
    this.subtitleEl.className = 'text-subtitle';

    options.brandContainer.appendChild(title);
    options.brandContainer.appendChild(this.subtitleEl);

    this.playPauseBtn = createButton({
      label: 'Pause',
      variant: 'secondary',
      onClick: options.onPlayPause,
    });
    options.actionsContainer.appendChild(this.playPauseBtn);

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

  setPaused(paused: boolean): void {
    this.playPauseBtn.textContent = paused ? 'Play' : 'Pause';
  }

  setComparisonUi(enabled: boolean, editTarget: ComparisonEditTarget): void {
    this.compareToggle.setChecked(enabled);
    this.editWrap.hidden = !enabled;
    this.editSelect.setValue(editTarget);
  }
}
