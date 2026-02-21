# 09 — Testing & QA

## 9.1 Testing Strategy Overview

| Test Type | Tool | Environment | Frequency |
|-----------|------|-------------|-----------|
| Unit / logic | Node.js test runner | CI | Every commit |
| TypeScript | `tsc --noEmit` | CI | Every commit |
| E2E (browser) | Playwright | CI + local | Every PR |
| E2E (TV emulator) | Playwright + webOS emulator | Local + nightly CI | Nightly |
| Visual regression | Playwright screenshot | CI | Every PR |
| Performance | Lighthouse + custom | webOS emulator | Weekly |
| Physical TV | Manual + automated | LG TV hardware | Before release |
| Content Store QA | LG review process | LG labs | Each submission |

## 9.2 webOS TV Emulator

### Setup

```bash
# 1. Install VirtualBox 6.x+ (required for webOS emulator)
# Download from https://www.virtualbox.org/

# 2. Download webOS TV Emulator from LG Developer portal
# https://webostv.developer.lge.com/develop/tools/emulator

# 3. Import emulator VM
VBoxManage import webOS_TV_Emulator_v*.ova

# 4. Configure emulator
# - RAM: 4 GB (matches real TV allocation)
# - Display: 1920×1080
# - Network: Bridged (for API access)
# - 3D Acceleration: Enabled (for WebGL)
```

### Emulator Limitations

| Feature | Real TV | Emulator | Workaround |
|---------|---------|----------|------------|
| WebGL 2.0 | ✅ | ⚠️ Software renderer | Test GPU code on real TV |
| Performance | Real SoC | x86 VM | Not representative |
| Magic Remote | Physical | ⚠️ Mouse emulates | Close enough |
| D-pad | Physical | Keyboard arrows | ✅ Works |
| Luna APIs | Full | Partial | Mock for CI |
| Network | WiFi/Ethernet | VM bridged | ✅ Works |
| Storage | Limited | VM disk | Not representative |

### Running Against Emulator

```bash
# 1. Start emulator
ares-launch --simulator

# 2. Install app
ares-install dist-webos/com.intelhq.tv_1.0.0_all.ipk --device emulator

# 3. Launch app
ares-launch com.intelhq.tv --device emulator

# 4. Open DevTools
ares-inspect --device emulator --app com.intelhq.tv
# Opens Chrome DevTools at http://localhost:9998
```

## 9.3 Playwright E2E for TV

### TV-Specific E2E Tests

```typescript
// e2e/tv-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('TV Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000?variant=tv');
    await page.waitForSelector('.panels-grid');
  });

  test('D-pad navigates between panels', async ({ page }) => {
    // Focus should start on first panel
    await page.keyboard.press('ArrowDown');
    const focused = await page.locator('.tv-focused').first();
    await expect(focused).toBeVisible();
  });

  test('OK button activates focused item', async ({ page }) => {
    // Navigate to a news item
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // OK button
    // Should open link or show detail
  });

  test('BACK button closes popup', async ({ page }) => {
    // Open a popup (click on map feature)
    // ...
    await page.keyboard.press('Backspace'); // BACK = 461, but Playwright uses Backspace
    await expect(page.locator('.map-popup')).not.toBeVisible();
  });

  test('color buttons work', async ({ page }) => {
    // RED = toggle hotspots
    await page.keyboard.press('F1'); // Playwright proxy for RED
    // Verify layer toggled
  });

  test('map D-pad panning', async ({ page }) => {
    // Focus map
    await page.keyboard.press('ArrowLeft');
    // Pan
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    // Verify map center changed
  });
});
```

### TV Visual Regression

```typescript
// e2e/tv-visual.spec.ts
test.describe('TV Visual Regression', () => {
  test('TV layout matches golden', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000?variant=tv');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for map render

    await expect(page).toHaveScreenshot('tv-layout.png', {
      threshold: 0.1,
      maxDiffPixels: 500,
    });
  });

  test('TV focus ring visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000?variant=tv');
    await page.keyboard.press('ArrowDown');

    await expect(page).toHaveScreenshot('tv-focus-ring.png', {
      threshold: 0.1,
    });
  });
});
```

## 9.4 Performance Testing

### Frame Rate Monitoring

```typescript
// e2e/tv-performance.spec.ts
test('TV maintains 30fps during scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000?variant=tv');

  // Inject FPS counter
  const fps = await page.evaluate(async () => {
    const samples: number[] = [];
    let lastTime = performance.now();
    let frames = 0;

    return new Promise<number[]>((resolve) => {
      function frame(time: number) {
        frames++;
        if (time - lastTime >= 1000) {
          samples.push(frames);
          frames = 0;
          lastTime = time;
        }
        if (samples.length >= 5) {
          resolve(samples);
          return;
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  });

  const avgFps = fps.reduce((a, b) => a + b, 0) / fps.length;
  expect(avgFps).toBeGreaterThan(25); // At least 25fps (target 30)
});
```

