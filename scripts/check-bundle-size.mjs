/**
 * PERF-053: Bundle size budget CI check.
 * Fails if any chunk exceeds the budget.
 * Run after `npm run build`: node scripts/check-bundle-size.mjs
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist/assets';
const MAX_CHUNK_KB = 800; // Same as vite.config.ts chunkSizeWarningLimit
const MAX_TOTAL_KB = 3000; // Total JS budget

let totalSize = 0;
let failed = false;
const files = [];

try {
  for (const file of readdirSync(DIST_DIR)) {
    if (!file.endsWith('.js')) continue;
    const size = statSync(join(DIST_DIR, file)).size;
    const kb = Math.round(size / 1024);
    totalSize += kb;
    files.push({ file, kb });

    if (kb > MAX_CHUNK_KB) {
      console.error(`❌ OVER BUDGET: ${file} is ${kb} KB (limit: ${MAX_CHUNK_KB} KB)`);
      failed = true;
    } else {
      console.log(`✅ ${file}: ${kb} KB`);
    }
  }
} catch (err) {
  console.error('❌ Could not read dist/assets. Run `npm run build` first.');
  process.exit(1);
}

console.log(`\nTotal JS: ${totalSize} KB (budget: ${MAX_TOTAL_KB} KB)`);

if (totalSize > MAX_TOTAL_KB) {
  console.error(`❌ Total JS budget exceeded: ${totalSize} KB > ${MAX_TOTAL_KB} KB`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ All chunks within budget');
}
