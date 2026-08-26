/**
 * Shared plumbing for the two e2e suites.
 *
 * Playwright is intentionally NOT a hard dependency of this package: the app
 * itself does not need it, and a 100 MB browser download should not be the cost
 * of `npm install` for someone who only wants to run the UI. So we resolve it
 * from whichever of the usual places has it, and say something useful if none
 * do, rather than failing with a bare MODULE_NOT_FOUND.
 */

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const require = createRequire(import.meta.url);

const CANDIDATES = [
  'playwright',
  'playwright-core',
  join(process.env.APPDATA ?? '', 'npm/node_modules/@playwright/mcp/node_modules/playwright'),
  join(homedir(), '.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright'),
  '/usr/lib/node_modules/@playwright/mcp/node_modules/playwright',
];

export async function loadChromium() {
  for (const candidate of CANDIDATES) {
    try {
      return require(candidate).chromium;
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'Playwright not found. Install it with `npm i -D playwright && npx playwright install chromium`, ' +
      'or set PW_EXECUTABLE to a Chromium binary and make `playwright` resolvable.',
  );
}

/**
 * Playwright pins an exact browser build and refuses to start if that precise
 * revision is missing, which is a common state on a machine that has several
 * Playwright versions installed. Any recent headless Chromium runs these checks
 * correctly, so fall back to the newest one present instead of demanding a
 * download mid-review.
 */
export function findChromiumExecutable() {
  if (process.env.PW_EXECUTABLE) return process.env.PW_EXECUTABLE;

  const roots = [
    join(process.env.LOCALAPPDATA ?? '', 'ms-playwright'),
    join(homedir(), '.cache/ms-playwright'),
    join(homedir(), 'Library/Caches/ms-playwright'),
  ].filter((p) => p && existsSync(p));

  const binaries = [];
  for (const root of roots) {
    for (const entry of readdirSync(root)) {
      const build = Number((entry.match(/-(\d+)$/) ?? [])[1] ?? 0);
      for (const rel of [
        'chrome-headless-shell-win64/chrome-headless-shell.exe',
        'chrome-win/chrome.exe',
        'chrome-headless-shell-linux/chrome-headless-shell',
        'chrome-linux/chrome',
        'chrome-headless-shell-mac/chrome-headless-shell',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      ]) {
        const full = join(root, entry, rel);
        if (existsSync(full)) binaries.push({ full, build });
      }
    }
  }
  binaries.sort((a, b) => b.build - a.build);
  return binaries[0]?.full; // undefined => let Playwright use its own default
}

export async function launch() {
  const chromium = await loadChromium();
  const executablePath = findChromiumExecutable();
  return chromium.launch(executablePath ? { executablePath } : {});
}

export const BASE = process.env.BASE || 'http://localhost:3001';

/** Every page in the app. The nav is the contract; nothing here may 404. */
export const ROUTES = [
  '/', '/judge-mode', '/arena', '/simulator', '/defense',
  '/transactions', '/ledger', '/tokens', '/agents', '/threat-intel',
  '/detection', '/fidelity', '/explainability', '/ai',
  '/policy', '/audit', '/replay', '/settings',
];

export function reporter() {
  const results = [];
  return {
    results,
    ok(name, detail = '') {
      results.push({ pass: true, name, detail });
      console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
    },
    fail(name, detail = '') {
      results.push({ pass: false, name, detail });
      console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    },
    /** Prints the tally and sets a non-zero exit code if anything failed. */
    finish() {
      const failed = results.filter((r) => !r.pass);
      console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
      if (failed.length) {
        console.log('FAILED:');
        for (const f of failed) console.log(`  - ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
        process.exitCode = 1;
      }
      return failed.length === 0;
    },
  };
}

/** Navigates, tolerating a slow first compile in dev mode. */
export async function goto(page, route) {
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
  }
  await page.waitForTimeout(800);
}
