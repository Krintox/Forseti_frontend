'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';
import { Badge } from './ui';

/**
 * Slide-over that explains ONE architecture component: what it is, what it is
 * responsible for, and its current live state.
 *
 * This is deliberately NOT the same thing as EventInspector. EventInspector
 * explains a single thing that already happened (one log line). This explains
 * a standing part of the system - so it always has something to show, even
 * before any attack has run, built entirely from state already flowing
 * through useArena(). Nothing here is invented for the panel.
 */

interface NodeMeta {
  title: string;
  kicker: string;
  role: string;
  inputs: string;
  outputs: string;
}

const NODE_META: Record<string, NodeMeta> = {
  principal: {
    title: 'User Grant',
    kicker: 'The delegation itself',
    role: 'The authority a human actually handed the agent - not just a spend ceiling, but a grant with six independent dimensions: amount, per-transaction size, permitted rails, merchant scope, economic purpose, and a validity window.',
    inputs: 'A natural-language or structured instruction from the principal (e.g. "₹12,000 for groceries, UPI only, this week").',
    outputs: 'The authority vector every invariant below is checked against.',
  },
  red_agent: {
    title: 'Red Agent',
    kicker: 'Adversarial test harness',
    role: 'An autonomous agent that holds a real (or stolen/over-extended) delegation and tries to spend outside it - across amount, rail, merchant, purpose or time - while staying legal on whichever single rail it touches.',
    inputs: 'The current delegated authority and the outcome of its last attempt (closed-loop adaptation).',
    outputs: 'A transaction: rail, amount, merchant and basket, aimed at one authority dimension.',
  },
  card_token: {
    title: 'Card Rail',
    kicker: 'Card-tokenization-inspired adapter (MDES concept)',
    role: 'Enforces only its own local rules: per-cycle limit, merchant validity, signature. It has no visibility into UPI or agentic spend, and no idea whether the delegation even permits card at all.',
    inputs: 'One transaction at a time.',
    outputs: 'A local APPROVE/DECLINE - correct in isolation, blind in aggregate.',
  },
  upi_circle: {
    title: 'UPI Rail',
    kicker: 'UPI-Circle-inspired delegation adapter (NPCI OC 201-B concept)',
    role: 'Enforces the local UPI delegate mandate and per-cycle cap. Like every rail, it cannot see spend on the other two rails, and does not know if the human restricted the grant to this rail alone or excluded it entirely.',
    inputs: 'One transaction at a time.',
    outputs: 'A local APPROVE/DECLINE.',
  },
  agentic_ap2: {
    title: 'Agentic Rail',
    kicker: 'AP2-style intent/cart adapter',
    role: 'Models an agent-native payment protocol carrying cart contents alongside the transaction. Still only a local check - the same blind spot as the other two rails.',
    inputs: 'One transaction at a time, plus cart contents.',
    outputs: 'A local APPROVE/DECLINE.',
  },
  dtl: {
    title: 'FORSETI DTL',
    kicker: 'Delegation-Trust Ledger — global authority check',
    role: 'The one component that sees every rail at once. It does not just sum a budget: it evaluates the transaction against all six dimensions of the grant - amount, per-transaction cap, rail, merchant, purpose, time - deterministically, with no ML and no training data required.',
    inputs: 'A transaction plus the live authority state (all rails, all dimensions).',
    outputs: 'A proof naming exactly which dimension(s) were violated, or a clean pass.',
  },
  ml_detector: {
    title: 'ML Detector',
    kicker: 'Trained gradient-boosted classifier + SHAP',
    role: 'Scores each transaction for behavioural and semantic risk patterns the deterministic invariants do not encode - drift in velocity, merchant risk, basket composition. It sees one transaction at a time, so a single leg of a cross-rail split still scores low: that is honest, and it is exactly the gap the DTL exists to close.',
    inputs: '29 engineered features spanning the transaction, the delegation and cross-rail context.',
    outputs: 'A calibrated fraud probability plus a SHAP attribution for it.',
  },
  cost_governor: {
    title: 'Cost Governor',
    kicker: 'Graceful, proportionate containment',
    role: "Turns a proven violation into the smallest sufficient response, chosen by WHICH dimension failed: a rail violation blocks nothing against the ceiling and leaves the permitted rails untouched; a purpose violation splits the basket and clears the genuine portion; an amount violation caps at real headroom; a time violation holds for re-consent. It never locks the user out of their own account.",
    inputs: 'A violation proof naming the failed dimension.',
    outputs: 'A containment action and, where relevant, a policy change.',
  },
  pqc_auditor: {
    title: 'PQC Audit',
    kicker: 'NIST FIPS 204 ML-DSA-44 (lattice signatures)',
    role: 'Signs the resulting ledger state and the hash-chained event log with a post-quantum signature scheme, so the audit trail of what was allowed and what was contained stays unforgeable even against a future quantum-capable attacker.',
    inputs: 'The canonicalised authority state and the current event-log hash chain head.',
    outputs: 'A signature plus a tamper-test verdict.',
  },
  exposure_meter: {
    title: 'Exposure',
    kicker: 'Aggregate spend vs. ceiling',
    role: 'The live readout of one dimension only - AMOUNT - across every rail combined. This is what a naive "just add up the balances" design would treat as the whole system; here it is one of six rows the DTL checks.',
    inputs: 'Settled + authorized + pending + reserved spend, summed across all rails.',
    outputs: 'A percentage of the delegated ceiling currently committed.',
  },
  outcome: {
    title: 'Outcome',
    kicker: 'Contained vs. breached',
    role: 'The final verdict for the round: did any authority dimension get violated and caught, or did the attack complete without the DTL objecting.',
    inputs: 'The full step-by-step result of the round.',
    outputs: 'BLUE WINS (contained) or RED WINS (breached), feeding the Red agent\'s next strategy choice.',
  },
};

