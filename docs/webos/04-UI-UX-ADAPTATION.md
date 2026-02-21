# 04 — UI/UX Adaptation: 10-Foot Experience

## 4.1 The 10-Foot Problem

TV viewers sit **8–12 feet** (2.5–3.5 meters) from the screen. At this distance:

| Element | Desktop Size | TV Size (minimum) | Scale Factor |
|---------|-------------|-------------------|--------------|
| Body text | 12–14px | 24–28px | **2×** |
| Panel headers | 11–13px | 22–26px | **2×** |
| News headlines | 13–15px | 26–32px | **2×** |
| Button labels | 12–14px | 24–28px | **2×** |
| Icon size | 14–16px | 28–36px | **2×** |
| Minimum tap target | 32×32px | 48×48px | **1.5×** |
| Click/focus target | Any size | 44×44px minimum | — |

## 4.2 TV Safe Zone

TV displays may overscan (crop edges). All UI must stay within the **safe zone**:

```
┌──────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  OVERSCAN AREA  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓  ┌──────────────────────────────────────────┐  ▓  │
│ ▓  │                                          │  ▓  │
│ ▓  │           SAFE ZONE (90%)                │  ▓  │
│ ▓  │       All interactive content            │  ▓  │
│ ▓  │       must be within this area           │  ▓  │
│ ▓  │                                          │  ▓  │
│ ▓  │                                          │  ▓  │
│ ▓  └──────────────────────────────────────────┘  ▓  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────────────────────────────┘
```

**Safe margins**: 5% on all sides (96px horizontal, 54px vertical at 1080p)

```css
/* src/styles/tv.css — Safe zone */
body.tv-mode #app {
  padding: 54px 96px; /* 5% of 1920×1080 */
  box-sizing: border-box;
  overflow: hidden;
}

/* Background/decorative content can extend to edges */
body.tv-mode .map-section {
  /* Map can bleed to edges for visual impact */
  margin: -54px -96px;
  padding: 54px 96px;
}
```

## 4.3 Layout: TV Grid

The desktop layout uses `auto-fill, minmax(280px, 1fr)` grid for panels. On TV, switch to a **fixed 2-column** layout with fewer visible panels.

### Proposed TV Layout

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: [IntelHQ] [Live News] [Map] [Markets] [Insights] [⚙] │
├────────────────────────┬───────────────────────────────────────┤
│                        │  Panel 1: Live News                   │
│                        │  ┌─────────────────────────────────┐  │
│    MAP (60%)           │  │ Breaking alert...               │  │
│    3D Globe            │  │ Reuters: Story headline...      │  │
│    (MapLibre+deck.gl)  │  │ AP: Another headline...         │  │
│                        │  │ ...                             │  │
│                        │  └─────────────────────────────────┘  │
│                        ├───────────────────────────────────────┤
│                        │  Panel 2: Markets                     │
│                        │  ┌─────────────────────────────────┐  │
│    Quick Info Bar:     │  │ S&P 500  ▲ 0.4%  5,832         │  │
│    [Region] [Zoom]     │  │ NASDAQ   ▼ 0.1%  18,203        │  │
│    [Layers] [Time]     │  │ Oil WTI  ▲ 1.2%  $78.40        │  │
│                        │  └─────────────────────────────────┘  │
├────────────────────────┴───────────────────────────────────────┤
│  FOOTER: [🔴 RED=Hotspots] [🟢 GREEN=Conflicts] [🟡 YELLOW=  │
│          View] [🔵 BLUE=Settings]  •  Last update: 2min ago   │
└────────────────────────────────────────────────────────────────┘
```

### CSS Implementation

```css
/* src/styles/tv.css — TV layout */
body.tv-mode .main-content {
  display: grid;
  grid-template-columns: 60% 40%;
  grid-template-rows: 1fr;
  height: calc(100vh - 54px - 54px - 48px - 40px); /* minus safe zone + header + footer */
  gap: 8px;
  overflow: hidden;
}

body.tv-mode .map-section {
  grid-column: 1;
  grid-row: 1;
  height: 100%;
  min-height: unset;
}

