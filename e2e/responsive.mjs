/**
 * Responsive regression suite.
 *
 * Asserts one property, on every route, at four viewport widths: the page body
 * never scrolls horizontally. That single property is what a judge on a phone
 * experiences as "this is broken", and it is trivially violated by any
 * fixed-width element — which is exactly how it was violated here (a
 * `w-60 shrink-0` sidebar, and a SHAP row reserving 304 px of fixed columns).
 *
 * Content inside a deliberate `overflow-x: auto` container is excluded.
 * Scrolling INSIDE a box — a wide table, the attack-flow canvas — is a design
 * decision. Scrolling the whole document is a defect.
 *
 *   node e2e/responsive.mjs
 */

import { BASE, ROUTES, gotoWithStatus, launch, reporter } from './_harness.mjs';

const VIEWPORTS = [
  { w: 390, h: 844, name: 'mobile' },   // iPhone 15
  { w: 768, h: 1024, name: 'tablet' },  // iPad portrait
  { w: 1366, h: 768, name: 'laptop' },
  { w: 1920, h: 1080, name: 'desktop' },
];

/** Runs in the page. Returns the overflow and, if any, who caused it. */
function measureOverflow() {
  const de = document.documentElement;
  const overflow = de.scrollWidth - de.clientWidth;
  if (overflow <= 0) return { overflow: 0, offenders: [] };

  const vw = de.clientWidth;
  const scrolls = (el) => {
    const s = getComputedStyle(el);
    return s.overflowX === 'auto' || s.overflowX === 'scroll';
  };

  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    if (box.right <= vw + 1) continue;
    if (scrolls(el)) continue;

    let ancestor = el.parentElement;
    let contained = false;
    while (ancestor) {
      if (scrolls(ancestor)) { contained = true; break; }
      ancestor = ancestor.parentElement;
    }
    if (contained) continue;

    const cls = el.className?.baseVal ?? String(el.className ?? '');
    offenders.push({
      tag: el.tagName.toLowerCase(),
      cls: cls.slice(0, 90),
      right: Math.round(box.right),
      width: Math.round(box.width),
      text: (el.textContent ?? '').trim().slice(0, 48),
    });
  }
  return { overflow, offenders: offenders.slice(0, 6) };
}

const browser = await launch();
const report = reporter();
const consoleErrors = [];

console.log(`Responsive sweep against ${BASE}\n`);

for (const vp of VIEWPORTS) {
  console.log(`--- ${vp.name} (${vp.w}x${vp.h}) ---`);
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${vp.name} ${page.url()} :: ${m.text().slice(0, 160)}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`${vp.name} ${page.url()} :: ${String(e).slice(0, 160)}`));

  for (const route of ROUTES) {
    let result;
    try {
      const status = await gotoWithStatus(page, route);
      if (status !== null && status >= 400) {
        // Without this, a 404 page scores a clean pass: it has no wide content
        // to overflow. A stale dev server once returned 404 on 17 of 18 routes
        // and this suite still reported 72/72.
        report.fail(`${vp.name} ${route}`, `HTTP ${status} — route did not render`);
        continue;
      }
      result = await page.evaluate(measureOverflow);
    } catch (e) {
      report.fail(`${vp.name} ${route}`, String(e).slice(0, 90));
      continue;
    }

    if (result.overflow > 0) {
      report.fail(`${vp.name} ${route}`, `body overflows by ${result.overflow}px`);
      for (const o of result.offenders) {
        console.log(`         <${o.tag}> right=${o.right} w=${o.width} "${o.text}" .${o.cls}`);
      }
    } else {
      report.ok(`${vp.name} ${route}`);
    }
  }
  await context.close();
}

await browser.close();

console.log('\n--- console ---');
if (consoleErrors.length) {
  console.log(`${consoleErrors.length} console/page errors:`);
  for (const e of consoleErrors.slice(0, 15)) console.log('  ' + e);
  process.exitCode = 1;
} else {
  console.log('0 console/page errors across all routes and widths.');
}

report.finish();
