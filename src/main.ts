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
import { PrimaryExperimentSceneAdapter } from './rendering/PrimaryExperimentSceneAdapter';
import { ComparisonViewport } from './rendering/ComparisonViewport';
import { createComparisonContextFactory } from './rendering/createComparisonExperimentContext';
import type { ExperimentRenderContext } from './rendering/ExperimentRenderContext';
import { ParameterPanel } from './ui/ParameterPanel';
import { GraphSystem } from './ui/GraphSystem';
import { ExperimentSwitcher } from './ui/ExperimentSwitcher';
import { ScalarDisplay } from './ui/ScalarDisplay';
import { SessionControls } from './ui/SessionControls';
import { TopBar } from './ui/TopBar';
import { UIUpdateScheduler } from './ui/UIUpdateScheduler';
import { ResultsPanelResize } from './ui/ResultsPanelResize';

const canvas = document.getElementById('simulation-canvas') as HTMLCanvasElement;
const comparisonCanvas = document.getElementById('comparison-canvas') as HTMLCanvasElement;
const comparisonPane = document.getElementById('comparison-pane') as HTMLElement;
const viewportStage = document.getElementById('viewport-stage') as HTMLElement;
if (!canvas || !comparisonCanvas || !comparisonPane || !viewportStage) {
  throw new Error('Viewport elements not found');
}

const appBody = document.querySelector('.app-body') as HTMLElement;
const resultsPanel = document.querySelector('.panel--results') as HTMLElement;
if (!appBody || !resultsPanel) throw new Error('Layout panels not found');

const sceneManager = new SceneManager(canvas);
const comparisonViewport = new ComparisonViewport(comparisonPane, comparisonCanvas);
const parameterStore = new ParameterStore();
const sceneAdapter = new PrimaryExperimentSceneAdapter(sceneManager);
const host = new ExperimentHost<ExperimentRenderContext>(
  parameterStore,
  sceneAdapter,
  createComparisonContextFactory(comparisonViewport),
);

const parameterPanel = new ParameterPanel(
  document.getElementById('parameter-panel')!,
  parameterStore,
);

let loop!: SimulationLoop;
let syncTransportUi: (paused: boolean) => void = () => {};

const graphSystem = new GraphSystem(document.getElementById('graph-system')!, {
  onUserScrub: () => {
    loop.pause();
    syncTransportUi(true);
  },
});
const scalarDisplay = new ScalarDisplay(document.getElementById('scalar-display')!);
const uiScheduler = new UIUpdateScheduler(scalarDisplay, graphSystem);

function refreshViewportLayout(comparing: boolean): void {
  viewportStage.classList.toggle('is-comparing', comparing);
  comparisonViewport.setActive(comparing);
  sceneManager.resize();
  comparisonViewport.resize();
}

const resultsResize = new ResultsPanelResize(resultsPanel, appBody);
resultsResize.onResize(() => {
  graphSystem.notifyLayoutChange();
  sceneManager.resize();
  comparisonViewport.resize();
  window.dispatchEvent(new Event('resize'));
});

const topBar = new TopBar({
  brandContainer: document.getElementById('top-bar-brand')!,
});

const switcher = new ExperimentSwitcher(
  document.getElementById('experiment-switcher')!,
  host,
);

const sessionControls = new SessionControls({
  container: document.getElementById('session-controls')!,
  onReset: () => {
    loop.resume();
    syncTransportUi(false);
    graphSystem.setFollowLive(true);
    host.reset();
    uiScheduler.forceUpdate(host.getMeasurements());
  },
  onPlayPause: () => {
    if (loop.isPaused()) {
      loop.resume();
      syncTransportUi(false);
      graphSystem.setFollowLive(true);
    } else {
      loop.pause();
      syncTransportUi(true);
    }
  },
  onComparisonChange: (enabled) => {
    // Show pane first so set-B setup sees a non-zero canvas size.
    refreshViewportLayout(enabled);
    host.setComparisonEnabled(enabled);
    sessionControls.setComparisonUi(host.isComparisonEnabled(), host.getComparisonEditTarget());
    uiScheduler.forceUpdate(host.getMeasurements());
  },
  onEditTargetChange: (target) => {
    host.setComparisonEditTarget(target);
    parameterPanel.syncFromStore(parameterStore.getValues());
  },
});

syncTransportUi = (paused: boolean) => {
  sessionControls.setPaused(paused);
};
switcher.setOnSwitch((name) => topBar.setExperimentName(name));

function refreshUI(): void {
  const experiment = host.getActiveExperiment();
  if (!experiment) return;
  parameterPanel.bindSchema(experiment.getParameterSchema());
  parameterPanel.syncFromStore(parameterStore.getValues());
  const comparing = host.isComparisonEnabled();
  sessionControls.setComparisonUi(comparing, host.getComparisonEditTarget());
  refreshViewportLayout(comparing);
  graphSystem.setFollowLive(true);
  uiScheduler.forceUpdate(host.getMeasurements());
}

host.setOnExperimentChanged(refreshUI);

const experiments = listExperiments();
if (experiments.length === 0) {
  throw new Error('No experiments registered.');
}

host.switchExperiment(experiments[0].id);
switcher.setActive(experiments[0].id);

loop = new SimulationLoop({
  onFixedUpdate: (dt) => host.fixedUpdate(dt),
  onRender: (alpha) => {
    host.render(alpha);
    sceneManager.render();
    if (comparisonViewport.isActive()) {
      comparisonViewport.syncCameraFrom(sceneManager);
      comparisonViewport.render();
    }
    uiScheduler.tick(host.getMeasurements());
  },
});

loop.start();
