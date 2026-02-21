/**
 * SpatialNavigator — D-pad spatial navigation engine for TV variant.
 *
 * Manages focus zones (header, map, panels, modals), tracks the currently
 * focused element, and resolves the "nearest focusable in direction"
 * algorithm used by the D-pad arrow keys.
 *
 * Focus zones form a hierarchy:
 *   root
 *     ├── header-zone    (horizontal: ← →)
 *     ├── map-zone       (special: D-pad pans map, OK clicks)
 *     ├── panels-zone    (vertical + cross-panel: ↑↓ within, ←→ between)
 *     │   ├── panel-0    (vertical scroll)
 *     │   └── panel-1
 *     └── modal-zone     (focus trap when modal is open)
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface FocusZone {
  /** Unique name, e.g. 'header', 'map', 'panel-0', 'modal' */
  name: string;
  /** Container element for this zone */
  container: HTMLElement;
  /** How focus moves within this zone: 'horizontal' | 'vertical' | 'grid' | 'trap' */
  mode: 'horizontal' | 'vertical' | 'grid' | 'trap';
  /** Priority for focus — higher traps focus (modals) */
  priority: number;
  /** Parent zone name — used for cross-zone navigation */
  parent?: string;
  /** Ordered list of adjacent zone names per direction */
  adjacentZones?: Partial<Record<Direction, string>>;
}

export interface FocusableCandidate {
  element: HTMLElement;
  rect: DOMRect;
  zone: string;
}

/**
 * CSS selector for interactive elements that should be focusable.
 * Elements matching this within a zone get tabindex=0 if not already set.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="link"]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '.news-item',
  '.market-item',
  '.prediction-card',
  '.monitor-card',
  '.layer-toggle',
  '.header-tab',
  '.risk-row',
  '.insight-card',
  '[data-tv-focusable]',
].join(', ');

/* ------------------------------------------------------------------ */
/*  Scroll configuration                                               */
/* ------------------------------------------------------------------ */

export const TV_SCROLL_CONFIG = {
  /** Pixels per single D-pad press (unused if snap-to-item enabled) */
  scrollStep: 120,
  /** Multiplier when key is held */
  scrollAcceleration: 2,
  /** Cap for held-key scroll speed */
  maxScrollSpeed: 600,
  /** ms before hold acceleration kicks in */
  holdDelay: 400,
  /** Snap to item boundaries after scroll */
  snapToItems: true,
} as const;

/* ------------------------------------------------------------------ */
/*  SpatialNavigator                                                   */
/* ------------------------------------------------------------------ */

export class SpatialNavigator {
  private zones = new Map<string, FocusZone>();
  private currentFocus: HTMLElement | null = null;
  private currentZone: string = 'panels-zone';
  private focusHistory: HTMLElement[] = [];
  private _onZoneChange?: (zone: string) => void;
  private _onFocusChange?: (el: HTMLElement | null, zone: string) => void;
  /** MutationObserver watching for DOM changes inside zones */
  private observers = new Map<string, MutationObserver>();

  /* ================================================================ */
  /*  Zone registration                                                */
  /* ================================================================ */

  /**
   * Register a focus zone. All matching interactive children are auto-marked
   * with `tabindex` and the `tv-focusable` class.
   */
  registerZone(zone: FocusZone): void {
    this.zones.set(zone.name, zone);
    this.markFocusable(zone.container);
    this.observeZone(zone);
  }

  /** Remove a zone (e.g. when a modal is destroyed). */
  unregisterZone(name: string): void {
    this.observers.get(name)?.disconnect();
    this.observers.delete(name);
    this.zones.delete(name);
    // If we were focused inside removed zone, fall back
    if (this.currentZone === name) {
      this.focusFirst('panels-zone');
    }
  }

  /* ================================================================ */
  /*  Focus control                                                    */
  /* ================================================================ */

