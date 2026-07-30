/**
 * SceneManager — shared Three.js scene, camera, lights, orbit controls, and renderer.
 *
 * Role: Owns the WebGL renderer and persistent base environment (not cleared on experiment switch).
 * Connections: Used by main.ts; experiments add objects to context.root group.
 * Extension: Call setEnvironmentStyle() for per-experiment ambience tweaks.
 *            Call syncCameraTarget() after programmatic camera framing.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type EnvironmentStyle = 'default' | 'projectile' | 'pendulum' | 'spring';

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 4, 10);
const DEFAULT_TARGET = new THREE.Vector3(0, 1, 0);

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function createSkyTexture(topHex: number, bottomHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create sky canvas context');

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, hexToCss(topHex));
  gradient.addColorStop(0.55, hexToCss(topHex));
  gradient.addColorStop(1, hexToCss(bottomHex));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly baseGroup: THREE.Group;
  readonly controls: OrbitControls;

  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private hemisphere: THREE.HemisphereLight;
  private directional: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private accent: THREE.PointLight;
  private skyTexture: THREE.CanvasTexture;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.baseGroup = new THREE.Group();
    this.scene.add(this.baseGroup);

    this.skyTexture = createSkyTexture(0x0a1528, 0x1a2838);
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.Fog(0x152030, 28, 110);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    this.camera.position.copy(DEFAULT_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.hemisphere = new THREE.HemisphereLight(0x9ec8ef, 0x1c2736, 0.85);
    this.directional = new THREE.DirectionalLight(0xfff2dd, 1.05);
    this.directional.position.set(8, 14, 6);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(2048, 2048);
    this.directional.shadow.bias = -0.0002;
    this.directional.shadow.normalBias = 0.02;
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 80;
    this.directional.shadow.camera.left = -30;
    this.directional.shadow.camera.right = 30;
    this.directional.shadow.camera.top = 30;
    this.directional.shadow.camera.bottom = -30;

    this.fill = new THREE.DirectionalLight(0x6a9cc8, 0.35);
    this.fill.position.set(-6, 5, -4);

    this.accent = new THREE.PointLight(0x38bdf8, 0.45, 50);
    this.accent.position.set(-5, 6, 8);

    this.baseGroup.add(this.hemisphere, this.directional, this.fill, this.accent);

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x152030,
      roughness: 0.62,
      metalness: 0.18,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.baseGroup.add(this.ground);

    this.grid = new THREE.GridHelper(120, 60, 0x3a5a78, 0x1e3348);
    const gridMat = this.grid.material;
    if (Array.isArray(gridMat)) {
      for (const m of gridMat) {
        m.transparent = true;
        m.opacity = 0.4;
      }
    } else {
      gridMat.transparent = true;
      gridMat.opacity = 0.4;
    }
    this.baseGroup.add(this.grid);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(DEFAULT_TARGET);
    this.controls.minDistance = 2;
    this.controls.maxDistance = 80;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.enablePan = true;
    this.controls.update();

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  setEnvironmentStyle(style: EnvironmentStyle): void {
    switch (style) {
      case 'projectile':
        this.applyAmbience(0x071428, 0x142438, 0x0a1830, 0x6699cc, 0x1a2233, 0xff7043, 0.55);
        break;
      case 'pendulum':
        this.applyAmbience(0x0c1424, 0x1a2838, 0x121c2c, 0x88aacc, 0x222a38, 0x4fc3f7, 0.4);
        break;
      case 'spring':
        this.applyAmbience(0x100e24, 0x1e1838, 0x16122c, 0x9988cc, 0x2a2238, 0xab47bc, 0.45);
        break;
      default:
        this.applyAmbience(0x0a1528, 0x1a2838, 0x152030, 0x9ec8ef, 0x1c2736, 0x38bdf8, 0.45);
    }
  }

  resetCamera(): void {
    this.camera.position.copy(DEFAULT_CAMERA_POS);
    this.camera.fov = 45;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(DEFAULT_TARGET);
    this.controls.update();
  }

  /** Keep OrbitControls aligned after experiments move the camera programmatically. */
  syncCameraTarget(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
    this.controls.update();
  }

  getAspect(): number {
    return this.camera.aspect;
  }

  /** Public resize — call after layout changes (e.g. compare split). */
  resize(): void {
    this.handleResize();
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private applyAmbience(
    skyTop: number,
    skyBottom: number,
    fogColor: number,
    hemiSky: number,
    hemiGround: number,
    accent: number,
    accentIntensity: number,
  ): void {
    this.skyTexture.dispose();
    this.skyTexture = createSkyTexture(skyTop, skyBottom);
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.Fog(fogColor, 28, 110);
    this.hemisphere.color.setHex(hemiSky);
    this.hemisphere.groundColor.setHex(hemiGround);
    this.accent.color.setHex(accent);
    this.accent.intensity = accentIntensity;

    const groundMat = this.ground.material as THREE.MeshStandardMaterial;
    groundMat.color.setHex(skyBottom);
  }

  private handleResize(): void {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
