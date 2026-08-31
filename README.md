# FORSETI dashboard

The web prototype for FORSETI, a cross-rail delegated authority layer for agentic payments.

- Live: https://forseti-frontend.vercel.app
- API: https://forseti-backend.onrender.com
- Engine and research code: https://github.com/Krintox/forseti_backend

Built for the Mastercard Innovation Challenge at Global Fintech Fest 2026.

## The one thing to know about this UI

It holds no state of its own.

Every arrow, amount, verdict and log line on the Live Arena page is rendered from a structured
event the backend actually emitted over a WebSocket. There is no scripted animation timeline and
no seeded demo data in the client. If the engine disagrees with the picture, the picture is wrong
and it will show that, which is the point.

`/api/arena/verify-log` recomputes the hash chain over the event log and will name the exact index
of any tampering, so the stream a reviewer watches can be checked rather than trusted.

Metric pages behave the same way. They read artifacts produced by the pipeline in the backend
repo. Where a measurement has not been run, the page says `NOT RUN` instead of showing a
plausible number.

## Pages

| Route | What it shows |
|---|---|
| `/` | Thesis, the live grant across all seven authority dimensions, system health |
| `/judge-mode` | A guided path through the evidence, for a reviewer with limited time |
| `/arena` | The live attack, streamed. Editable ceiling, rail scope, speed control, DTL on and off |
| `/simulator` | 17 executable attack vectors, plus the researched catalogue with scope and provenance flags |
| `/defense` | The seven invariants and the graduated response ladder |
| `/transactions` | Per-transaction rail verdict against the authority verdict |
| `/ledger` | Two-phase exposure, scope, manual limit control |
| `/tokens` | Token lifecycle and re-scoping when a grant narrows |
| `/agents` | Red strategy scoring and Blue policy adaptation between rounds |
| `/threat-intel` | Coverage by channel and attack surface |
| `/detection` | PR-AUC, baselines, ablation, held-out families |
| `/fidelity` | KS, correlation, discriminator, TSTR, or an honest `NOT RUN` |
| `/explainability` | SHAP, global and per transaction |
| `/ai` | The advisory helper layer, none of which can authorise anything |
| `/policy` | Active delegation policy and its adaptations |
| `/audit` | ML-DSA-44 signature and live tamper tests |
| `/replay` | Deterministic replay from the recorded event log |
| `/settings` | Environment, artifact status, regeneration commands |

## Run it

```bash
npm install
npm run dev
```

Opens on port 3005. Point it at a backend with `NEXT_PUBLIC_API_URL`, which defaults to the
deployed API. To run the whole thing locally, start the backend first from the engine repo, then
set `NEXT_PUBLIC_API_URL=http://localhost:8000`.

```bash
npm run build     # production build
npm run lint
npx playwright test   # end to end specs in e2e/
```

## Stack

Next.js App Router, React, TypeScript, Tailwind. Live data arrives over a WebSocket through
`app/lib/ArenaProvider.tsx`. Artifact-backed pages go through `app/lib/useArtifact.ts`, which is
what enforces the `NOT RUN` behaviour rather than each page deciding for itself.
