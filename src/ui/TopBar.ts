/**
 * TopBar — brand-only application header.
 *
 * Role: Catchy product identity; no experiment or transport controls.
 * Connections: Brand container in index.html; experiment name via setExperimentName.
 * Extension: Keep controls out of the header — use SessionControls in the left panel.
 */
export interface TopBarOptions {
  brandContainer: HTMLElement;
}

export class TopBar {
  private activeEl: HTMLElement;

  constructor(options: TopBarOptions) {
    const brand = document.createElement('div');
    brand.className = 'brand';

    const mark = document.createElement('div');
    mark.className = 'brand__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML =
      '<svg viewBox="0 0 32 32" width="28" height="28" fill="none">' +
      '<circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>' +
      '<circle cx="16" cy="16" r="5" fill="currentColor"/>' +
      '<circle cx="16" cy="4" r="2.2" fill="currentColor"/>' +
      '<path d="M16 16 L16 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>';

    const text = document.createElement('div');
    text.className = 'brand__text';

    const title = document.createElement('h1');
    title.className = 'brand__name';
    title.innerHTML = '<span class="brand__praxi">Praxi</span><span class="brand__lab"> Physics Lab</span>';

    const tagline = document.createElement('p');
    tagline.className = 'brand__tagline';
    tagline.textContent = 'See the equations move';

    this.activeEl = document.createElement('span');
    this.activeEl.className = 'brand__active';
    this.activeEl.textContent = '';

    text.appendChild(title);
    text.appendChild(tagline);

    brand.appendChild(mark);
    brand.appendChild(text);
    brand.appendChild(this.activeEl);
    options.brandContainer.appendChild(brand);
  }

  setExperimentName(name: string): void {
    this.activeEl.textContent = name;
  }
}
