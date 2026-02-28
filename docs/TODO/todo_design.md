# Design Tasks — Logos, Icons & Visual Assets

All assets needed across web, desktop (Tauri), TV (webOS), PWA, and store listings.

> **Brand colors**: Background `#0a0f0a`, Accent green `#00ff88`, Text `#e0e0e0`
> **App name**: IntelHQ (all variants)
> **Font**: System / Inter (UI), monospace for data

---

## Status Legend

- ⬜ Not started
- 🔄 In progress
- ✅ Done (asset exists)

---

## 1. Master Logo & Brand Mark

The source artwork from which all icons are derived.

| # | Asset | Size | Format | Notes | Status |
|---|-------|------|--------|-------|--------|
| 1.1 | Master logo (full) | 2048×2048 | SVG + PNG | Globe/radar motif, dark bg, green accent | ✅ `design/intelhq-logo-full.*` |
| 1.2 | Logo — icon only (no text) | 1024×1024 | SVG + PNG | Square, works at small sizes | ✅ `design/intelhq-logo-icon.*` |
| 1.3 | Logo — horizontal lockup | 400×100 | SVG + PNG | Icon + "IntelHQ" text, for headers/README | ✅ `design/intelhq-logo-horizontal.*` |
| 1.4 | Logo — monochrome (white) | 1024×1024 | SVG | For dark overlays, loading screens | ✅ `design/intelhq-logo-mono-white.svg` |
| 1.5 | Logo — monochrome (black) | 1024×1024 | SVG | For light contexts, print | ✅ `design/intelhq-logo-mono-black.svg` |

---

## 2. Web — Favicons & PWA

Located in `public/favico/`. Most exist but may need refresh if brand mark changes.

| # | Asset | Size | Format | File Path | Status |
|---|-------|------|--------|-----------|--------|
| 2.1 | favicon.ico | 16×16, 32×32, 48×48 (multi) | ICO | `public/favico/favicon.ico` | ✅ |
| 2.2 | favicon-16x16.png | 16×16 | PNG | `public/favico/favicon-16x16.png` | ✅ |
| 2.3 | favicon-32x32.png | 32×32 | PNG | `public/favico/favicon-32x32.png` | ✅ |
| 2.4 | Apple Touch Icon | 180×180 | PNG | `public/favico/apple-touch-icon.png` | ✅ |
| 2.5 | Android Chrome 192 | 192×192 | PNG | `public/favico/android-chrome-192x192.png` | ✅ |
| 2.6 | Android Chrome 512 | 512×512 | PNG | `public/favico/android-chrome-512x512.png` | ✅ |
| 2.7 | PWA maskable icon | 512×512 | PNG | `public/favico/maskable-icon-512.png` | ✅ |
| 2.8 | Safari pinned tab | any | SVG (monochrome) | `public/favico/safari-pinned-tab.svg` | ✅ |

---

## 3. Web — Open Graph & Social

| # | Asset | Size | Format | File Path | Status |
|---|-------|------|--------|-----------|--------|
| 3.1 | OG Image (Full variant) | 1200×630 | PNG | `public/favico/og-image.png` | ✅ |
| 3.2 | OG Image (Tech variant) | 1200×630 | PNG | `public/favico/og-image-tech.png` | ✅ |
| 3.3 | OG Image (Finance variant) | 1200×630 | PNG | `public/favico/og-image-finance.png` | ✅ |
| 3.4 | OG Image (TV variant) | 1200×630 | PNG | `public/favico/og-image-tv.png` | ✅ |
| 3.5 | Twitter Card image | 1200×600 | PNG | `public/favico/twitter-card.png` | ✅ |

---

## 4. Desktop — Tauri / Windows / macOS / Linux

Located in `src-tauri/icons/`. Tauri auto-generates some sizes from the master, but the source icons must be provided.

| # | Asset | Size | Format | File Path | Status |
|---|-------|------|--------|-----------|--------|
| 4.1 | macOS icon | multi-size | ICNS | `src-tauri/icons/icon.icns` | ✅ |
| 4.2 | Windows icon | multi-size | ICO | `src-tauri/icons/icon.ico` | ✅ |
| 4.3 | Master icon PNG | 1024×1024 | PNG | `src-tauri/icons/icon.png` | ✅ |
| 4.4 | 32×32 | 32×32 | PNG | `src-tauri/icons/32x32.png` | ✅ |
| 4.5 | 128×128 | 128×128 | PNG | `src-tauri/icons/128x128.png` | ✅ |
| 4.6 | 128×128@2x | 256×256 | PNG | `src-tauri/icons/128x128@2x.png` | ✅ |
| 4.7 | Windows Store Logo | 50×50 | PNG | `src-tauri/icons/StoreLogo.png` | ✅ |
| 4.8 | Windows Square tiles | 30–310px | PNG | `src-tauri/icons/Square*.png` | ✅ |
| 4.9 | Android icons set | various | PNG | `src-tauri/icons/android/` | ✅ |
| 4.10 | iOS icons set | various | PNG | `src-tauri/icons/ios/` | ✅ |
| 4.11 | DMG background (macOS) | 660×400 | PNG | `src-tauri/icons/dmg-background.png` | ✅ |
| 4.12 | Windows installer banner | 493×58 | BMP/PNG | `src-tauri/icons/installer-banner.png` | ✅ |

---

## 5. TV — webOS (LG Content Store)

Located in `public/webos/` (copied by `scripts/webos-package.mjs` into the IPK).

