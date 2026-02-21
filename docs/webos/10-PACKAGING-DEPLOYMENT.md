# 10 — Packaging & Deployment

## 10.1 IPK Package Structure

An IPK file is an AR archive containing the webOS app:

```
com.intelhq.tv_1.0.0_all.ipk
  ├── data.tar.gz
  │   └── usr/palm/applications/com.intelhq.tv/
  │       ├── appinfo.json      ← App manifest
  │       ├── index.html        ← Entry point
  │       ├── icon.png          ← 80×80 app icon
  │       ├── largeIcon.png     ← 130×130 icon
  │       ├── splash.png        ← 1920×1080 splash
  │       └── assets/
  │           ├── index-[hash].js
  │           ├── index-[hash].css
  │           ├── map-[hash].js
  │           ├── sentry-[hash].js
  │           ├── i18n-[hash].js
  │           └── ...
  ├── control.tar.gz
  │   └── control             ← Package metadata
  └── debian-binary           ← "2.0"
```

## 10.2 Build → Package → Deploy Pipeline

```
npm run build:tv          →  dist/              (Vite build)
npm run package:tv        →  dist-webos/        (Add appinfo.json, icons)
                          →  com.intelhq.tv_*.ipk  (ares-package)
ares-install *.ipk        →  LG TV              (dev deployment)
LG Content Store submit   →  LG CDN             (production)
```

### Detailed Steps

```bash
# 1. Build the TV variant
cross-env VITE_VARIANT=tv vite build

# 2. Prepare webOS package directory
node scripts/webos-package.mjs

# 3. Create IPK
ares-package dist-webos/
# Output: com.intelhq.tv_1.0.0_all.ipk

# 4. Install on dev TV
ares-install com.intelhq.tv_1.0.0_all.ipk --device myLGTV

# 5. Launch
ares-launch com.intelhq.tv --device myLGTV

# 6. Debug
ares-inspect --device myLGTV --app com.intelhq.tv
```

## 10.3 App Icons & Splash

### Required Assets

| Asset | Size | Format | Purpose |
|-------|------|--------|---------|
| `icon.png` | 80×80 | PNG, no alpha | App list icon |
| `largeIcon.png` | 130×130 | PNG, no alpha | Home screen / featured |
| `splash.png` | 1920×1080 | PNG | Loading splash screen |
| `bgImage.png` | 1920×1080 | PNG | Background behind app card |

### Design Guidelines
- **Icon**: IntelHQ logo on solid `#0a0f0a` background, `#44ff88` accent
- **Splash**: Dark background with centered IntelHQ logo + "Loading..." text
- **No transparency**: webOS requires opaque icons

## 10.4 `appinfo.json` Complete Reference

```json
{
  "id": "com.intelhq.tv",
  "version": "1.0.0",
  "vendor": "IntelHQ",
  "type": "web",
  "main": "index.html",
  "title": "IntelHQ",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "bgImage": "splash.png",
  "bgColor": "#0a0f0a",
  "iconColor": "#0a0f0a",
  "splashBackground": "#0a0f0a",
  "resolution": "1920x1080",
  "transparent": false,
  "handlesRelaunch": true,
  "disableBackHistoryAPI": false,
  "enableBackHistory": true,
  "requiredPermissions": [
    "time.query",
    "activity.operation",
    "settings.read"
  ],
  "accessibleUrl": [
    "https://intelhq.io/*",
    "https://api.maptiler.com/*",
    "https://*.basemaps.cartocdn.com/*",
    "https://earthquake.usgs.gov/*",
    "https://fonts.googleapis.com/*",
    "https://fonts.gstatic.com/*",
    "wss://stream.aisstream.io/*"
  ]
}
```

### Key Fields Explained

| Field | Value | Reason |
|-------|-------|--------|
| `resolution` | `"1920x1080"` | Render at 1080p (TV upscales to 4K) |
| `handlesRelaunch` | `true` | App receives relaunch event instead of restarting |
| `enableBackHistory` | `true` | BACK button triggers history.back() or custom handler |
| `accessibleUrl` | whitelist | CORS bypass for API calls |
| `requiredPermissions` | minimal | Only request what we need |

## 10.5 LG Content Store Submission

### Requirements for Store Listing

