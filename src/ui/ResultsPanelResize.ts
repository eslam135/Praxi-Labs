/**
 * ResultsPanelResize — drag handle to resize the right results column.
 *
 * Role: Updates --panel-width-results CSS variable; notifies listeners so the graph
 * canvas and Three.js viewport can reflow.
 * Connections: Wired from main.ts; persists width in localStorage.
 * Extension: Mirror for the left params panel if needed.
 */
const STORAGE_KEY = 'praxi-results-panel-width';
const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 340;
/** Keep enough room for params + a usable 3D viewport when growing left. */
const MIN_VIEWPORT_WIDTH = 240;

export type ResizeListener = () => void;

export class ResultsPanelResize {
  private handle: HTMLElement;
  private appBody: HTMLElement;
  private listeners: ResizeListener[] = [];
  private dragging = false;

  constructor(resultsPanel: HTMLElement, appBody: HTMLElement) {
    this.appBody = appBody;

    this.handle = document.createElement('div');
    this.handle.className = 'panel-resize-handle';
    this.handle.title = 'Drag to resize';
    this.handle.setAttribute('role', 'separator');
    this.handle.setAttribute('aria-orientation', 'vertical');
    this.handle.tabIndex = 0;
    resultsPanel.prepend(this.handle);

    const saved = Number(localStorage.getItem(STORAGE_KEY));
    this.applyWidth(Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_WIDTH);

    this.handle.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
    this.handle.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onResize(listener: ResizeListener): void {
    this.listeners.push(listener);
  }

  private maxAllowedWidth(): number {
    const paramsWidth =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--panel-width-params'),
      ) || 260;
    const available = this.appBody.getBoundingClientRect().width - paramsWidth - MIN_VIEWPORT_WIDTH;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, available));
  }

  private applyWidth(width: number): void {
    const clamped = Math.min(this.maxAllowedWidth(), Math.max(MIN_WIDTH, Math.round(width)));
    document.documentElement.style.setProperty('--panel-width-results', `${clamped}px`);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    for (const listener of this.listeners) listener();
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.dragging = true;
    this.handle.setPointerCapture(e.pointerId);
    document.body.classList.add('is-resizing-panel');
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    // Distance from cursor to the right edge of the app = results column width.
    // Dragging the handle left grows the panel into the viewport (not past the window).
    const bodyRect = this.appBody.getBoundingClientRect();
    const width = bodyRect.right - e.clientX;
    this.applyWidth(width);
  }

  private onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    document.body.classList.remove('is-resizing-panel');
  }

  private onKeyDown(e: KeyboardEvent): void {
    const current = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--panel-width-results'),
    ) || DEFAULT_WIDTH;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.applyWidth(current + 16);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.applyWidth(current - 16);
    }
  }
}
