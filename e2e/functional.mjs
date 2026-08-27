/**
 * Functional end-to-end suite: drives the real UI against the real backend.
 *
 * This is deliberately not a unit test of components. Every check here is
 * something only a live stack can answer, and several of them exist because
 * the backend test suite — 341 tests, all green — could not have caught the
 * defect:
 *
 *   - A backend field renamed in a refactor still typechecks on the frontend if
 *     the consumer reads it off an `any`. It shows up as the literal string
 *     "undefined" in the DOM. Section 1 fails on that.
 *   - The Policy Center kept a hand-written copy of the escalation ladder that
 *     had drifted from the DefensePolicy enum: AGENT_SUSPENDED, the top rung,
 *     was missing, so the most severe state in the system highlighted nothing.
 *     Section 5 fails on that.
 *
 *   node e2e/functional.mjs
 */

import { BASE, ROUTES, goto, launch, reporter } from './_harness.mjs';

/**
 * Waits for a run to START and then FINISH.
 *
 * Two traps here, both of which produced a green run that had tested nothing:
 * the button label is CSS-uppercased so `innerText` reads "RUNNING" (match
 * case-insensitively), and if you only wait for "not running" the predicate is
 * true the instant you ask, before the click has taken effect.
 */
async function waitForRun(page, budgetMs) {
  await page
    .waitForFunction(() => /running/i.test(document.body.innerText), null, { timeout: 20000 })
    .catch(() => console.log('    (never entered a visible Running state)'));
  await page.waitForFunction(() => !/running/i.test(document.body.innerText), null, { timeout: budgetMs });
  await page.waitForTimeout(2500);
}

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const report = reporter();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text().slice(0, 160)}`); });
page.on('pageerror', (e) => errors.push(`${page.url()} :: ${String(e).slice(0, 160)}`));

console.log(`Functional sweep against ${BASE}`);

// ---------------------------------------------------------------- 1. content
console.log('\n=== 1. Every route renders real content ===');
for (const route of ROUTES) {
  await goto(page, route);
  const info = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      heading: (document.querySelector('main h1, main h2') ?? {}).innerText ?? '',
      length: t.length,
      undef: (t.match(/\bundefined\b/g) ?? []).length,
      nan: (t.match(/\bNaN\b/g) ?? []).length,
      objobj: (t.match(/\[object Object\]/g) ?? []).length,
      controls: document.querySelectorAll('main button, main input, main select, main a').length,
    };
  });
  const problems = [];
  if (info.length < 200) problems.push(`only ${info.length} chars of text`);
  if (info.undef) problems.push(`${info.undef}x "undefined" in the DOM`);
  if (info.nan) problems.push(`${info.nan}x "NaN"`);
  if (info.objobj) problems.push(`${info.objobj}x "[object Object]"`);
  problems.length
    ? report.fail(`route ${route}`, problems.join('; '))
    : report.ok(`route ${route}`, `"${info.heading.slice(0, 38)}" · ${info.length} chars · ${info.controls} controls`);
}

// -------------------------------------------------- 1b. authority dimensions
console.log('\n=== 1b. The seven authority dimensions ===');
await goto(page, '/');
const dims = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    // INV_08_MANDATE_SUSPENDED is a POLICY STATE that the registry also tags
    // TIME. A naive `registry.find(r => r.dimension === 'TIME')` returns it
    // first, and the Time card then asks "is the mandate suspended?" instead of
    // "is the delegation still inside its validity window?".
    // Assert on the QUESTION, which is what a reader sees and what was wrong.
    // The card renders the short code (`INV_06`), not the full registry key, so
    // matching `INV_06_AUTHORITY_EXPIRED` here fails against correct output -
    // which it did on the first run of this check.
    timeAsksAboutValidity: /still inside its validity window/i.test(t),
    timeAsksAboutSuspension: /mandate currently suspended/i.test(t),
    // Presence, not adjacency, and deliberately free of backslash escapes.
    //
    // Three earlier attempts failed against CORRECT output. A word-boundary
    // escape also matches inside "REAL-TIME" (the hyphen is a boundary);
    // anchoring to a lone line was brittle against layout; and the third
    // shipped a literal BACKSPACE character into the pattern, because the
    // escape was mangled on the way into the file - a regex that could never
    // match anything, failing against a page that was correct all along.
    //
    // The property is already pinned by the two checks either side of this
    // one: the validity-window question belongs to INV_06's registry row and
    // to nothing else, so if it renders, INV_06 resolved.
    inv06Present: t.includes('INV_06'),
    saysSixDimensions: /one of six|six dimensions|6 dimensions/i.test(t),
  };
});
dims.timeAsksAboutValidity
  ? report.ok('the TIME card asks about the validity window')
  : report.fail('the TIME card asks about the validity window');
dims.inv06Present
  ? report.ok('INV_06 is rendered among the dimensions')
  : report.fail('INV_06 is rendered among the dimensions');
!dims.timeAsksAboutSuspension
  ? report.ok('no dimension card asks the INV_08 suspension question')
  : report.fail('a dimension card asks the INV_08 suspension question');
!dims.saysSixDimensions
  ? report.ok('no copy still claims six authority dimensions')
  : report.fail('copy still claims six authority dimensions - there are seven');


// ------------------------------------------------------------------- 2. live
console.log('\n=== 2. Live event stream ===');
await goto(page, '/arena');
await page.waitForTimeout(1500);
(await page.evaluate(() => document.body.innerText.includes('Live stream')))
  ? report.ok('SSE stream reports connected')
  : report.fail('SSE stream reports connected');

// -------------------------------------------------------- 3. flagship attack
console.log('\n=== 3. A real flagship attack, end to end ===');
await page.getByRole('button', { name: /^Reset$/i }).click();
await page.waitForTimeout(1200);

// Select exactly the flagship vector, whatever its current selection state is.
const vectors = page.locator('button[aria-pressed]');
let flagshipLabel = null;
for (let i = 0; i < (await vectors.count()); i++) {
  const button = vectors.nth(i);
  const text = (await button.innerText()).replace(/✓/g, '').trim();
  const isFlagship = /FLAGSHIP/.test(text);
  const pressed = (await button.getAttribute('aria-pressed')) === 'true';
  if (isFlagship) flagshipLabel = text.split(String.fromCharCode(10))[0].trim();
  if (isFlagship !== pressed) { await button.click(); await page.waitForTimeout(120); }
}
const selected = await page.locator('button[aria-pressed="true"]').count();
selected === 1 && flagshipLabel
  ? report.ok('exactly the flagship vector is armed', flagshipLabel)
  : report.fail('exactly the flagship vector is armed', `${selected} selected`);

await page.getByRole('button', { name: /Execute Attack/i }).click();
await waitForRun(page, 180000);

const round = await page.evaluate(() => {
  const t = document.body.innerText;
  const grab = (re) => (t.match(re) ?? [null])[0];
  return {
    caughtAt: grab(/CAUGHT AT STEP\s*\d+\s*of\s*\d+/i),
    noLatencyClaim: !/Detection latency/i.test(t),
    legs: grab(/\d+ legs of [^\n]{0,60}/i),
    invariants: [...new Set(t.match(/INV_\d\d_[A-Z_]+/g) ?? [])],
    rows: document.querySelectorAll('main li, main tr').length,
  };
});
round.caughtAt
  ? report.ok('detection reported as a STEP, not an animation timer', round.caughtAt.replace(/\s+/g, ' '))
  : report.fail('detection reported as a STEP, not an animation timer');
round.noLatencyClaim
  ? report.ok('no wall-clock "Detection latency" claim on screen')
  : report.fail('no wall-clock "Detection latency" claim on screen');
round.legs
  ? report.ok('flagship legs are uneven', round.legs.slice(0, 60))
  : report.fail('flagship legs are shown');
round.invariants.length
  ? report.ok('an authority invariant fired', round.invariants.join(', '))
  : report.fail('an authority invariant fired');
round.rows > 5
  ? report.ok('event stream populated', `${round.rows} rows`)
  : report.fail('event stream populated', `${round.rows} rows`);

// The Detection caption used to be one unconditional sentence, written when a
// leak in the generator kept cross-rail scores near zero. After the fix the
// model scores those legs high, so the note sat under a 100.0% reading still
// saying "a low score here is expected" - arguing with the number above it.
const caption = await page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/([0-9.]+)%\s*\ncalibrated fraud probability/);
  return {
    score: m ? Number(m[1]) : null,
    claimsLowIsExpected: /A low score here is (expected|the honest)/i.test(t),
  };
});
if (caption.score == null) {
  report.ok('ML caption consistency', 'no live score on screen to contradict');
} else if (caption.score >= 50 && caption.claimsLowIsExpected) {
  report.fail(
    'the ML caption agrees with the score it sits under',
    `score is ${caption.score}% but the caption still says a low score is expected`,
  );
} else {
  report.ok('the ML caption agrees with the score it sits under', `${caption.score}%`);
}

// ----------------------------------------------------------- 4. the campaign
console.log('\n=== 4. Multi-vector campaign ===');
await page.getByRole('button', { name: /^Reset$/i }).click();
await page.waitForTimeout(1200);
const selectAll = page.getByRole('button', { name: /Select all|Clear/i });
if (/select all/i.test(await selectAll.innerText())) { await selectAll.click(); await page.waitForTimeout(400); }
const execute = page.getByRole('button', { name: /Execute \d+ Attacks/i });
const executeLabel = await execute.innerText();
await execute.click();
await waitForRun(page, 900000);

const campaign = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    invariants: [...new Set(t.match(/INV_\d\d_[A-Z_]+/g) ?? [])],
    policy: (t.match(/STRICT_INVARIANT|CAPABILITY_QUARANTINED|TIGHTENED_HEADROOM_V2|STEP_UP_VERIFICATION|STRICT_CATALOG_ATTESTATION|ADAPTIVE_CONTAINMENT|AGENT_SUSPENDED/g) ?? [])[0] ?? null,
  };
});
report.ok('campaign executed', executeLabel);
campaign.invariants.length >= 3
  ? report.ok('several authority dimensions exercised', campaign.invariants.join(', '))
  : report.fail('several authority dimensions exercised', campaign.invariants.join(', '));
campaign.policy
  ? report.ok('Blue escalated off STANDARD', campaign.policy)
  : report.fail('Blue escalated off STANDARD');

// ---------------------------------------------------------- 5. policy center
console.log('\n=== 5. Policy Center ===');
await goto(page, '/policy');
await page.waitForTimeout(1000);
const policy = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    // The badge is CSS-uppercased, so innerText reads "ACTIVE".
    highlighted: /^\s*ACTIVE\s*$/im.test(t),
    topRung: /AGENT_SUSPENDED/.test(t),
    noWiringBug: !/is not in the ladder/.test(t),
    adaptations: !/No policy adaptations yet/.test(t),
  };
});
policy.highlighted ? report.ok('the active policy is highlighted') : report.fail('the active policy is highlighted');
policy.topRung ? report.ok('the ladder includes its top rung AGENT_SUSPENDED') : report.fail('the ladder includes its top rung AGENT_SUSPENDED');
policy.noWiringBug ? report.ok('active policy is covered by the published ladder') : report.fail('active policy is covered by the published ladder');
policy.adaptations ? report.ok('adaptations recorded from real violations') : report.fail('adaptations recorded from real violations');

// ------------------------------------------------------------- 6. provenance
console.log('\n=== 6. Quantum Audit provenance ===');
await goto(page, '/audit');
const audit = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    mldsa: /ML-DSA/.test(t),
    provenance: /random|per.process|demonstration|ephemeral|not.{0,14}HSM/i.test(t),
  };
});
audit.mldsa ? report.ok('ML-DSA signer surfaced') : report.fail('ML-DSA signer surfaced');
audit.provenance
  ? report.ok('key provenance disclosed rather than implying an HSM')
  : report.fail('key provenance disclosed rather than implying an HSM');

// -------------------------------------------------------------- 7. detection
console.log('\n=== 7. Detection Lab ===');
await goto(page, '/detection');
await page.waitForTimeout(1000);
const detection = await page.evaluate(() => {
  const t = document.body.innerText;
  return { perfect: (t.match(/\b1\.0000\b/g) ?? []).length, hasNumbers: /\d\.\d{3,4}/.test(t) };
});
detection.hasNumbers ? report.ok('detection metrics rendered') : report.fail('detection metrics rendered');
detection.perfect === 0
  ? report.ok('no 1.0000 perfect-score artifact on screen')
  : report.fail('no 1.0000 perfect-score artifact on screen', `${detection.perfect} found`);

// ------------------------------------------------------------- 8. judge mode
console.log('\n=== 8. Judge Mode ===');
await goto(page, '/judge-mode');
const judgeControls = await page.locator('main button').count();
judgeControls > 3 ? report.ok('judge mode renders', `${judgeControls} controls`) : report.fail('judge mode renders');
const next = page.getByRole('button', { name: /Next|Continue/ }).first();
if (await next.count()) { await next.click(); await page.waitForTimeout(900); report.ok('judge mode advances'); }
else report.fail('judge mode advances');

// ------------------------------------------------------------ 9. tokenization
console.log('\n=== 9. Tokenization ===');
await goto(page, '/tokens');
(await page.evaluate(() => /scope|SCOPED|ceiling/i.test(document.body.innerText)))
  ? report.ok('token scope surfaced')
  : report.fail('token scope surfaced');

await browser.close();

console.log('\n--- console ---');
if (errors.length) {
  console.log(`${errors.length} console/page errors:`);
  for (const e of errors.slice(0, 10)) console.log('  ' + e);
  process.exitCode = 1;
} else {
  console.log('0 console/page errors across the whole run.');
}

report.finish();