| # | Asset | Size | Format | File Path | Notes | Status |
|---|-------|------|--------|-----------|-------|--------|
| 5.1 | App icon (standard) | 80×80 | PNG | `public/webos/icon.png` | Shown in launcher bar | ✅ |
| 5.2 | App icon (large) | 130×130 | PNG | `public/webos/largeIcon.png` | Shown in app info/store | ✅ |
| 5.3 | Splash / background image | 1920×1080 | PNG | `public/webos/splash.png` | Shown during app load, bg `#0a0f0a` | ✅ |
| 5.4 | Store icon (square) | 400×400 | PNG | `public/webos/store-icon-400.png` | LG Content Store listing | ✅ |
| 5.5 | Store banner (landscape) | 1920×1080 | PNG | `public/webos/store-banner-1920x1080.png` | Featured app banner | ✅ |

### 5.6 Store Screenshots (1920×1080 PNG each)

Required for LG Content Store submission. Capture from the running app at native TV resolution.

| # | Screenshot | Content | Status |
|---|-----------|---------|--------|
| 5.6.1 | Main dashboard | Full app — map + news panels visible | ✅ `public/webos/screenshots/screenshot-01.png` |
| 5.6.2 | Globe view | 3D globe with hotspot markers | ✅ `public/webos/screenshots/screenshot-02.png` |
| 5.6.3 | News panel | Live news feed with categorization | ✅ `public/webos/screenshots/screenshot-03.png` |
| 5.6.4 | Markets view | Stock/crypto price tracking | ✅ `public/webos/screenshots/screenshot-04.png` |
| 5.6.5 | Country brief | Country intelligence modal open | ✅ `public/webos/screenshots/screenshot-05.png` |

---

## 6. GitHub & README

| # | Asset | Size | Format | Notes | Status |
|---|-------|------|--------|-------|--------|
| 6.1 | README hero banner | 1280×640 | PNG | App screenshot or stylized promo | ✅ `design/marketing/readme-hero-banner.png` |
| 6.2 | GitHub social preview | 1280×640 | PNG | Shown on repo card (Settings → Social preview) | ✅ `design/marketing/github-social-preview.png` |
| 6.3 | GitHub Sponsors banner | 800×200 | PNG | Optional, for funding page | ✅ `design/marketing/github-sponsors-banner.png` |

---

## 7. Variant-Specific Branding (Optional)

If the Tech and Finance variants should have distinct icons/colors:

| # | Asset | Size | Format | Notes | Status |
|---|-------|------|--------|-------|--------|
| 7.1 | Tech variant icon | 1024×1024 | SVG + PNG | Blue/cyan accent (`#0891b2`) | ✅ `design/variants/intelhq-tech-icon.*` |
| 7.2 | Tech OG image | 1200×630 | PNG | Tech-themed promo | ✅ (= 3.2) |
| 7.3 | Finance variant icon | 1024×1024 | SVG + PNG | Green accent (`#059669`) | ✅ `design/variants/intelhq-finance-icon.*` |
| 7.4 | Finance OG image | 1200×630 | PNG | Finance-themed promo | ✅ (= 3.3) |
| 7.5 | TV variant icon | 1024×1024 | SVG + PNG | Dark bg, TV-optimized contrast | ✅ `design/variants/intelhq-tv-icon.*` |

---

## 8. Misc / Loading States

| # | Asset | Size | Format | Notes | Status |
|---|-------|------|--------|-------|--------|
| 8.1 | Loading spinner / animation | 64×64 | SVG or Lottie | Used during initial app load | ✅ `design/misc/loading-spinner.svg` |
| 8.2 | Offline placeholder image | 400×300 | SVG | Shown when network is down (TV + PWA) | ✅ `design/misc/offline-placeholder.*` |
| 8.3 | Empty state illustration | 400×300 | SVG | "No data" placeholder for panels | ✅ `design/misc/empty-state.*` |
| 8.4 | Error state illustration | 400×300 | SVG | "Something went wrong" placeholder | ✅ `design/misc/error-state.*` |

---

## Priority Order

1. **P0 — Blocking TV store submission**: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6.x
2. **P0 — Brand foundation**: 1.1, 1.3 (needed if refreshing all icons)
3. **P1 — Web completeness**: 2.7, 2.8, 3.2–3.5
4. **P1 — Desktop polish**: 4.11, 4.12
5. **P2 — Marketing / GitHub**: 6.1, 6.2
6. **P2 — Variant branding**: 7.x
7. **P3 — Nice to have**: 8.x

---

## Design Guidelines

- **Dark theme first**: All icons must read well on dark backgrounds (`#0a0f0a`)
- **High contrast**: TV icons viewed from 3+ meters — avoid thin lines or fine detail
- **Safe zone**: TV icons should keep content within 80% of the image area (LG requirement)
- **No text in icons**: The icon mark should work without text at 16×16 through 1024×1024
- **File naming**: Exact filenames matter — `icon.png`, `largeIcon.png`, `splash.png` are referenced in `appinfo.json`
- **Color space**: sRGB for all PNGs, no embedded ICC profiles
- **Transparency**: Favicons and PWA icons use transparency; TV icons must be **opaque** (no alpha)

---

## Delivery

Place completed assets in these directories:

| Platform | Directory |
|----------|-----------|
| Web favicons + PWA | `public/favico/` |
| Desktop (Tauri) | `src-tauri/icons/` |
| TV (webOS) | `public/webos/` |
| OG / Social | `public/favico/` |
| Source artwork | `design/` (create if needed) |
