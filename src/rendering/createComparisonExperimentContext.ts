/**
 * Comparison context factory — visible right-pane Three.js context for set B.
 *
 * Role: Builds ExperimentRenderContext for ComparisonController (DIP; core stays Three-free).
 * Connections: Constructed in main.ts with ComparisonViewport.
 * Extension: Dual-viewport visuals live here; graph overlays remain via measurement merge.
 */
import type { ComparisonContextFactory } from '../core/types';
import type { ComparisonViewport } from './ComparisonViewport';
import type { ExperimentRenderContext } from './ExperimentRenderContext';

export function createComparisonContextFactory(
  viewport: ComparisonViewport,
): ComparisonContextFactory<ExperimentRenderContext> {
  return (recorder, experimentId) => {
    viewport.prepareForExperiment(experimentId);
    const context = viewport.createContext(recorder);
    return {
      context,
      dispose: () => {
        viewport.disposeVisuals();
      },
    };
  };
}
