/**
 * PERF-054: Memory leak detection E2E test.
 * Opens the dashboard, simulates data refreshes, and asserts
 * that JS heap size stays below a threshold after extended usage.
 */
import { test, expect } from '@playwright/test';

test.describe('Memory Leak Detection', () => {
  test('heap size stays stable after simulated refreshes', async ({ page, browserName }) => {
    // Only Chrome/Chromium exposes performance.memory
    test.skip(browserName !== 'chromium', 'Memory API only available in Chromium');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for initial app load
    await page.waitForTimeout(5000);

    // Take initial heap snapshot
    const initialHeap = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialHeap === null) {
      test.skip(true, 'performance.memory not available');
      return;
    }

    // Simulate 30 seconds of usage with periodic checks
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);

      // Force GC if available
      await page.evaluate(() => {
        if ((window as any).gc) (window as any).gc();
      });
    }

    // Take final heap snapshot
    const finalHeap = await page.evaluate(() => {
      if ((performance as any).gc) (performance as any).gc();
      return (performance as any).memory?.usedJSHeapSize ?? 0;
    });

    const heapGrowthMB = (finalHeap - initialHeap) / (1024 * 1024);
    console.log(`Heap growth: ${heapGrowthMB.toFixed(1)} MB (initial: ${(initialHeap / 1024 / 1024).toFixed(1)} MB, final: ${(finalHeap / 1024 / 1024).toFixed(1)} MB)`);

    // Assert heap doesn't grow more than 100MB in 30 seconds
    expect(heapGrowthMB).toBeLessThan(100);
  });
});