  /** Move focus in the given direction. */
  navigate(direction: Direction): void {
    // If a trap zone (modal) is active, navigate only within it
    const trapZone = this.getActiveTrap();
    if (trapZone) {
      this.navigateWithin(trapZone.name, direction);
      return;
    }

    if (!this.currentFocus) {
      this.focusFirst();
      return;
    }

    const currentRect = this.currentFocus.getBoundingClientRect();
    const zoneName = this.currentZone;
    const zone = this.zones.get(zoneName);

    // 1. Try to find next focusable within the same zone
    const sameCandidates = this.getCandidatesInZone(zoneName, direction, currentRect);
    const firstCandidate = sameCandidates[0];
    if (firstCandidate) {
      this.setFocus(firstCandidate.element, zoneName);
      return;
    }

    // 2. Try adjacent zone as configured
    const adjacent = zone?.adjacentZones?.[direction];
    if (adjacent && this.zones.has(adjacent)) {
      this.moveToZone(adjacent, direction);
      return;
    }

    // 3. Try automatic cross-zone navigation via geometry
    this.moveToAdjacentZoneAuto(direction, currentRect);
  }

  /** Focus the first item in a zone (or the default zone). */
  focusFirst(zoneName?: string): void {
    const name = zoneName ?? this.getDefaultZoneName();
    const zone = this.zones.get(name);
    if (!zone) return;

    const items = this.getFocusableChildren(zone.container);
    const first = items[0];
    if (first) {
      this.setFocus(first, name);
    }
  }

  /** Focus the last item in a zone. */
  focusLast(zoneName: string): void {
    const zone = this.zones.get(zoneName);
    if (!zone) return;

    const items = this.getFocusableChildren(zone.container);
    const last = items[items.length - 1];
    if (last) {
      this.setFocus(last, zoneName);
    }
  }

  /** Programmatically set focus to a specific element. */
  setFocus(element: HTMLElement, zoneName?: string): void {
    // Remove current focus styling
    if (this.currentFocus) {
      this.currentFocus.classList.remove('tv-focused');
      this.currentFocus.removeAttribute('data-tv-focused');
    }

    const zone = zoneName ?? this.findZoneForElement(element);
    this.currentFocus = element;
    if (zone && zone !== this.currentZone) {
      this.currentZone = zone;
      this._onZoneChange?.(zone);
    }

    element.classList.add('tv-focused');
    element.setAttribute('data-tv-focused', 'true');
    element.focus({ preventScroll: true });

    // Scroll into view smoothly
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    this._onFocusChange?.(element, this.currentZone);
  }

  /** Remove all focus (e.g. when entering map mode). */
  clearFocus(): void {
    if (this.currentFocus) {
      this.currentFocus.classList.remove('tv-focused');
      this.currentFocus.removeAttribute('data-tv-focused');
      this.currentFocus = null;
    }
    this._onFocusChange?.(null, this.currentZone);
  }

  /** Push current focus onto history stack (for BACK navigation). */
  pushFocusHistory(): void {
    if (this.currentFocus) {
      this.focusHistory.push(this.currentFocus);
    }
  }

  /** Pop and restore previous focus from history. Returns true if restored. */
  popFocusHistory(): boolean {
    const prev = this.focusHistory.pop();
    if (prev && document.body.contains(prev)) {
      const zone = this.findZoneForElement(prev);
      this.setFocus(prev, zone ?? undefined);
      return true;
    }
    return false;
  }

  /** Get the currently focused element. */
  getCurrentFocus(): HTMLElement | null {
    return this.currentFocus;
  }

  /** Get the currently active zone name. */
  getCurrentZone(): string {
    return this.currentZone;
  }

  /* ================================================================ */
  /*  Panel navigation helpers                                         */
  /* ================================================================ */

  /** Move focus to the next panel in the panels zone. */
  nextPanel(): void {
    this.switchPanel(1);
  }

  /** Move focus to the previous panel in the panels zone. */
  previousPanel(): void {
    this.switchPanel(-1);
  }

  /** Refresh focusable children in a zone (call after dynamic content updates). */
  refreshZone(zoneName: string): void {
    const zone = this.zones.get(zoneName);
    if (zone) {
      this.markFocusable(zone.container);
    }
  }

  /* ================================================================ */
  /*  Event callbacks                                                  */
  /* ================================================================ */

  onZoneChange(callback: (zone: string) => void): void {
    this._onZoneChange = callback;
  }

  onFocusChange(callback: (el: HTMLElement | null, zone: string) => void): void {
    this._onFocusChange = callback;
  }

  /* ================================================================ */
  /*  Query helpers                                                    */
  /* ================================================================ */

  /** Check if a given zone exists and has focusable children. */
  hasZone(name: string): boolean {
    const zone = this.zones.get(name);
    if (!zone) return false;
    return this.getFocusableChildren(zone.container).length > 0;
  }

