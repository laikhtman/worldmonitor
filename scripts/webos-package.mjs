#!/usr/bin/env node
/**
 * webOS TV Packaging Script
 *
 * Takes the Vite build output (dist/) and prepares a webOS-compatible
 * directory (dist-webos/) ready for `ares-package`.
 *
 * Usage:
 *   node scripts/webos-package.mjs          # Prepare package dir
 *   node scripts/webos-package.mjs --ipk    # Also run ares-package
 *
 * Prerequisites:
 *   - `npm run build:tv` must have been run first
 *   - For --ipk flag: webOS CLI tools (`ares-package`) must be installed
 */

import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const DIST_DIR = resolve(ROOT, 'dist');
const OUT_DIR = resolve(ROOT, 'dist-webos');
const APPINFO_SRC = resolve(ROOT, 'public/webos/appinfo.json');
const ICONS_DIR = resolve(ROOT, 'scripts/webos-icons');
const PKG_JSON = resolve(ROOT, 'package.json');

/* ------------------------------------------------------------------ */
/*  Preflight checks                                                   */
/* ------------------------------------------------------------------ */

if (!existsSync(DIST_DIR)) {
  console.error('❌ dist/ not found. Run `npm run build:tv` first.');
  process.exit(1);
}

if (!existsSync(APPINFO_SRC)) {
  console.error('❌ public/webos/appinfo.json not found.');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  Clean & create output directory                                    */
/* ------------------------------------------------------------------ */

if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true, force: true });
}
mkdirSync(OUT_DIR, { recursive: true });

console.log('📦 Preparing webOS package...');

/* ------------------------------------------------------------------ */
/*  1. Copy dist/ contents → dist-webos/                               */
/* ------------------------------------------------------------------ */

cpSync(DIST_DIR, OUT_DIR, { recursive: true });
console.log('  ✅ Copied dist/ → dist-webos/');

/* ------------------------------------------------------------------ */
/*  2. Copy & patch appinfo.json (sync version from package.json)      */
/* ------------------------------------------------------------------ */

const pkg = JSON.parse(readFileSync(PKG_JSON, 'utf8'));
const appinfo = JSON.parse(readFileSync(APPINFO_SRC, 'utf8'));
appinfo.version = pkg.version;

writeFileSync(resolve(OUT_DIR, 'appinfo.json'), JSON.stringify(appinfo, null, 2) + '\n');
console.log(`  ✅ appinfo.json (version: ${pkg.version})`);

/* ------------------------------------------------------------------ */
/*  3. Copy icons (if they exist)                                      */
/* ------------------------------------------------------------------ */

const ICON_FILES = ['icon.png', 'largeIcon.png', 'splash.png', 'bgImage.png'];

for (const file of ICON_FILES) {
  const src = resolve(ICONS_DIR, file);
  if (existsSync(src)) {
    cpSync(src, resolve(OUT_DIR, file));
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} not found in scripts/webos-icons/ (skipping)`);
  }
}

/* ------------------------------------------------------------------ */
/*  4. Remove files not needed in IPK                                  */
/* ------------------------------------------------------------------ */

const REMOVE_PATTERNS = [
  'settings.html',             // Desktop-only settings page
  'sw.js',                     // Service Worker (IPK doesn't use it)
  'workbox-*.js',              // Workbox runtime
  'registerSW.js',             // PWA registration
  'manifest.webmanifest',      // PWA manifest
  'offline.html',              // PWA offline fallback
];

for (const pattern of REMOVE_PATTERNS) {
  const target = resolve(OUT_DIR, pattern);
  if (existsSync(target)) {
    rmSync(target, { force: true });
    console.log(`  🗑️  Removed ${pattern}`);
  }
}

/* ------------------------------------------------------------------ */
/*  5. Optionally run ares-package                                     */
/* ------------------------------------------------------------------ */

const shouldPackage = process.argv.includes('--ipk');

if (shouldPackage) {
  try {
    execSync('ares-package --version', { stdio: 'pipe' });
  } catch {
    console.error('\n❌ `ares-package` not found. Install webOS CLI tools:');
    console.error('   https://webostv.developer.lge.com/develop/tools/cli-installation');
    process.exit(1);
  }

  console.log('\n📦 Creating IPK...');
  try {
    const output = execSync(`ares-package "${OUT_DIR}" -o "${ROOT}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(output.trim());
    console.log('\n✅ IPK created successfully!');
  } catch (err) {
    console.error('❌ ares-package failed:', err.message);
    process.exit(1);
  }
} else {
  console.log(`\n✅ Package directory ready: dist-webos/`);
  console.log('   To create IPK: ares-package dist-webos/ -o .');
  console.log('   Or run: npm run package:tv:ipk');
}
