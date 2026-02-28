import { expect, test } from '@playwright/test';

type LayerSnapshot = { id: string; dataCount: number };

type VisualScenarioSummary = {
  id: string;
  variant: 'both' | 'full';
};

type HarnessWindow = Window & {
  __mapHarness?: {
    ready: boolean;
    variant: 'full';
    seedAllDynamicData: () => void;
    setNewsPulseScenario: (scenario: 'none' | 'recent' | 'stale') => void;
    setHotspotActivityScenario: (scenario: 'none' | 'breaking') => void;
    forcePulseStartupElapsed: () => void;
    resetPulseStartupTime: () => void;
    isPulseAnimationRunning: () => boolean;
    setZoom: (zoom: number) => void;
    setLayersForSnapshot: (enabledLayers: string[]) => void;
    setCamera: (camera: { lon: number; lat: number; zoom: number }) => void;
    enableDeterministicVisualMode: () => void;
    getVisualScenarios: () => VisualScenarioSummary[];
    prepareVisualScenario: (scenarioId: string) => boolean;
    isVisualScenarioReady: (scenarioId: string) => boolean;
    getDeckLayerSnapshot: () => LayerSnapshot[];
    getLayerDataCount: (layerId: string) => number;
    getLayerFirstScreenTransform: (layerId: string) => string | null;
    getCyberTooltipHtml: (indicator: string) => string;
  };
};

const EXPECTED_FULL_DECK_LAYERS = [
  'pipelines-layer',
  'conflict-zones-layer',
  'bases-layer',
  'nuclear-layer',
  'irradiators-layer',
  'spaceports-layer',
  'hotspots-layer',
  'fires-layer',
  'outages-layer',
  'cyber-threats-layer',
  'ais-density-layer',
  'ais-disruptions-layer',
  'ports-layer',
  'flight-delays-layer',
  'military-vessels-layer',
  'military-vessel-clusters-layer',
  'military-flights-layer',
  'military-flight-clusters-layer',
  'waterways-layer',
  'economic-centers-layer',
  'apt-groups-layer',
  'news-locations-layer',
];

const waitForHarnessReady = async (
  page: import('@playwright/test').Page
): Promise<void> => {
  await page.goto('/tests/map-harness.html');
  await expect(page.locator('.deckgl-map-wrapper')).toBeVisible();
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const w = window as HarnessWindow;
        return Boolean(w.__mapHarness?.ready);
      });
    }, { timeout: 30000 })
    .toBe(true);
};

const prepareVisualScenario = async (
  page: import('@playwright/test').Page,
  scenarioId: string
): Promise<void> => {
  const prepared = await page.evaluate((id) => {
    const w = window as HarnessWindow;
    return w.__mapHarness?.prepareVisualScenario(id) ?? false;
  }, scenarioId);

  expect(prepared).toBe(true);

  await expect
    .poll(async () => {
      return await page.evaluate((id) => {
        const w = window as HarnessWindow;
        return w.__mapHarness?.isVisualScenarioReady(id) ?? false;
      }, scenarioId);
    }, { timeout: 20000 })
    .toBe(true);

  await page.waitForTimeout(250);
};

