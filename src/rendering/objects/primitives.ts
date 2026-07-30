/**
 * Rendering primitives — reusable Three.js object builders.
 *
 * Role: Generic visual helpers shared across experiments.
 * Connections: Used by experiment glue files via RenderKit.
 * Extension: Add new primitives here; keep experiment files as glue only.
 */
import * as THREE from 'three';
import type { RenderKit } from '../RenderKit';

export function createSphere(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  radius: number,
  color: number,
  childParent?: THREE.Object3D,
  emissive = 0,
): THREE.Mesh {
  const geometry = renderKit.track(new THREE.SphereGeometry(radius, 24, 24));
  const material = renderKit.track(
    new THREE.MeshStandardMaterial({
      color,
      emissive: emissive || color,
      emissiveIntensity: emissive ? 0.35 : 0.08,
      metalness: 0.3,
      roughness: 0.4,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  if (childParent) {
    childParent.add(mesh);
    renderKit.addToScene(parent, childParent);
  } else {
    renderKit.addToScene(parent, mesh);
  }
  return mesh;
}

export function createRod(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  length: number,
  radius: number,
  color: number,
  childParent?: THREE.Object3D,
): THREE.Mesh {
  const geometry = renderKit.track(new THREE.CylinderGeometry(radius, radius, length, 8));
  const material = renderKit.track(
    new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.5 }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  geometry.translate(0, -length / 2, 0);
  if (childParent) {
    childParent.add(mesh);
    renderKit.addToScene(parent, childParent);
  } else {
    renderKit.addToScene(parent, mesh);
  }
  return mesh;
}

export function createLine(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  color: number,
  dashed = false,
  lineWidth = 2,
): THREE.Line {
  const geometry = renderKit.track(new THREE.BufferGeometry().setFromPoints(points));
  const material = renderKit.track(
    dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.12, linewidth: lineWidth })
      : new THREE.LineBasicMaterial({ color, linewidth: lineWidth }),
  );
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return renderKit.addToScene(parent, line) as THREE.Line;
}

/**
 * Cable/rope line that draws cleanly over meshes (pulleys, anchors).
 * Prefer this over createLine for strings that must not look clipped.
 */
export function createCable(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  color: number,
): THREE.Line {
  const line = createLine(renderKit, parent, points, color);
  const mat = line.material;
  if (mat instanceof THREE.LineBasicMaterial || mat instanceof THREE.LineDashedMaterial) {
    mat.depthTest = true;
    mat.depthWrite = false;
  }
  line.renderOrder = 10;
  return line;
}

export function updateLinePoints(
  line: THREE.Line,
  points: THREE.Vector3[],
  count = points.length,
): void {
  const geometry = line.geometry as THREE.BufferGeometry;
  const n = Math.min(count, points.length);
  const needed = n * 3;
  let attr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;

  if (!attr || attr.array.length < needed) {
    attr = new THREE.BufferAttribute(new Float32Array(Math.max(needed, points.length * 3)), 3);
    geometry.setAttribute('position', attr);
  }

  const positions = attr.array as Float32Array;
  for (let i = 0; i < n; i++) {
    positions[i * 3] = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
  }
  attr.needsUpdate = true;
  geometry.setDrawRange(0, n);
  geometry.computeBoundingSphere();
  const mat = line.material;
  if (mat instanceof THREE.LineDashedMaterial) {
    line.computeLineDistances();
  }
}

/**
 * Face-on pulley wheel (axle along Z) for Atwood-style setups.
 * Extension: Reuse for any cable-over-wheel visual.
 */
export function createPulleyWheel(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  radius: number,
  thickness: number,
  color: number,
): THREE.Mesh {
  const geometry = renderKit.track(new THREE.CylinderGeometry(radius, radius, thickness, 32));
  const material = renderKit.track(
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.45,
      roughness: 0.35,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return renderKit.addToScene(parent, mesh) as THREE.Mesh;
}

/** Vertex count for fillPulleyCablePoints (left hang + arc + right hang). */
export function pulleyCablePointCount(arcSegments: number): number {
  return arcSegments + 3;
}

/**
 * Continuous cable over a circular pulley in the XY plane (axle // Z).
 * Arc runs over the top from left tangent (π) to right tangent (0).
 * Reuses preallocated `out` vectors — no per-frame allocation.
 */
export function fillPulleyCablePoints(
  out: THREE.Vector3[],
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number,
  pulleyX: number,
  pulleyY: number,
  radius: number,
  arcSegments: number,
  z = 0.04,
): void {
  const needed = pulleyCablePointCount(arcSegments);
  if (out.length < needed) {
    throw new Error(`fillPulleyCablePoints expects >= ${needed} preallocated points`);
  }

  let i = 0;
  out[i++].set(leftX, leftY, z);
  for (let s = 0; s <= arcSegments; s++) {
    const theta = Math.PI - (Math.PI * s) / arcSegments;
    out[i++].set(
      pulleyX + radius * Math.cos(theta),
      pulleyY + radius * Math.sin(theta),
      z,
    );
  }
  out[i++].set(rightX, rightY, z);
}

/** Number of vertices for a coil spring (inclusive of both ends). */
export function springPointCount(coils: number): number {
  return coils * 32 + 1;
}

/**
 * Fills a preallocated Vector3 buffer with helical spring points along -Y.
 * Reuses `out` vectors — call once at setup with the correct length.
 */
export function fillSpringPoints(
  out: THREE.Vector3[],
  length: number,
  coils: number,
  radius: number,
): void {
  const segments = coils * 32;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * coils * Math.PI * 2;
    out[i].set(Math.cos(angle) * radius, -t * length, Math.sin(angle) * radius);
  }
}

export function createSpring(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  length: number,
  coils: number,
  radius: number,
  color: number,
): THREE.Line {
  const count = springPointCount(coils);
  const points: THREE.Vector3[] = new Array(count);
  for (let i = 0; i < count; i++) {
    points[i] = new THREE.Vector3();
  }
  fillSpringPoints(points, length, coils, radius);
  return createLine(renderKit, parent, points, color);
}

/** Updates an existing spring line in place (no geometry recreation). */
export function updateSpringPoints(
  line: THREE.Line,
  points: THREE.Vector3[],
  length: number,
  coils: number,
  radius: number,
): void {
  fillSpringPoints(points, length, coils, radius);
  updateLinePoints(line, points);
}

export function createBox(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh {
  const geometry = renderKit.track(new THREE.BoxGeometry(width, height, depth));
  const material = renderKit.track(new THREE.MeshStandardMaterial({ color }));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return renderKit.addToScene(parent, mesh) as THREE.Mesh;
}

export function createMarker(
  renderKit: RenderKit,
  parent: THREE.Object3D,
  color: number,
): THREE.Mesh {
  return createSphere(renderKit, parent, 0.12, color, undefined, color);
}
