'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge, Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import type { InvariantRegistryRow } from '../lib/types';

/**
 * Presentation copy for each invariant, keyed by code. The LIST of invariants
 * and their expressions come from `state.invariant_registry` - the backend's
 * own registry in `app/dtl/invariant_engine.py` - not from a hardcoded array
 * here. A hardcoded copy of the six invariants previously went stale the
 * moment three new ones (RAIL, PER_TX, TIME) shipped: this page kept saying
 * "3 invariants enforced" while the arena was already enforcing six, and a
 * fired RAIL violation showed no "fired" badge anywhere on the page. Reading
 * the registry from the API makes that class of bug impossible to repeat -
 * an unrecognised code still renders, just without the enriched copy below.
 */
const INVARIANT_COPY: Record<string, { title: string; catches: string; why: string }> = {
  INV_06_AUTHORITY_EXPIRED: {
    title: 'Validity window',
    catches: 'Lapsed mandate replay, stale token reuse',
    why: 'Token expiry and delegation expiry are different clocks. A cryptographically valid token can still outlive the authority behind it.',
  },
  INV_04_UNAUTHORIZED_RAIL: {
    title: 'Permitted rails',
    catches: 'Unauthorized rail substitution',
    why: 'A rail-scoped grant ("UPI only") is violated by using another rail at all - independent of whether the aggregate ceiling is ever touched.',
  },
  INV_05_PER_TX_CAP_EXCEEDED: {
    title: 'Per-transaction cap',
    catches: 'Per-transaction authority breach',
    why: 'Bounds the size of any single action, independent of the aggregate. The total budget can be untouched while one transaction is still too large.',
  },
  INV_03_UNAUTHORIZED_MCC: {
    title: 'Delegated scope',
    catches: 'Scope creep, sub-agent escalation',
    why: 'A sub-agent cannot widen the economic scope it inherited from its parent grant.',
  },
  INV_02_SEMANTIC_INTENT_DRIFT: {
    title: 'Semantic intent',
    catches: 'Intent laundering, stored-value conversion',
    why: 'A compliant merchant category is not consent. Converting a grocery budget into gift cards changes the economic purpose.',
  },
  INV_01_GLOBAL_BUDGET_EXCEEDED: {
    title: 'Global authority ceiling',
    catches: 'Cross-rail splitting, velocity bursts, revocation races',
    why: 'Aggregates spend across every rail, so no combination of individually-legal transactions can exceed the grant.',
  },
};

const ACTIONS = [
  { name: 'ALLOW', desc: 'Within authority and intent. No friction.', tone: 'green' as const },
  { name: 'STEP_UP', desc: 'Request secondary verification before proceeding.', tone: 'blue' as const },
  { name: 'PARTIAL_AUTH', desc: 'Clear the legitimate portion, hold the rest.', tone: 'amber' as const },
  { name: 'RAIL_SCOPE_BLOCK', desc: 'Refuse the rail; permitted rails stay usable. No headroom consumed.', tone: 'amber' as const },
  { name: 'QUARANTINE', desc: 'Route the suspicious portion to a shadow sandbox.', tone: 'amber' as const },
  { name: 'RE_CONSENT_HOLD', desc: 'Hold pending a fresh grant after the mandate lapses.', tone: 'purple' as const },
  { name: 'CAPABILITY_REDUCTION', desc: 'Downgrade the agent’s spending capability.', tone: 'purple' as const },
  { name: 'REVIEW', desc: 'Escalate to a human analyst.', tone: 'slate' as const },
  { name: 'BLOCK', desc: 'Last resort. Never the default.', tone: 'red' as const },
];

const DIMENSION_TONE: Record<string, 'amber' | 'purple' | 'blue' | 'red' | 'green' | 'slate'> = {
  AMOUNT: 'amber',
  RAIL: 'purple',
  PER_TX: 'blue',
  PURPOSE: 'red',
  MERCHANT: 'green',
  TIME: 'slate',
};