body.tv-mode .panels-grid {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* Only show configured number of panels */
body.tv-mode .panel:nth-child(n+3) {
  display: none;
}

body.tv-mode .panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* Panels fill available space evenly */
body.tv-mode .panel:first-child {
  flex: 2; /* News panel gets more space */
}
```

## 4.4 Typography Scale

```css
/* src/styles/tv.css — Typography */
body.tv-mode {
  font-size: 24px;
  line-height: 1.5;
}

body.tv-mode .header {
  height: 48px;
  font-size: 20px;
}

body.tv-mode .panel-title {
  font-size: 22px;
  letter-spacing: 1px;
}

body.tv-mode .item-title {
  font-size: 26px;
  line-height: 1.4;
}

body.tv-mode .item-source {
  font-size: 16px;
}

body.tv-mode .stat-value {
  font-size: 32px;
  font-weight: bold;
}

body.tv-mode .stat-label {
  font-size: 18px;
}

body.tv-mode .market-row {
  font-size: 22px;
  padding: 12px 16px;
  min-height: 48px;
}

body.tv-mode .prediction-card {
  font-size: 20px;
  padding: 16px;
}

/* Alert tags scale up */
body.tv-mode .alert-tag {
  font-size: 14px;
  padding: 3px 8px;
}

/* Timestamps */
body.tv-mode .time-ago {
  font-size: 16px;
}
```

## 4.5 Color & Contrast for TV

TV display characteristics differ from monitors:
- **Lower gamma range**: Blacks are less deep, whites are more blown out
- **Viewing angle**: No concern (everyone faces center)
- **Ambient light**: Often in dim room (living room) — good for dark theme
- **Color saturation**: TV panels tend to be more saturated

### Adjustments

```css
body.tv-mode {
  /* Slightly increase contrast of dim text for TV viewing distance */
  --text-dim: #999;          /* Was #666 — needs to be brighter on TV */
  --text-secondary: #bbb;   /* Was #888 */
  --border: #333;            /* Was #2a2a2a — slightly more visible */

  /* Maintain existing dark theme colors — they work well on TV */
  --bg: #0a0a0a;
  --bg-panel: #141414;
  --accent: #44ff88;
  --red: #ff4444;
}
```

## 4.6 Header Bar (TV-Adapted)

The desktop header is compact (40px). On TV, expand for readability and add color button hints:

```typescript
// src/components/TVOverlay.ts
export class TVOverlay {
  private footer: HTMLElement;

  constructor(parent: HTMLElement) {
    this.footer = document.createElement('div');
    this.footer.className = 'tv-footer';
    this.footer.innerHTML = `
      <div class="tv-footer-hints">
        <span class="tv-hint tv-hint-red">● Hotspots</span>
        <span class="tv-hint tv-hint-green">● Conflicts</span>
        <span class="tv-hint tv-hint-yellow">● Views</span>
        <span class="tv-hint tv-hint-blue">● Settings</span>
      </div>
      <div class="tv-footer-status">
        <span class="tv-status-time"></span>
        <span class="tv-status-update">Updated just now</span>
      </div>
    `;
    parent.appendChild(this.footer);
  }

  updateStatus(lastUpdate: Date): void {
    const timeEl = this.footer.querySelector('.tv-status-time');
    const updateEl = this.footer.querySelector('.tv-status-update');
    if (timeEl) timeEl.textContent = lastUpdate.toLocaleTimeString();
    if (updateEl) {
      const ago = Math.round((Date.now() - lastUpdate.getTime()) / 60000);
      updateEl.textContent = ago < 1 ? 'Updated just now' : `Updated ${ago}min ago`;
    }
  }
}
```

## 4.7 Panel Simplifications

Some panels need simplification for TV:

### Panel Base Class Changes

```typescript
// Panel.ts — TV-specific overrides
if (IS_TV) {
  // Disable drag-to-reorder
  this.element.draggable = false;

  // Disable panel resize handle
  this.resizeHandle?.remove();

  // Increase scroll snap
  this.element.style.scrollSnapType = 'y mandatory';
}
```

### News Panel Adaptations

| Change | Reason |
|--------|--------|
| Remove source favicon images | Reduce HTTP requests |
| Increase line spacing | Readability at distance |
| Show max 20 items | Memory + performance |
| Larger alert badges | Visibility |
| Remove hover tooltips | D-pad has no hover state |
| Add focus highlight | D-pad navigation |

### Market Panel Adaptations

| Change | Reason |
|--------|--------|
| Increase row height to 48px+ | Focus target size |
| Enlarge sparkline charts | Visibility |
| Show fewer symbols (top 10) | Screen space |
| Remove mini-charts hover | No hover on D-pad |

### Map Popup Adaptations

```css
body.tv-mode .map-popup {
  /* Center popup in viewport instead of positioning at clicked point */
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 60vh;
  font-size: 20px;
  z-index: 1000;
}

body.tv-mode .map-popup .popup-close {
  width: 40px;
  height: 40px;
  font-size: 24px;
}
```

## 4.8 Modal Adaptations

Modals (CountryIntelModal, SearchModal, StoryModal) need TV treatment:

```css
body.tv-mode .modal-overlay {
  /* Center with constrained width */
  display: flex;
  align-items: center;
  justify-content: center;
}

body.tv-mode .modal-content {
  width: 70vw;
  max-height: 80vh;
  font-size: 22px;
  padding: 32px;
}

body.tv-mode .modal-close {
  width: 48px;
  height: 48px;
  font-size: 28px;
}
```

## 4.9 Disabled UI Features on TV

| Feature | Reason | User-Facing Change |
|---------|--------|-------------------|
| Panel drag-and-drop reorder | No drag on D-pad | CH+/CH- to switch panels |
| Panel resize handles | Fixed layout | Removed |
| Multi-panel grid layout | Screen space | 2 visible panels |
| Story sharing / canvas export | No share API on TV | Hidden |
| Download banner | No file download | Hidden |
| Mobile warning modal | Not mobile | Hidden |
| Live webcams panel | YouTube iframes heavy | Optional (disabled default) |
| Settings page (separate HTML) | Complex form | Simplified in-app settings |
| Search (Ctrl+K) | Keyboard shortcut | BLUE button opens search |

## 4.10 Animations & Transitions

TV SoCs struggle with CSS animations. Simplify:

```css
body.tv-mode {
  /* Reduce all transition durations */
  --transition-speed: 0.15s; /* Was 0.2–0.3s */
}

body.tv-mode * {
  /* Disable expensive animations */
  animation-duration: 0.001s !important;
  transition-duration: 0.15s !important;
}

/* Keep essential animations but simplify */
body.tv-mode .pulse-alert {
  animation: pulse-alert-tv 2s infinite;
}

@keyframes pulse-alert-tv {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Disable skeleton shimmer animation (app loads fast from IPK) */
body.tv-mode .skeleton-shimmer {
  animation: none;
}
```

## 4.11 Scrollbar Styling

TV users use D-pad for scrolling, but scrollbars provide visual position indicator:

```css
body.tv-mode .panel-content::-webkit-scrollbar {
  width: 8px;
}

body.tv-mode .panel-content::-webkit-scrollbar-track {
  background: var(--bg);
}

body.tv-mode .panel-content::-webkit-scrollbar-thumb {
  background: var(--accent);
  border-radius: 4px;
  opacity: 0.5;
}

/* Show scroll position indicator instead of scrollbar when using D-pad */
body.tv-mode .panel-content {
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}
```

## 4.12 Light Theme on TV

The app supports dark/light themes. On TV:
- **Default to dark theme** (most TVs are in dim rooms)
- **Allow light theme** via settings (but adjust contrasts)
- **Auto-detect**: Some TVs report ambient light — future enhancement

```typescript
// Force dark theme on TV unless explicitly changed
if (IS_TV && !localStorage.getItem('worldmonitor-theme')) {
  setTheme('dark');
}
```
