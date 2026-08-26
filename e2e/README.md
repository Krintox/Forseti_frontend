# FORSETI end-to-end checks

Two headless-browser suites that run against a **live** stack (backend on
`:8000`, frontend dev or production server on `:3001`). They exist because the
repository had 341 backend tests and nothing at all covering the surface a judge
actually touches — and the first run of them found four real defects that no
backend test could have caught:

| Found by | Defect |
|---|---|
| `responsive.mjs` | The sidebar was a fixed `w-60 shrink-0` at every width, leaving ~150 px of usable content on a 390 px viewport and pushing five pages past the right edge. |
| `responsive.mjs` | The Explainability SHAP rows reserved 224 px + 80 px of fixed-width columns, overflowing any phone. |
| `functional.mjs` | The Policy Center kept its own hand-written copy of the escalation ladder. It had drifted: `AGENT_SUSPENDED`, the top rung, was missing, so the most severe state in the system rendered as *no active policy at all*. |
| `functional.mjs` | Killing a client mid-campaign latched `is_running` on the server, disabling every control in the UI until the process was restarted. |

## Running them

```bash
# 1. backend
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 2. frontend
cd frontend && npm run dev          # serves :3001

# 3. checks
cd frontend
node e2e/responsive.mjs             # 72 checks: 18 routes x 4 viewports, overflow + console errors
node e2e/functional.mjs             # 39 checks: content, live SSE, a real attack, a real campaign
```

Both exit non-zero on failure, so they can gate a build.

Set `BASE` to point at another origin (default `http://localhost:3001`) and
`PW_EXECUTABLE` to a specific Chromium binary if Playwright's default download
is not present.

## What `responsive.mjs` asserts

For each of the 18 routes at 390 / 768 / 1366 / 1920 px:

- `documentElement.scrollWidth == clientWidth` — the page body never scrolls
  horizontally. Elements inside a deliberate `overflow-x: auto` container (the
  attack-flow canvas, wide tables) are excluded, because scrolling *inside* a
  box is a design decision; scrolling the whole page is a bug.
- Zero console errors.

When it fails it names the offending element, its computed right edge and the
first 48 characters of its text, so the fix is not a hunt.

## What `functional.mjs` asserts

- Every route renders real content — not a spinner, not a blank shell, and with
  no `undefined` / `NaN` / `[object Object]` reaching the DOM. That last check is
  what catches a renamed backend field before a judge does.
- The SSE stream reports connected.
- A real flagship attack runs end to end, and the UI reports **which step**
  detection landed on rather than a wall-clock figure from the animation timer.
- The flagship's legs are uneven — a regression guard on the generator, which
  used to split a round number into three identical amounts.
- A 17-vector campaign exercises more than one authority dimension and drives
  Blue's policy off `STANDARD`.
- The Policy Center highlights whatever policy is actually active, and its
  ladder contains the top rung.
- Quantum Audit discloses key provenance instead of implying an HSM.
- No `1.0000` perfect-score artifact is on screen anywhere.
