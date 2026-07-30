/**
 * SessionControls — left-panel transport and comparison controls.
 *
 * Role: Play/pause, reset, and A/B comparison UI next to the experiment switcher.
 * Connections: Wired from main.ts; comparison state mirrored via setComparisonUi.
 * Extension: Keep schema-driven parameters in ParameterPanel; put session actions here.
 */
import type { ComparisonEditTarget } from '../core/types';
import { createButton } from './components/Button';
import { createSelect, type SelectElement } from './components/Select';
import { createToggle, type ToggleElement } from './components/Toggle';

export interface SessionControlsOptions {
  container: HTMLElement;
  onReset: () => void;
  onPlayPause: () => void;
  onComparisonChange: (enabled: boolean) => void;
  onEditTargetChange: (target: ComparisonEditTarget) => void;
}

export class SessionControls {
  private playPauseBtn: HTMLButtonElement;
  private compareToggle: ToggleElement;
  private editSelect: SelectElement;
  private editWrap: HTMLElement;

  constructor(options: SessionControlsOptions) {
    const root = document.createElement('div');
    root.className = 'session-controls';

    const transport = document.createElement('div');
    transport.className = 'session-controls__transport';

    this.playPauseBtn = createButton({
      label: 'Pause',
      variant: 'secondary',
      onClick: options.onPlayPause,
      className: 'session-controls__btn',
    });
    transport.appendChild(this.playPauseBtn);

    const resetBtn = createButton({
      label: 'Reset',
      variant: 'secondary',
      onClick: options.onReset,
      className: 'session-controls__btn',
    });
    transport.appendChild(resetBtn);
    root.appendChild(transport);

    const compareRow = document.createElement('div');
    compareRow.className = 'session-controls__compare';

    this.compareToggle = createToggle({
      id: 'comparison-toggle',
      label: 'Compare A/B',
      checked: false,
      onChange: (checked) => {
        this.editWrap.hidden = !checked;
        options.onComparisonChange(checked);
      },
    });
    compareRow.appendChild(this.compareToggle.root);

    this.editSelect = createSelect({
      id: 'comparison-edit-target',
      label: 'Edit set',
      options: [
        { value: 'A', label: 'Set A (3D)' },
        { value: 'B', label: 'Set B (graph)' },
      ],
      value: 'A',
      onChange: (value) => options.onEditTargetChange(value as ComparisonEditTarget),
    });
    this.editWrap = this.editSelect.root;
    this.editWrap.hidden = true;
    compareRow.appendChild(this.editWrap);

    root.appendChild(compareRow);
    options.container.appendChild(root);
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