  /** Get all panel zone names in DOM order. */
  getPanelZoneNames(): string[] {
    return Array.from(this.zones.keys()).filter(n => n.startsWith('panel-'));
  }

  /* ================================================================ */
  /*  Cleanup                                                          */
  /* ================================================================ */

  destroy(): void {
    this.observers.forEach(o => o.disconnect());
    this.observers.clear();
    this.zones.clear();
    this.clearFocus();
    this.focusHistory = [];
  }

  /* ================================================================ */
  /*  Private — direction-based candidate finding                      */
  /* ================================================================ */

  /**
   * Get focusable candidates within a zone that lie in the given direction
   * relative to `fromRect`. Sorted by directional distance.
   */
  private getCandidatesInZone(
    zoneName: string,
    direction: Direction,
    fromRect: DOMRect,
  ): FocusableCandidate[] {
    const zone = this.zones.get(zoneName);
    if (!zone) return [];

    const items = this.getFocusableChildren(zone.container);
    const candidates: FocusableCandidate[] = [];

    for (const el of items) {
      if (el === this.currentFocus) continue;
      const rect = el.getBoundingClientRect();
      if (!this.isInDirection(fromRect, rect, direction)) continue;
      candidates.push({ element: el, rect, zone: zoneName });
    }

    candidates.sort((a, b) =>
      this.calculateDistance(fromRect, a.rect, direction) -
      this.calculateDistance(fromRect, b.rect, direction),
    );

    return candidates;
  }

  /**
   * Navigate within a specific zone (used for trap/modal zones).
   * Wraps focus at boundaries.
   */
  private navigateWithin(zoneName: string, direction: Direction): void {
    const zone = this.zones.get(zoneName);
    if (!zone) return;

    const items = this.getFocusableChildren(zone.container);
    if (items.length === 0) return;

    const current = this.currentFocus;
    const idx = current ? items.indexOf(current) : -1;

    let next: HTMLElement | undefined;

    if (zone.mode === 'vertical') {
      if (direction === 'down') next = items[idx + 1] ?? items[0];
      else if (direction === 'up') next = items[idx - 1] ?? items[items.length - 1];
    } else if (zone.mode === 'horizontal') {
      if (direction === 'right') next = items[idx + 1] ?? items[0];
      else if (direction === 'left') next = items[idx - 1] ?? items[items.length - 1];
    } else {
      // grid or trap — use spatial distance
      if (!current) {
        next = items[0];
      } else {
        const fromRect = current.getBoundingClientRect();
        const candidates = items
          .filter(el => el !== current && this.isInDirection(fromRect, el.getBoundingClientRect(), direction))
          .sort((a, b) =>
            this.calculateDistance(fromRect, a.getBoundingClientRect(), direction) -
            this.calculateDistance(fromRect, b.getBoundingClientRect(), direction),
          );
        next = candidates[0] ?? (direction === 'down' || direction === 'right' ? items[0] : items[items.length - 1]);
      }
    }

    if (next) {
      this.setFocus(next, zoneName);
    }
  }

  /** Move focus into a named zone, focusing the nearest edge item. */
  private moveToZone(zoneName: string, fromDirection: Direction): void {
    const zone = this.zones.get(zoneName);
    if (!zone) return;

    const items = this.getFocusableChildren(zone.container);
    if (items.length === 0) return;

    // Focus the item closest to the entry edge
    const target = fromDirection === 'down' || fromDirection === 'right'
      ? items[0] : items[items.length - 1];
    if (target) {
      this.setFocus(target, zoneName);
    }
  }

  /** Auto-detect adjacent zone using bounding-box geometry. */
  private moveToAdjacentZoneAuto(direction: Direction, fromRect: DOMRect): void {
    const currentZoneName = this.currentZone;
    let bestCandidate: FocusableCandidate | null = null;
    let bestDist = Infinity;

    for (const [name, zone] of this.zones) {
      if (name === currentZoneName) continue;
      // Skip trap zones when navigating outside
      if (zone.priority > 0) continue;

      const containerRect = zone.container.getBoundingClientRect();
      if (!this.isInDirection(fromRect, containerRect, direction)) continue;

      const dist = this.calculateDistance(fromRect, containerRect, direction);
      if (dist < bestDist) {
        const items = this.getFocusableChildren(zone.container);
        if (items.length === 0) continue;

        // Pick the nearest item from the entry edge
        const entry = direction === 'down' || direction === 'right' ? items[0] : items[items.length - 1];
        if (!entry) continue;
        bestDist = dist;
        bestCandidate = { element: entry, rect: entry.getBoundingClientRect(), zone: name };
      }
    }

    if (bestCandidate) {
      this.setFocus(bestCandidate.element, bestCandidate.zone);
    }
  }