export default function DefenseCenterPage() {
  const { events, state } = useArena();

  const violations = events.filter((e) => e.event_type === 'INVARIANT_VIOLATION');
  const containments = events.filter((e) =>
    ['POLICY_DECISION', 'PARTIAL_AUTH', 'QUARANTINE', 'CAPABILITY_REDUCTION'].includes(e.event_type),
  );

  // Live from the backend registry - falls back to the historical three so the
  // page still renders something sensible before the arena state has loaded.
  const registry: InvariantRegistryRow[] = state?.invariant_registry?.length
    ? state.invariant_registry
    : [
        { code: 'INV_01_GLOBAL_BUDGET_EXCEEDED', dimension: 'AMOUNT', question: '', expression: 'settled + authorized + pending + reserved + new_tx <= ceiling', severity: 'HIGH' },
        { code: 'INV_02_SEMANTIC_INTENT_DRIFT', dimension: 'PURPOSE', question: '', expression: 'cart.items.category NOT IN semantic_exclusions', severity: 'CRITICAL' },
        { code: 'INV_03_UNAUTHORIZED_MCC', dimension: 'MERCHANT', question: '', expression: 'tx.merchant_mcc IN permitted_mccs', severity: 'HIGH' },
      ];

  return (
    <>
      <PageHeader
        title="Defense Center"
        description="The invariants FORSETI enforces, one per dimension of the delegated authority, and the graduated responses available to the cost governor. The design principle is containment without destroying legitimate commerce."
      >
        <Badge tone="blue">{String(state?.active_policy ?? 'STANDARD').replace(/_/g, ' ')}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Invariants enforced" value={registry.length} hint="one per authority dimension" />
        <Stat label="Violations this session" value={violations.length} tone={violations.length ? 'danger' : 'default'} />
        <Stat label="Containment actions" value={containments.length} tone="success" />
        <Stat label="Response levels" value={ACTIONS.length} hint="block is the last resort" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {registry.map((inv) => {
          const fired = violations.filter((v) => v.payload?.invariant_code === inv.code).length;
          const copy = INVARIANT_COPY[inv.code];
          return (
            <Card
              key={inv.code}
              title={copy?.title ?? inv.code}
              right={fired > 0 ? <Badge tone="red">{fired} fired</Badge> : null}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-mono text-[10px] font-bold text-slate-500">{inv.code}</p>
                <Badge tone={DIMENSION_TONE[inv.dimension] ?? 'slate'}>{inv.dimension}</Badge>
              </div>
              <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-300">
                {inv.expression}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">
                {copy?.why ?? inv.question}
              </p>
              {copy?.catches && (
                <p className="mt-2 text-[10px] font-semibold text-slate-500">Catches: {copy.catches}</p>
              )}
            </Card>
          );
        })}
      </div>

      <Card title="Graduated response ladder" subtitle="Blocking the whole account is the last resort, not the reflex">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a) => (
            <div key={a.name} className="rounded-xl border border-slate-200 p-3">
              <Badge tone={a.tone}>{a.name}</Badge>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{a.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <InfoNote>
            A blanket block is itself an attack surface: flooding revocations to force a lockout is a
            denial-of-service on the legitimate user. Partial authorisation clears the genuine basket
            and isolates only the unauthorised remainder; the four scope-only responses
            (rail, per-transaction, merchant, time) consume no headroom at all when they refuse a
            request outside the grant.
          </InfoNote>
        </div>
      </Card>

      <Card title="Containment actions taken" subtitle="Live from the arena stream">
        {containments.length === 0 ? (
          <p className="text-xs text-slate-400">No containment actions yet this session.</p>
        ) : (
          <ol className="space-y-2">
            {containments.slice(-10).map((e) => (
              <li key={e.event_id} className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold text-emerald-800">{e.event_type}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-700">
                    {e.payload?.action ?? e.payload?.detail ?? e.arrow_label}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
