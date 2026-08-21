'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

/**
 * The one-line verdict for the round that just finished.
 *
 * This exists because the most important thing FORSETI demonstrates is easy to
 * miss in a scrolling log: an agent can stay UNDER the delegated budget, get a
 * yes from every payment rail it touches, score as ordinary to a trained
 * fraud model — and still be acting outside the authority a human granted.
 *
 * Every figure here is read from the event stream the backend emitted this
 * round. Nothing is precomputed and nothing is asserted that the events do not
 * already contain.
 */

const DIMENSION_COPY: Record<string, { label: string; because: string }> = {
  AMOUNT: { label: 'Amount', because: 'aggregate spend across every rail exceeded the grant' },
  PER_TX: { label: 'Per-transaction', because: 'a single transaction exceeded the per-action bound' },
  RAIL: { label: 'Rail', because: 'the agent used a payment rail the user never authorised' },
  MERCHANT: { label: 'Merchant', because: 'the merchant category sits outside the delegated scope' },
  PURPOSE: { label: 'Purpose', because: 'the basket converts the budget into value outside the stated purpose' },
  TIME: { label: 'Time', because: 'the delegation had already expired' },
};

export function VerdictBanner() {
  const { events, lastRound } = useArena();
  // Unified Risk Engine: a composite synthesis of signals other modules
  // already computed for this round, not a new detector - see
  // backend/app/risk_engine/risk.py. Round-level, not event-level, so it
  // comes from lastRound (set the same moment the round's final events
  // arrive) rather than being derivable from the event stream itself.
  const risk = lastRound?.risk;

  const verdict = useMemo(() => {
    const complete = [...events].reverse().find((e) => e.event_type === 'ATTACK_COMPLETE');
    if (!complete) return null;

    const p = complete.payload ?? {};
    const outcome: string = p.outcome ?? (p.detected ? 'CONTAINED' : 'UNCHECKED_BREACH');

    // Only consider the events belonging to the round that just finished.
    const startIdx = (() => {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].event_type === 'ROUND_STARTED' || events[i].event_type === 'AUTHORITY_GRANTED') {
          // walk back to the earliest of the pair
          let j = i;
          while (j > 0 && ['ROUND_STARTED', 'AUTHORITY_GRANTED'].includes(events[j - 1].event_type)) j--;
          return j;
        }
      }
      return 0;
    })();
    const round = events.slice(startIdx);

    const approvals = round.filter((e) => e.event_type === 'RAIL_APPROVED');
    const violation = round.find((e) => e.event_type === 'INVARIANT_VIOLATION');
    // What the attacker set out to move, before anything was refused. This is
    // the number that makes the point airtight on a scope violation: even the
    // FULL objective sat inside the delegated budget, so no amount-based
    // control anywhere in the stack could have fired on it.
    const started = round.find((e) => e.event_type === 'ATTACK_STARTED');
    const attempted = Number(started?.payload?.total_objective_amount ?? 0);
    const mlScores = round
      .filter((e) => e.event_type === 'ML_SCORE' && typeof e.payload?.probability === 'number')
      .map((e) => e.payload.probability as number);
    const maxMl = mlScores.length ? Math.max(...mlScores) : null;

    return {
      outcome,
      strategy: String(p.strategy ?? '').replace(/_/g, ' '),
      exposure: Number(p.final_exposure ?? 0),
      ceiling: Number(p.ceiling ?? 0),
      breached: Boolean(p.breached),
      railsApproved: approvals.length,
      railNames: approvals.map((e) => String(e.payload?.rail ?? '').replace(/_/g, ' ')),
      attempted,
      invariant: violation?.payload?.invariant_code as string | undefined,
      dimension: violation?.payload?.authority_dimension as string | undefined,
      explanation: violation?.payload?.explanation as string | undefined,
      maxMl,
    };
  }, [events]);

  if (!verdict) return null;

  const { outcome, exposure, ceiling, breached, railsApproved, invariant, dimension, maxMl, attempted } =
    verdict;
  // Each clause of the headline has to be independently TRUE, or the banner
  // ends up asserting things the round disproves - claiming "under budget" for
  // a ₹9,500 attempt against a ₹9,000 grant, or "the model saw nothing" while
  // the ML column right beside it reads 100% FLAGGED.
  const shown = attempted > 0 ? attempted : exposure;
  const moneyWouldNotFire = ceiling > 0 && shown <= ceiling && !breached;
  const everyRailApproved = railsApproved > 0;
  const modelSawNothing = maxMl !== null && maxMl < 0.5;

  // The headline case is specifically the paradox: nothing an amount-based
  // control could see, yet still outside the granted authority.
  const paradox = outcome === 'CONTAINED' && moneyWouldNotFire;

  const clauses = [
    attempted > 0
      ? `the agent's entire ${inr(attempted)} objective fitted inside the ${inr(ceiling)} grant`
      : `spend stayed inside the ${inr(ceiling)} grant`,
    everyRailApproved ? 'every rail approved' : null,
    modelSawNothing ? 'the model saw nothing' : null,
  ].filter(Boolean) as string[];
  const headlineClause =
    clauses.length === 1
      ? clauses[0]
      : `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;

  const tone =
    outcome === 'CONTAINED'
      ? paradox
        ? 'emerald'
        : 'blue'
      : outcome === 'UNCHECKED_BREACH'
        ? 'rose'
        : 'slate';

  const ring = {
    emerald: 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50',
    blue: 'border-blue-300 bg-gradient-to-r from-blue-50 via-white to-blue-50',
    rose: 'border-rose-300 bg-gradient-to-r from-rose-50 via-white to-rose-50',
    slate: 'border-slate-200 bg-slate-50',
  }[tone];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${outcome}-${invariant ?? 'none'}-${exposure}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-2xl border p-4 shadow-sm ${ring}`}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-2">
            {outcome === 'CONTAINED' ? (
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : outcome === 'UNCHECKED_BREACH' ? (
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-500" />
            )}
            <p className="text-[13px] font-black uppercase tracking-wide text-slate-900">
              {outcome === 'CONTAINED'
                ? 'Contained'
                : outcome === 'UNCHECKED_BREACH'
                  ? 'Breached — no global check'
                  : 'No violation'}
            </p>
          </div>

          {/* What every other control in the stack saw. */}
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
            <Fact
              label={attempted > 0 ? 'Attempted / granted' : 'Aggregate spend'}
              value={`${inr(shown)} of ${inr(ceiling)}`}
              verdict={moneyWouldNotFire ? 'FITS THE BUDGET' : 'EXCEEDS THE GRANT'}
              ok={moneyWouldNotFire}
            />
            <Fact
              label="Payment rails"
              value={`${railsApproved} approved`}
              verdict={railsApproved > 0 ? 'ALL SAID YES' : '—'}
              ok={railsApproved === 0}
            />
            <Fact
              label="ML risk score"
              value={maxMl === null ? 'not scored' : `${(maxMl * 100).toFixed(1)}%`}
              verdict={maxMl === null ? '—' : maxMl >= 0.5 ? 'FLAGGED' : 'LOOKS ORDINARY'}
              ok={maxMl !== null && maxMl >= 0.5}
            />
            {risk && (
              <Fact
                label="Unified risk"
                value={`${(risk.overall_risk_score * 100).toFixed(0)}%`}
                verdict={risk.deterministic_override ? 'DTL DECIDED' : 'synthesis only'}
                ok={risk.deterministic_override}
              />
            )}
          </div>
        </div>

        {paradox && dimension && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-300 bg-white/80 px-4 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <p className="text-[12.5px] leading-relaxed text-slate-800">
              <span className="font-black text-emerald-800">
                Even though {headlineClause} — FORSETI blocked it anyway.
              </span>{' '}
              The agent broke the <strong>{DIMENSION_COPY[dimension]?.label ?? dimension}</strong>{' '}
              dimension of the grant: {DIMENSION_COPY[dimension]?.because ?? 'it acted outside the delegated authority'}.
              <span className="ml-1 font-mono text-[11px] text-slate-500">({invariant})</span>
            </p>
          </div>
        )}

        {outcome === 'CONTAINED' && !paradox && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-slate-700">
            {everyRailApproved
              ? 'Each leg was legal on the rail that approved it. '
              : ''}
            The grant was still exceeded on the{' '}
            <strong>{DIMENSION_COPY[dimension ?? '']?.label ?? dimension ?? 'authority'}</strong>{' '}
            dimension: {DIMENSION_COPY[dimension ?? '']?.because ?? 'the agent acted outside its delegated authority'}
            {' '}— the view no single rail can compute.
            <span className="ml-1 font-mono text-[11px] text-slate-500">({invariant})</span>
          </p>
        )}

        {outcome === 'WITHIN_AUTHORITY' && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-slate-700">
            The agent stayed inside every dimension of the grant, so nothing fired. This is the
            system working, not a miss — FORSETI only intervenes when delegated authority is
            actually exceeded.
          </p>
        )}

        {outcome === 'UNCHECKED_BREACH' && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-slate-700">
            DTL defence was disabled for this round, so nothing aggregated the rails. This is the
            legacy comparison: every rail approved, and the breach completed.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Fact({
  label,
  value,
  verdict,
  ok,
}: {
  label: string;
  value: string;
  verdict: string;
  ok: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-[13px] font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`text-[9.5px] font-bold uppercase ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
        {verdict}
      </p>
    </div>
  );
}