  /** Switch to an adjacent panel in the panels grid */
  private switchPanel(delta: number): void {
    const panelNames = this.getPanelZoneNames();
    if (panelNames.length === 0) return;

    const currentIdx = panelNames.indexOf(this.currentZone);
    const nextIdx = currentIdx === -1
      ? 0
      : Math.max(0, Math.min(panelNames.length - 1, currentIdx + delta));

    if (nextIdx !== currentIdx || currentIdx === -1) {
      this.focusFirst(panelNames[nextIdx]);
    }
  }

  /* ================================================================ */
  /*  Private — geometry helpers                                       */
  /* ================================================================ */

  /** Check if `to` rectangle is in the given direction from `from`. */
  private isInDirection(from: DOMRect, to: DOMRect, direction: Direction): boolean {
    const fromCenterX = from.left + from.width / 2;
    const fromCenterY = from.top + from.height / 2;
    const toCenterX = to.left + to.width / 2;
    const toCenterY = to.top + to.height / 2;

    switch (direction) {
      case 'up':    return toCenterY < fromCenterY;
      case 'down':  return toCenterY > fromCenterY;
      case 'left':  return toCenterX < fromCenterX;
      case 'right': return toCenterX > fromCenterX;
    }
  }

  /**
   * Directional distance with alignment penalty.
   * Prefers elements that are well-aligned on the perpendicular axis.
   */
  private calculateDistance(from: DOMRect, to: DOMRect, direction: Direction): number {
    const fromCenter = {
      x: from.left + from.width / 2,
      y: from.top + from.height / 2,
    };
    const toCenter = {
      x: to.left + to.width / 2,
      y: to.top + to.height / 2,
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // Penalise perpendicular misalignment so we prefer elements in a straight line
    let alignmentPenalty: number;
    if (direction === 'up' || direction === 'down') {
      alignmentPenalty = Math.abs(dx) * 2;
    } else {
      alignmentPenalty = Math.abs(dy) * 2;
    }

    return distance + alignmentPenalty;
  }

  /* ================================================================ */
  /*  Private — DOM helpers                                            */
  /* ================================================================ */

  /** Get all focusable children inside a container, in DOM order. */
  private getFocusableChildren(container: HTMLElement): HTMLElement[] {
    const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(nodes).filter(el => {
      // Filter out hidden / zero-size elements
      if (el.offsetParent === null && el.style.position !== 'fixed') return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.hasAttribute('disabled')) return false;
      return true;
    });
  }

  /** Mark all interactive elements within a container as focusable. */
  private markFocusable(container: HTMLElement): void {
    const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    nodes.forEach(el => {
      if (!el.hasAttribute('tabindex')) {
        el.tabIndex = 0;
      }
      el.classList.add('tv-focusable');
    });
  }

  /** Find which zone an element belongs to. */
  private findZoneForElement(element: HTMLElement): string | null {
    for (const [name, zone] of this.zones) {
      if (zone.container.contains(element)) return name;
    }
    return null;
  }

  /** Get the default zone to focus (first registered non-trap zone). */
  private getDefaultZoneName(): string {
    for (const [name, zone] of this.zones) {
      if (zone.priority === 0 && this.getFocusableChildren(zone.container).length > 0) {
        return name;
      }
    }
    return this.zones.keys().next().value ?? 'panels-zone';
  }

  /** Get the highest-priority active trap zone (modal). */
  private getActiveTrap(): FocusZone | null {
    let best: FocusZone | null = null;
    for (const zone of this.zones.values()) {
      if (zone.priority > 0 && (!best || zone.priority > best.priority)) {
        best = zone;
      }
    }
    return best;
  }

  /** Observe a zone for child mutations to auto-mark new focusable elements. */
  private observeZone(zone: FocusZone): void {
    const observer = new MutationObserver(() => {
      this.markFocusable(zone.container);
    });
    observer.observe(zone.container, { childList: true, subtree: true });
    this.observers.set(zone.name, observer);
  }
}
