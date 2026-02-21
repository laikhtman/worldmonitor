# 03 — Input & Navigation: D-pad, Magic Remote, Spatial Focus

## 3.1 Input Modes on webOS

LG TVs support three input methods, all of which must work:

| Input | Device | Behavior | Priority |
|-------|--------|----------|----------|
| **D-pad** | Standard IR remote | Arrow keys + OK/Enter + Back | **P0** — must work perfectly |
| **Magic Remote** | LG pointer remote | Mouse-like cursor + click + scroll wheel | **P0** — primary remote on LG |
| **Keyboard** | USB/Bluetooth keyboard | Full keyboard (rarely used) | P2 — nice to have |

### Key Code Mapping (webOS)

```typescript
// src/utils/tv-remote.ts
export const TV_KEYS = {
  // Navigation
  UP:     38,    // ArrowUp
  DOWN:   40,    // ArrowDown
  LEFT:   37,    // ArrowLeft
  RIGHT:  39,    // ArrowRight
  OK:     13,    // Enter (select/click)
  BACK:   461,   // webOS Back button (also 8 = Backspace fallback)

  // Media controls
  PLAY:   415,
  PAUSE:  19,
  STOP:   413,
  FF:     417,   // Fast-forward
  REW:    412,   // Rewind

  // Color buttons
  RED:    403,
  GREEN:  404,
  YELLOW: 405,
  BLUE:   406,

  // Numeric
  NUM_0:  48,  NUM_1: 49,  NUM_2: 50,  NUM_3: 51,
  NUM_4:  52,  NUM_5: 53,  NUM_6: 54,  NUM_7: 55,
  NUM_8:  56,  NUM_9: 57,

  // Utility
  INFO:   457,
  GUIDE:  458,
  CH_UP:  33,    // PageUp
  CH_DOWN: 34,   // PageDown
} as const;
```

## 3.2 Spatial Navigation Engine

The biggest input challenge: converting our mouse/touch-based UI to D-pad navigation. This requires a **spatial navigation** system.

### Design: Focus Ring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Header Bar (focus-zone="header")                               │
│  [Live News] [Map] [Markets] [Insights] [Settings]              │
├──────────────────────┬──────────────────────────────────────────┤
│  Map Section         │  Panel (focus-zone="panel-1")            │
│  (focus-zone="map")  │  ┌──────────────────────────┐           │
│                      │  │ News Item 1 [focusable]  │           │
│  [zoom-in]           │  │ News Item 2 [focusable]  │           │
│  [zoom-out]          │  │ News Item 3 [focusable]  │           │
│  [layers-btn]        │  │ ...                      │           │
│                      │  └──────────────────────────┘           │
│                      ├──────────────────────────────────────────┤
│                      │  Panel (focus-zone="panel-2")            │
│                      │  ┌──────────────────────────┐           │
│                      │  │ Market Row 1 [focusable] │           │
│                      │  │ Market Row 2 [focusable] │           │
│                      │  └──────────────────────────┘           │
└──────────────────────┴──────────────────────────────────────────┘
```

### Focus Zone Hierarchy

```
document (root)
  ├── header-zone         (horizontal navigation: ← →)
  ├── map-zone            (special: D-pad pans map, OK clicks features)
  ├── panels-zone         (grid navigation: ← → between panels, ↑ ↓ within)
  │    ├── panel-0        (vertical scroll: ↑ ↓ through items)
  │    ├── panel-1
  │    ├── panel-2
  │    └── panel-3
  └── modal-zone          (traps focus when modal is open)
```

### Spatial Navigation Algorithm

```typescript
// src/utils/tv-focus.ts

interface FocusableElement {
  element: HTMLElement;
  rect: DOMRect;
  zone: string;
}

export class SpatialNavigator {
  private focusZones: Map<string, HTMLElement> = new Map();
  private currentFocus: HTMLElement | null = null;
  private currentZone: string = 'panels-zone';

  /** Register a focus zone container */
  registerZone(name: string, container: HTMLElement): void {
    this.focusZones.set(name, container);
    // Mark all interactive children as focusable
    this.markFocusable(container);
  }

  /** Mark all interactive elements within a container */
  private markFocusable(container: HTMLElement): void {
    const interactives = container.querySelectorAll(
      'a, button, [role="button"], .item, .market-row, .prediction-card, input, select'
    );
    interactives.forEach(el => {
      if (!el.hasAttribute('tabindex')) {
        (el as HTMLElement).tabIndex = 0;
      }
      el.classList.add('tv-focusable');
    });
  }

