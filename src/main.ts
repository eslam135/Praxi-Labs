/**
 * Application entry point — bootstraps scene, loop, UI, and experiment host.
 *
 * Role: Wires all modules together; contains no experiment-specific logic.
 * Connections: Imports experiments/index.ts for side-effect registration.
 * Extension: Do not add experiment logic here; use experiments/ + registry.
 */
import './experiments/index';
import { ExperimentHost } from './core/ExperimentHost';
import { ParameterStore } from './core/ParameterStore';
import { SimulationLoop } from './core/SimulationLoop';
import { listExperiments } from './core/ExperimentRegistry';
import { SceneManager } from './rendering/SceneManager';
import { ParameterPanel } from './ui/ParameterPanel';
import { GraphSystem } from './ui/GraphSystem';
import { ExperimentSwitcher } from './ui/ExperimentSwitcher';
import { ScalarDisplay } from './ui/ScalarDisplay';
import { TopBar } from './ui/TopBar';
import { UIUpdateScheduler } from './ui/UIUpdateScheduler';

const canvas = document.getElementById('simulation-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element not found');

const sceneManager = new SceneManager(canvas);
const parameterStore = new ParameterStore();
const host = new ExperimentHost(sceneManager.scene, sceneManager.camera, parameterStore, sceneManager);

const parameterPanel = new ParameterPanel(
  document.getElementById('parameter-panel')!,
  parameterStore,
);
const graphSystem = new GraphSystem(document.getElementById('graph-system')!);
const scalarDisplay = new ScalarDisplay(document.getElementById('scalar-display')!);
const uiScheduler = new UIUpdateScheduler(scalarDisplay, graphSystem);

const switcher = new ExperimentSwitcher(
  document.getElementById('experiment-switcher')!,
  host,
);

const topBar = new TopBar({
  brandContainer: document.getElementById('top-bar-brand')!,
  switcherContainer: document.getElementById('experiment-switcher')!,
  actionsContainer: document.getElementById('top-bar-actions')!,
  onReset: () => {
    host.reset();
    uiScheduler.forceUpdate(host.getMeasurements());
  },
  onComparisonChange: (enabled) => {
    host.setComparisonEnabled(enabled);
    topBar.setComparisonUi(host.isComparisonEnabled(), host.getComparisonEditTarget());
    uiScheduler.forceUpdate(host.getMeasurements());
  },
  onEditTargetChange: (target) => {
    host.setComparisonEditTarget(target);
    parameterPanel.syncFromStore(parameterStore.getValues());
  },
});

switcher.setOnSwitch((name) => topBar.setExperimentName(name));

function refreshUI(): void {
  const experiment = host.getActiveExperiment();
  if (!experiment) return;
  parameterPanel.bindSchema(experiment.getParameterSchema());
  parameterPanel.syncFromStore(parameterStore.getValues());
  topBar.setComparisonUi(host.isComparisonEnabled(), host.getComparisonEditTarget());
  uiScheduler.forceUpdate(host.getMeasurements());
}

host.setOnExperimentChanged(refreshUI);

const experiments = listExperiments();
if (experiments.length === 0) {
  throw new Error('No experiments registered.');
}

host.switchExperiment(experiments[0].id);
switcher.setActive(experiments[0].id);

const loop = new SimulationLoop({
  onFixedUpdate: (dt) => host.fixedUpdate(dt),
  onRender: (alpha) => {
    host.render(alpha);
    sceneManager.render();
    uiScheduler.tick(host.getMeasurements());
  },
});

loop.start();