| Requirement | Details |
|-------------|---------|
| App ID | `com.intelhq.tv` (reverse domain) |
| Category | News & Information |
| Supported regions | Initially: US, EU, UK, AU, IL |
| Languages | Match existing i18n: EN, ES, FR, DE, AR, HE, etc. |
| Age rating | General (no adult content) |
| Screenshots | 5 minimum, 1920×1080, showing different features |
| Description | ≤4000 chars, localized |
| Privacy policy URL | Required |
| Support URL | Required |
| Target webOS | 5.0+ (2020+) |
| IPK size | Must be < 50 MB |
| Test account | If login required (N/A for IntelHQ) |

### Store Listing Copy

```
Title: IntelHQ - Global Intelligence Dashboard
Short Desc: Real-time global news, markets, and geopolitical intelligence
Long Desc:
IntelHQ brings real-time global intelligence to your LG Smart TV.
Monitor breaking news, financial markets, geopolitical hotspots, and
more — all from your living room.

Features:
• Live news aggregation from 150+ global sources
• Interactive 3D globe with geopolitical data
• Stock market & crypto tracking
• AI-powered intelligence insights
• Earthquake & natural disaster alerts
• Military & security monitoring
• Prediction markets

Designed for easy TV navigation with LG Magic Remote and standard
remote control support.
```

### Submission Process

1. Register at [webOS TV Developer](https://webostv.developer.lge.com/)
2. Create app listing with metadata, screenshots, description
3. Upload IPK file
4. Submit for review (typically 5–10 business days)
5. LG QA tests on real hardware across target webOS versions
6. Approval → Published to LG Content Store

### Common Rejection Reasons (and mitigations)

| Rejection Reason | Mitigation |
|-----------------|------------|
| App crashes on launch | Test on emulator + real TV |
| BACK button doesn't work | Implement proper back-stack |
| Focus ring missing | TV focus styles mandatory |
| Content in overscan area | Enforce safe zone padding |
| App hangs on network loss | Offline handling + timeout |
| Memory leak | Monitor + cleanup intervals |
| Spin-loop / high CPU | Throttle animation + workers |

## 10.6 OTA Updates

### Strategy 1: App Store Update (recommended)
- Submit new IPK version to LG Content Store
- Users receive auto-update notification
- Simple but slow (5–10 day review cycle)

### Strategy 2: Hybrid (IPK shell + web content)
```json
// appinfo.json — hybrid mode
{
  "main": "index.html",
  "type": "web"
}

// index.html — check for updates
<script>
  // On launch, check if newer version available
  fetch('https://tv.intelhq.io/version.json')
    .then(r => r.json())
    .then(v => {
      if (v.version > currentVersion) {
        // Redirect to hosted version for latest content
        window.location.href = 'https://tv.intelhq.io/';
      }
    })
    .catch(() => {
      // Offline — continue with bundled version
    });
</script>
```

This gives fast content updates (bypass store review) while maintaining the IPK for app icon, offline fallback, and store presence.

### Strategy 3: Hosted-Only
Use IPK purely as a launcher that loads `https://tv.intelhq.io/`:
```json
{
  "main": "https://tv.intelhq.io/",
  "type": "web"
}
```
Simplest but requires internet for every launch.

**Recommendation**: Start with **Strategy 1** for reliability, migrate to **Strategy 2** once stable.

## 10.7 Version Management

Sync TV version with main app version from `package.json`:

```javascript
// scripts/webos-package.mjs
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const appinfo = JSON.parse(readFileSync('dist-webos/appinfo.json', 'utf8'));
appinfo.version = pkg.version;
writeFileSync('dist-webos/appinfo.json', JSON.stringify(appinfo, null, 2));
```

Version format: `MAJOR.MINOR.PATCH` (e.g., `2.4.1`) — compatible with webOS versioning.

## 10.8 Deployment Environments

| Environment | URL / Target | Purpose |
|-------------|-------------|---------|
| localhost | `npm run dev:tv` | Local development |
| TV Emulator | `ares-install` → emulator | Integration testing |
| Physical TV (dev) | `ares-install` → registered TV | Hardware testing |
| Staging (hosted) | `https://tv-staging.intelhq.io` | Pre-release testing |
| Production (store) | LG Content Store | Users |
| Production (hosted) | `https://tv.intelhq.io` | Direct access / OTA |