test.describe('DeckGL map harness', () => {
  test.describe.configure({ retries: 1 });

  test('serves requested runtime variant for this test run', async ({ page }) => {
    await waitForHarnessReady(page);

    const runtimeVariant = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.variant ?? 'full';
    });

    const expectedVariant = 'full';
    expect(runtimeVariant).toBe(expectedVariant);
  });

  test('boots without deck assertions or unhandled runtime errors', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const deckAssertionErrors: string[] = [];
    const ignorablePageErrorPatterns = [/could not compile fragment shader/i];

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (text.includes('deck.gl: assertion failed')) {
        deckAssertionErrors.push(text);
      }
    });

    await waitForHarnessReady(page);
    await page.waitForTimeout(1000);

    const unexpectedPageErrors = pageErrors.filter(
      (error) =>
        !ignorablePageErrorPatterns.some((pattern) => pattern.test(error))
    );

    expect(unexpectedPageErrors).toEqual([]);
    expect(deckAssertionErrors).toEqual([]);
  });

  test('renders non-empty visual data for every renderable layer in current variant', async ({
    page,
  }) => {
    await waitForHarnessReady(page);

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.seedAllDynamicData();
      w.__mapHarness?.setZoom(5);
    });

    const variant = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.variant ?? 'full';
    });
    const expectedDeckLayers = EXPECTED_FULL_DECK_LAYERS;

    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => {
          const w = window as HarnessWindow;
          return w.__mapHarness?.getDeckLayerSnapshot() ?? [];
        });
        const nonEmptyIds = new Set(
          snapshot.filter((layer) => layer.dataCount > 0).map((layer) => layer.id)
        );
        return expectedDeckLayers.filter((id) => !nonEmptyIds.has(id)).length;
      }, { timeout: 20000 })
      .toBe(0);

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const w = window as HarnessWindow;
          const layers = w.__mapHarness?.getDeckLayerSnapshot() ?? [];
          return layers.length;
        });
      }, { timeout: 20000 })
      .toBeGreaterThan(0);

  });

  test('sanitizes cyber threat tooltip content', async ({ page }) => {
    await waitForHarnessReady(page);

    const html = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getCyberTooltipHtml('<script>alert(1)</script>') ?? '';
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('suppresses pulse animation during startup cooldown even with recent signals', async ({
    page,
  }) => {
    await waitForHarnessReady(page);

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.setHotspotActivityScenario('none');
      w.__mapHarness?.setNewsPulseScenario('none');
      w.__mapHarness?.resetPulseStartupTime();
      w.__mapHarness?.setNewsPulseScenario('recent');
    });

    await page.waitForTimeout(800);

    const isRunning = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.isPulseAnimationRunning() ?? false;
    });

    expect(isRunning).toBe(false);
  });

  test('matches golden screenshots per layer and zoom', async ({ page }) => {
    test.setTimeout(180_000);

    await waitForHarnessReady(page);

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.seedAllDynamicData();
      w.__mapHarness?.enableDeterministicVisualMode();
    });

    const variant = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.variant ?? 'full';
    });

    const scenarios = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getVisualScenarios() ?? [];
    });

    expect(scenarios.length).toBeGreaterThan(0);

    const mapWrapper = page.locator('.deckgl-map-wrapper');
    await expect(mapWrapper).toBeVisible();

    for (const scenario of scenarios) {
      await test.step(`visual baseline: ${scenario.id}`, async () => {
        await prepareVisualScenario(page, scenario.id);
        await expect(mapWrapper).toHaveScreenshot(
          `layer-${variant}-${scenario.id}.png`,
          {
            animations: 'disabled',
            caret: 'hide',
            scale: 'css',
            maxDiffPixelRatio: 0.02,
          }
        );
      });
    }
  });

  test('reprojects hotspot overlay marker within one frame on zoom', async ({
    page,
  }) => {
    await waitForHarnessReady(page);

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.setLayersForSnapshot(['hotspots']);
      w.__mapHarness?.setHotspotActivityScenario('breaking');
      w.__mapHarness?.setCamera({ lon: 0.2, lat: 15.2, zoom: 4.2 });
    });

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const w = window as HarnessWindow;
          return w.__mapHarness?.getLayerDataCount('hotspots-layer') ?? 0;
        });
      }, { timeout: 15000 })
      .toBeGreaterThan(0);

    const beforeTransform = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getLayerFirstScreenTransform('hotspots-layer') ?? null;
    });
    expect(beforeTransform).not.toBeNull();

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.setCamera({ lon: 0.2, lat: 15.2, zoom: 5.4 });
    });

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        })
    );

    const afterTransform = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getLayerFirstScreenTransform('hotspots-layer') ?? null;
    });
    expect(afterTransform).not.toBeNull();
    expect(afterTransform).not.toBe(beforeTransform);
  });

  test('does not mutate hotspot overlay position when hotspots layer is disabled', async ({
    page,
  }) => {
    await waitForHarnessReady(page);

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.setLayersForSnapshot(['hotspots']);
      w.__mapHarness?.setHotspotActivityScenario('breaking');
      w.__mapHarness?.setCamera({ lon: 0.2, lat: 15.2, zoom: 4.2 });
    });

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const w = window as HarnessWindow;
          return w.__mapHarness?.getLayerDataCount('hotspots-layer') ?? 0;
        });
      }, { timeout: 15000 })
      .toBeGreaterThan(0);

    const beforeTransform = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getLayerFirstScreenTransform('hotspots-layer') ?? null;
    });
    expect(beforeTransform).not.toBeNull();

    await page.evaluate(() => {
      const w = window as HarnessWindow;
      w.__mapHarness?.setLayersForSnapshot([]);
      w.__mapHarness?.setCamera({ lon: 3.5, lat: 18.2, zoom: 4.8 });
    });

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const w = window as HarnessWindow;
          return w.__mapHarness?.getLayerDataCount('hotspots-layer') ?? -1;
        });
      }, { timeout: 10000 })
      .toBe(0);

    const afterTransform = await page.evaluate(() => {
      const w = window as HarnessWindow;
      return w.__mapHarness?.getLayerFirstScreenTransform('hotspots-layer') ?? null;
    });
    expect(afterTransform).toBeNull();
  });
});