const DIMENSION_LABEL: Record<string, string> = {
  AMOUNT: 'Amount',
  PER_TX: 'Per-transaction',
  RAIL: 'Rail',
  MERCHANT: 'Merchant',
  PURPOSE: 'Purpose',
  TIME: 'Time',
};

export function NodeInspector({ nodeId, onClose }: { nodeId: string | null; onClose: () => void }) {
  const arena = useArena();
  const { events, exposure, ceiling, headroom, utilization, railTotals, state, lastRound, winner, strategy } = arena;

  const meta = nodeId ? NODE_META[nodeId] : null;

  const recentEvents = useMemo(() => {
    if (!nodeId) return [];
    return events
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .slice(-5)
      .reverse();
  }, [events, nodeId]);

  const auth = state?.authority_state;
  const vector = state?.authority_vector;

  return (
    <AnimatePresence>
      {nodeId && meta && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <Badge tone="blue">{meta.kicker}</Badge>
                <h2 className="mt-1.5 text-sm font-bold leading-snug text-slate-900">{meta.title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close explanation"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <Section title="What this component is" body={meta.role} />
              <div className="grid grid-cols-2 gap-2">
                <MiniField label="Reads" value={meta.inputs} />
                <MiniField label="Produces" value={meta.outputs} />
              </div>

              {(nodeId === 'principal' || nodeId === 'dtl') && vector && (
                <AuthorityVectorTable vector={vector} />
              )}

              {['card_token', 'upi_circle', 'agentic_ap2'].includes(nodeId) && auth && (
                <RailFacts nodeId={nodeId} railTotals={railTotals} permittedRails={auth.permitted_rails ?? []} />
              )}

              {nodeId === 'exposure_meter' && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Live reading
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Exposure" v={inr(exposure)} />
                    <Row k="Ceiling" v={inr(ceiling)} />
                    <Row k="Headroom" v={inr(headroom)} />
                    <Row k="Utilization" v={`${utilization.toFixed(1)}%`} />
                  </dl>
                </div>
              )}

              {nodeId === 'ml_detector' && state?.detector_status && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Model status
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Loaded" v={state.detector_status.model_loaded ? 'yes' : 'no — run training'} />
                    <Row k="Backend" v={state.detector_status.backend} />
                    <Row k="Features" v={String(state.detector_status.feature_count)} />
                    <Row k="Explainability" v={state.detector_status.explainability_method ?? '—'} />
                    <Row k="Genuine SHAP" v={state.detector_status.is_genuine_shap ? 'yes' : 'no'} />
                  </dl>
                </div>
              )}

              {nodeId === 'pqc_auditor' && state?.pqc_status && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Cryptography status
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Algorithm" v={state.pqc_status.algorithm} />
                    <Row k="Available" v={state.pqc_status.available ? 'yes' : 'PQC MODULE UNAVAILABLE'} />
                    <Row k="Backend" v={state.pqc_status.backend ?? '—'} />
                    <Row k="Signature size" v={`${state.pqc_status.signature_bytes} bytes`} />
                  </dl>
                </div>
              )}

              {nodeId === 'cost_governor' && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Current policy
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Active policy" v={state?.active_policy ?? '—'} />
                  </dl>
                </div>
              )}

              {nodeId === 'red_agent' && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Current campaign
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Strategy" v={strategy ? strategy.replace(/_/g, ' ') : 'idle'} />
                    <Row k="Rounds observed" v={String(state?.feedback_history?.length ?? 0)} />
                  </dl>
                </div>
              )}

              {nodeId === 'outcome' && (
                <div className="rounded-xl border border-slate-200">
                  <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Last round
                  </p>
                  <dl className="divide-y divide-slate-100">
                    <Row k="Winner" v={winner ?? 'no round completed yet'} />
                    <Row k="Detected" v={lastRound ? (lastRound.detected ? 'yes' : 'no') : '—'} />
                  </dl>
                </div>
              )}

              <div className="rounded-xl border border-slate-200">
                <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Recent activity at this node
                </p>
                {recentEvents.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[11px] text-slate-400">
                    Nothing routed through this node yet this session.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentEvents.map((e) => (
                      <li key={e.event_id} className="px-3 py-2">
                        <p className="font-mono text-[10px] font-bold text-slate-700">{e.event_type}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600">{e.arrow_label}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-500">
                  Everything above is read from the live arena state and event log the backend actually
                  produced this session — nothing on this panel is a static mockup.
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-700">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <dt className="text-[11px] text-slate-500">{k}</dt>
      <dd className="font-mono text-[11px] font-bold text-slate-900">{v}</dd>
    </div>
  );
}

function RailFacts({
  nodeId,
  railTotals,
  permittedRails,
}: {
  nodeId: string;
  railTotals: Record<string, number>;
  permittedRails: string[];
}) {
  const railKey = nodeId.toUpperCase();
  const permitted = permittedRails.length === 0 || permittedRails.includes(railKey);
  return (
    <div className="rounded-xl border border-slate-200">
      <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        This rail, right now
      </p>
      <dl className="divide-y divide-slate-100">
        <Row k="In this round" v={inr(railTotals[railKey] ?? 0)} />
        <Row
          k="Permitted by the grant"
          v={permitted ? 'yes' : 'NO — outside delegated rail scope'}
        />
      </dl>
    </div>
  );
}

/** The authority vector, one row per dimension - the concept the principal and DTL nodes both explain. */
function AuthorityVectorTable({ vector }: { vector: Record<string, any> }) {
  const rows = ['AMOUNT', 'PER_TX', 'RAIL', 'MERCHANT', 'PURPOSE', 'TIME'];
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40">
      <p className="border-b border-blue-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">
        The full authority vector — six dimensions, not one ceiling
      </p>
      <dl className="divide-y divide-blue-100">
        {rows.map((key) => {
          const row = vector[key];
          if (!row) return null;
          const granted = Array.isArray(row.granted)
            ? row.granted.join(', ') || 'none'
            : row.granted ?? (row.granted_hours ? `${row.granted_hours}h` : row.unconstrained ? 'unconstrained' : '—');
          return (
            <div key={key} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-800">
                  {DIMENSION_LABEL[key] ?? key}
                </span>
                <span className="font-mono text-[9px] text-blue-500">{row.invariant}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-700">{row.label}</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-900">
                {typeof granted === 'number' ? inr(granted) : String(granted)}
              </p>
              {row.expired && <p className="mt-0.5 text-[10px] font-bold text-rose-600">EXPIRED</p>}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