  /** Handle D-pad direction — find nearest focusable in direction */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.currentFocus) {
      this.focusFirst();
      return;
    }

    const currentRect = this.currentFocus.getBoundingClientRect();
    const candidates = this.getFocusableCandidates(direction, currentRect);

    if (candidates.length === 0) {
      // Try moving to adjacent zone
      this.moveToAdjacentZone(direction);
      return;
    }

    // Sort by distance and alignment
    candidates.sort((a, b) => {
      const distA = this.calculateDistance(currentRect, a.rect, direction);
      const distB = this.calculateDistance(currentRect, b.rect, direction);
      return distA - distB;
    });

    this.setFocus(candidates[0].element);
  }

  /** Calculate directional distance with alignment bonus */
  private calculateDistance(
    from: DOMRect, to: DOMRect, direction: string
  ): number {
    const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const toCenter = { x: to.left + to.width / 2, y: to.top + to.height / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    // Euclidean distance
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Alignment bonus: prefer elements that are well-aligned on the perpendicular axis
    let alignmentPenalty = 0;
    if (direction === 'up' || direction === 'down') {
      alignmentPenalty = Math.abs(dx) * 2; // Penalize horizontal misalignment
    } else {
      alignmentPenalty = Math.abs(dy) * 2; // Penalize vertical misalignment
    }

    return distance + alignmentPenalty;
  }

  /** Set focus with visual ring */
  private setFocus(element: HTMLElement): void {
    if (this.currentFocus) {
      this.currentFocus.classList.remove('tv-focused');
    }
    this.currentFocus = element;
    element.classList.add('tv-focused');
    element.focus({ preventScroll: true });

    // Scroll into view smoothly
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
```

## 3.3 Key Event Handler

```typescript
// src/utils/tv-remote.ts

import { TV_KEYS } from './tv-remote';
import type { SpatialNavigator } from './tv-focus';

export class TVRemoteHandler {
  private navigator: SpatialNavigator;
  private mapActive = false;

  constructor(navigator: SpatialNavigator) {
    this.navigator = navigator;
    document.addEventListener('keydown', this.handleKey.bind(this));
  }

  private handleKey(e: KeyboardEvent): void {
    const key = e.keyCode;

    switch (key) {
      case TV_KEYS.UP:
        e.preventDefault();
        if (this.mapActive) {
          // Pan map up
          this.panMap('up');
        } else {
          this.navigator.navigate('up');
        }
        break;

      case TV_KEYS.DOWN:
        e.preventDefault();
        if (this.mapActive) {
          this.panMap('down');
        } else {
          this.navigator.navigate('down');
        }
        break;

      case TV_KEYS.LEFT:
        e.preventDefault();
        if (this.mapActive) {
          this.panMap('left');
        } else {
          this.navigator.navigate('left');
        }
        break;

      case TV_KEYS.RIGHT:
        e.preventDefault();
        if (this.mapActive) {
          this.panMap('right');
        } else {
          this.navigator.navigate('right');
        }
        break;

      case TV_KEYS.OK:
        e.preventDefault();
        this.activateFocused();
        break;

      case TV_KEYS.BACK:
      case 8:  // Backspace fallback
        e.preventDefault();
        this.handleBack();
        break;

      // Color button quick actions
      case TV_KEYS.RED:
        this.toggleMapLayer('hotspots');
        break;
      case TV_KEYS.GREEN:
        this.toggleMapLayer('conflicts');
        break;
      case TV_KEYS.YELLOW:
        this.cycleMapView();
        break;
      case TV_KEYS.BLUE:
        this.openQuickSettings();
        break;

      // Channel up/down for panel switching
      case TV_KEYS.CH_UP:
        e.preventDefault();
        this.navigator.previousPanel();
        break;
      case TV_KEYS.CH_DOWN:
        e.preventDefault();
        this.navigator.nextPanel();
        break;

      // Info button for details
      case TV_KEYS.INFO:
        this.showInfoOverlay();
        break;
    }
  }

  private handleBack(): void {
    // Navigation stack: modal → popup → map-mode → panel → exit confirmation
    if (this.isModalOpen()) {
      this.closeTopModal();
    } else if (this.isPopupOpen()) {
      this.closePopup();
    } else if (this.mapActive) {
      this.mapActive = false;
      this.navigator.navigate('right'); // Move focus to panels
    } else {
      this.showExitConfirmation();
    }
  }
}
```

## 3.4 Map Navigation Mode

When the map has focus, the D-pad behavior changes:

| Key | Action | Details |
|-----|--------|---------|
| ↑↓←→ | Pan map | 100px per keypress, with acceleration on hold |
| OK | Click at center | Triggers popup for nearest feature |
| CH+/CH- | Zoom in/out | Step zoom levels |
| BACK | Exit map mode | Return focus to panels |
| RED/GREEN/YELLOW | Toggle layers | Quick layer toggles |

### Map Cursor Implementation

Since the map doesn't have a mouse cursor in D-pad mode, add a **virtual crosshair**:

```typescript
// In MapContainer or DeckGLMap
export function enableTVMapMode(map: maplibregl.Map): void {
  const crosshair = document.createElement('div');
  crosshair.className = 'tv-map-crosshair';
  crosshair.innerHTML = `
    <div class="crosshair-h"></div>
    <div class="crosshair-v"></div>
    <div class="crosshair-label"></div>
  `;
  map.getCanvasContainer().appendChild(crosshair);

  // Center crosshair always points to map center
  // OK button queries features at map center coordinates
}
```

## 3.5 Panel Scrolling with D-pad

Panels scroll vertically with ↑/↓. The scroll behavior must be adapted:

```typescript
// TV-specific scroll behavior
const TV_SCROLL_CONFIG = {
  scrollStep: 120,        // Pixels per D-pad press
  scrollAcceleration: 2,  // Multiplier when key is held
  maxScrollSpeed: 600,    // Cap for held key
  holdDelay: 400,         // ms before acceleration starts
  snapToItems: true,      // Snap to item boundaries
};
```

### Scroll Behavior
1. **Single press**: Scroll by one item height (snap to items)
2. **Key hold** (>400ms): Begin continuous scrolling with acceleration
3. **Release**: Decelerate and snap to nearest item boundary
4. **Focus follows**: Visual focus ring moves to the item closest to viewport center after scroll

## 3.6 Magic Remote (Pointer Mode)

The LG Magic Remote works like a mouse — it generates `mousemove`, `click`, `mousedown`, `mouseup`, `mouseenter`, `mouseleave` events. **Most of the existing UI already works** with the Magic Remote because:

- Panel scrolling uses standard scroll events ✅
- Map interaction uses MapLibre mouse handlers ✅
- Buttons have `:hover` styles ✅
- Click handlers work ✅

Special considerations:
- **Hover precision**: Magic Remote pointer is less precise than a mouse. Increase hover target sizes.
- **Scroll wheel**: Magic Remote has a scroll wheel. Panels already support wheel scroll ✅
- **No right-click**: Context menus must be accessible via long-press or alternative key.
- **Cursor hiding**: After 5s of inactivity, hide the system cursor and show focus ring (D-pad mode).

## 3.7 Focus Visual Styles

```css
/* src/styles/tv.css — Focus ring styles */

/* Global focus ring for TV mode */
.tv-focusable:focus,
.tv-focused {
  outline: 3px solid var(--accent, #44ff88) !important;
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(68, 255, 136, 0.3);
  transition: outline-color 0.15s, box-shadow 0.15s;
}

/* Suppress default browser focus styles on TV */
body.tv-mode *:focus:not(.tv-focused) {
  outline: none;
}

/* Map crosshair */
.tv-map-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100;
}

.tv-map-crosshair .crosshair-h,
.tv-map-crosshair .crosshair-v {
  position: absolute;
  background: rgba(68, 255, 136, 0.6);
}

.tv-map-crosshair .crosshair-h {
  width: 40px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.tv-map-crosshair .crosshair-v {
  width: 2px;
  height: 40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

## 3.8 Existing Keyboard Handling Compatibility

The app currently has these keyboard handlers:

| Component | Binding | TV Mapping |
|-----------|---------|------------|
| `ui-setup.ts` | `Ctrl+K` (search) | **BLUE button** → open search |
| `MapPopup.ts` | `Escape` (close popup) | **BACK button** → close popup |
| `CountryIntelModal.ts` | `Escape` (close modal) | **BACK button** → close modal |
| `CountryBriefPage.ts` | `Escape` (close) | **BACK button** → close |
| `SearchModal.ts` | `ArrowUp/Down` (navigate results) | **Works natively** with D-pad ✅ |
| `LiveNewsPanel.ts` | Activity tracking (keydown) | **Works** — same events ✅ |

### Migration Strategy

The existing `boundKeydownHandler` in `AppContext` can be extended:

```typescript
// In ui-setup.ts — wrap existing handler
const originalHandler = this.ctx.boundKeydownHandler;
this.ctx.boundKeydownHandler = (e: KeyboardEvent) => {
  // TV-specific handling first
  if (IS_TV && tvRemoteHandler.handleKey(e)) return;
  // Fall through to existing keyboard shortcuts
  originalHandler?.(e);
};
```
