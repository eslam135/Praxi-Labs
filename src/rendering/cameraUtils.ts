/**
 * Camera utilities — frame the viewport to fit experiment content.
 *
 * Role: Pure math helpers for positioning PerspectiveCamera to show bounds.
 * Connections: Used by experiments (especially projectile) for auto-framing.
 * Extension: Add orthographic framing if a 2D-only view is needed.
 */
import * as THREE from 'three';

export interface ViewBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function frameCameraToBounds(
  camera: THREE.PerspectiveCamera,
  bounds: ViewBounds,
  aspect: number,
  padding = 1.3,
): void {
  const width = (bounds.maxX - bounds.minX) * padding;
  const height = (bounds.maxY - bounds.minY) * padding;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const fovRad = (camera.fov * Math.PI) / 180;
  const distV = (height / 2) / Math.tan(fovRad / 2);
  const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const distH = (width / 2) / Math.tan(hFov / 2);
  const distance = Math.max(distV, distH, 4);

  camera.position.set(centerX, centerY, distance);
  camera.lookAt(centerX, centerY, 0);
  camera.updateProjectionMatrix();
}
