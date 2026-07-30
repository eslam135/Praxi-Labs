/**
 * Offscreen experiment context factory — headless Three.js context for comparison set B.
 *
 * Role: Builds a disposable scene/root/camera/renderKit never shown on screen.
 * Connections: Injected into ComparisonController from main.ts.
 * Extension: Keep comparison measurement-only; do not attach this scene to the renderer.
 */
import * as THREE from 'three';
import type { MeasurementRecorder } from '../core/MeasurementRecorder';
import type { OffscreenContextFactory } from '../core/types';
import type { ExperimentRenderContext } from './ExperimentRenderContext';
import { RenderKit } from './RenderKit';

export const createOffscreenExperimentContext: OffscreenContextFactory<ExperimentRenderContext> = (
  recorder: MeasurementRecorder,
) => {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  const renderKit = new RenderKit();

  const context: ExperimentRenderContext = {
    scene,
    root,
    camera,
    renderKit,
    recorder,
  };

  return {
    context,
    dispose: () => {
      renderKit.disposeAll();
      while (root.children.length > 0) {
        root.remove(root.children[0]);
      }
    },
  };
};