### Memory Usage Testing

```typescript
test('TV memory stays under 800MB', async ({ page }) => {
  await page.goto('http://localhost:3000?variant=tv');
  await page.waitForLoadState('networkidle');

  // Wait for data load
  await page.waitForTimeout(10000);

  const memory = await page.evaluate(() => {
    const perf = performance as any;
    return perf.memory?.usedJSHeapSize || 0;
  });

  const memoryMB = memory / (1024 * 1024);
  console.log(`JS heap: ${memoryMB.toFixed(0)} MB`);
  expect(memoryMB).toBeLessThan(800);
});
```

## 9.5 Physical TV Testing

### Setup

```bash
# 1. Enable Developer Mode on LG TV
# Settings → General → About This TV → tap "webOS TV" 7 times
# Install Dev Mode app from LG Content Store

# 2. Register device
ares-setup-device
# Enter TV IP, SSH port (default 9922), passphrase from Dev Mode app

# 3. Deploy and test
ares-install com.intelhq.tv_1.0.0_all.ipk --device tv
ares-launch com.intelhq.tv --device tv
ares-inspect --device tv --app com.intelhq.tv
```

### Physical TV Test Checklist

```markdown
## Pre-Release TV Test Checklist

### Input & Navigation
- [ ] D-pad Up/Down/Left/Right navigates all focusable elements
- [ ] OK button activates focused element
- [ ] BACK closes modals/popups (in correct order)
- [ ] Magic Remote pointer clicks work
- [ ] Magic Remote scroll wheel scrolls panels
- [ ] Color buttons trigger correct actions (Red/Green/Yellow/Blue)
- [ ] CH+/CH- switches panels
- [ ] Info button shows overlay
- [ ] No focus traps (can always navigate away)
- [ ] Focus ring is always visible when using D-pad
- [ ] Focus ring disappears when using Magic Remote

### Visual / Layout
- [ ] All text readable at 10-foot distance (3 meters)
- [ ] No content in overscan area (5% margins)
- [ ] Focus ring color has sufficient contrast
- [ ] Alert badges visible
- [ ] Market data readable (numbers, arrows, colors)
- [ ] Map renders correctly (globe visible, tiles load)
- [ ] Popup content readable
- [ ] Dark theme colors look correct on TV panel
- [ ] No CLS (Cumulative Layout Shift) during loading

### Performance
- [ ] App launches in < 5 seconds
- [ ] First meaningful paint < 3 seconds
- [ ] Map panning is smooth (no visible jank)
- [ ] Panel scrolling is smooth
- [ ] No memory-related crashes after 30 minutes
- [ ] Data refreshes don't cause visible lag
- [ ] No WebGL context loss under normal use

### Network
- [ ] App loads all API data over WiFi
- [ ] App handles network loss gracefully (shows cached data)
- [ ] Network recovery resumes data fetching
- [ ] WebSocket (if enabled) reconnects after drop

### Lifecycle
- [ ] App suspends gracefully when pressing Home
- [ ] App resumes correctly when reopened
- [ ] App handles TV sleep/wake cycle
- [ ] Developer Mode expiry handled gracefully

### Localization
- [ ] TV system language detected and applied
- [ ] RTL layout works (Arabic, Hebrew)
- [ ] Long translations don't overflow UI
```

## 9.6 CI Pipeline for TV

```yaml
# .github/workflows/tv-build.yml
name: TV Build & Test

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'src/**'
      - 'public/webos/**'
      - 'scripts/webos-*'

jobs:
  build-tv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run typecheck
      - run: npm run build:tv

      - name: Verify bundle size
        run: |
          SIZE=$(du -sb dist/ | cut -f1)
          MAX_SIZE=10485760  # 10 MB
          if [ "$SIZE" -gt "$MAX_SIZE" ]; then
            echo "Bundle too large: $SIZE bytes (max: $MAX_SIZE)"
            exit 1
          fi

      - name: Package IPK
        run: npm run package:tv

      - uses: actions/upload-artifact@v4
        with:
          name: tv-ipk
          path: '*.ipk'

  test-tv:
    runs-on: ubuntu-latest
    needs: build-tv
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npx playwright install chromium

      - name: E2E TV tests
        run: npx playwright test e2e/tv-*.spec.ts
        env:
          VITE_VARIANT: tv

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: tv-test-results
          path: test-results/
```

## 9.7 Testing npm Scripts

```jsonc
// package.json additions
{
  "scripts": {
    "test:e2e:tv": "cross-env VITE_VARIANT=tv playwright test e2e/tv-*.spec.ts",
    "test:e2e:tv:visual": "cross-env VITE_VARIANT=tv playwright test e2e/tv-visual.spec.ts --update-snapshots"
  }
}
```
