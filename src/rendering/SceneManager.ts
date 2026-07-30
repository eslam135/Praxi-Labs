/**
 * SceneManager — shared Three.js scene, camera, lights, and renderer.
 *
 * Role: Owns the WebGL renderer and persistent base environment (not cleared on experiment switch).
 * Connections: Used by main.ts; experiments add objects to context.root group.
 * Extension: Call setEnvironmentStyle() for per-experiment ambience tweaks.
 */
import * as THREE from 'three';

export type EnvironmentStyle = 'default' | 'projectile' | 'pendulum' | 'spring';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly baseGroup: THREE.Group;

  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private hemisphere: THREE.HemisphereLight;
  private directional: THREE.DirectionalLight;
  private accent: THREE.PointLight;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.baseGroup = new THREE.Group();
    this.scene.add(this.baseGroup);

    this.scene.background = new THREE.Color(0x0c1220);
    this.scene.fog = new THREE.Fog(0x0c1220, 30, 120);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    this.camera.position.set(0, 4, 10);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.hemisphere = new THREE.HemisphereLight(0x88bbee, 0x223344, 0.6);
    this.directional = new THREE.DirectionalLight(0xfff5e6, 1.1);
    this.directional.position.set(8, 14, 6);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 80;
    this.directional.shadow.camera.left = -30;
    this.directional.shadow.camera.right = 30;
    this.directional.shadow.camera.top = 30;
    this.directional.shadow.camera.bottom = -30;

    this.accent = new THREE.PointLight(0x38bdf8, 0.5, 40);
    this.accent.position.set(-5, 6, 8);

    this.baseGroup.add(this.hemisphere, this.directional, this.accent);

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2838,
      roughness: 0.85,
      metalness: 0.1,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.baseGroup.add(this.ground);

    this.grid = new THREE.GridHelper(200, 80, 0x2a4a66, 0x1a2a3a);
    this.baseGroup.add(this.grid);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  setEnvironmentStyle(style: EnvironmentStyle): void {
    switch (style) {
      case 'projectile':
        this.scene.background = new THREE.Color(0x0a1628);
        this.scene.fog = new THREE.Fog(0x0a1628, 40, 150);
        this.hemisphere.color.setHex(0x6699cc);
        this.hemisphere.groundColor.setHex(0x1a2233);
        this.accent.color.setHex(0xff7043);
        this.accent.intensity = 0.6;
        break;
      case 'pendulum':
        this.scene.background = new THREE.Color(0x101828);
        this.scene.fog = new THREE.Fog(0x101828, 20, 60);
        this.hemisphere.color.setHex(0x88aacc);
        this.hemisphere.groundColor.setHex(0x222a38);
        this.accent.color.setHex(0x4fc3f7);
        this.accent.intensity = 0.4;
        break;
      case 'spring':
        this.scene.background = new THREE.Color(0x12102a);
        this.scene.fog = new THREE.Fog(0x12102a, 20, 60);
        this.hemisphere.color.setHex(0x9988cc);
        this.hemisphere.groundColor.setHex(0x2a2238);
        this.accent.color.setHex(0xab47bc);
        this.accent.intensity = 0.45;
        break;
      default:
        this.scene.background = new THREE.Color(0x0c1220);
        this.scene.fog = new THREE.Fog(0x0c1220, 30, 120);
        this.hemisphere.color.setHex(0x88bbee);
        this.hemisphere.groundColor.setHex(0x223344);
        this.accent.color.setHex(0x38bdf8);
        this.accent.intensity = 0.5;
    }
  }

  resetCamera(): void {
    this.camera.position.set(0, 4, 10);
    this.camera.fov = 45;
    this.camera.lookAt(0, 1, 0);
    this.camera.updateProjectionMatrix();
  }

  getAspect(): number {
    return this.camera.aspect;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
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
