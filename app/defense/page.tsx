'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge, Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

const INVARIANTS = [
  {
    code: 'INV_01_GLOBAL_BUDGET_EXCEEDED',
    title: 'Global authority ceiling',
    expression: 'settled + authorized + pending + reserved + new_tx <= ceiling',
    catches: 'Cross-rail splitting, velocity bursts, revocation races',
    why: 'Aggregates spend across every rail, so no combination of individually-legal transactions can exceed the grant.',
  },
  {
    code: 'INV_02_SEMANTIC_INTENT_DRIFT',
    title: 'Semantic intent',
    expression: 'cart.items.category NOT IN semantic_exclusions',
    catches: 'Intent laundering, stored-value conversion',
    why: 'A compliant merchant category is not consent. Converting a grocery budget into gift cards changes the economic purpose.',
  },
  {
    code: 'INV_03_UNAUTHORIZED_MCC',
    title: 'Delegated scope',
    expression: 'tx.merchant_mcc IN permitted_mccs',
    catches: 'Scope creep, sub-agent escalation',
    why: 'A sub-agent cannot widen the economic scope it inherited from its parent grant.',
  },
];

const ACTIONS = [
  { name: 'ALLOW', desc: 'Within authority and intent. No friction.', tone: 'green' as const },
  { name: 'STEP_UP', desc: 'Request secondary verification before proceeding.', tone: 'blue' as const },
  { name: 'PARTIAL_AUTH', desc: 'Clear the legitimate portion, hold the rest.', tone: 'amber' as const },
  { name: 'QUARANTINE', desc: 'Route the suspicious portion to a shadow sandbox.', tone: 'amber' as const },
  { name: 'CAPABILITY_REDUCTION', desc: 'Downgrade the agent’s spending capability.', tone: 'purple' as const },
  { name: 'REVIEW', desc: 'Escalate to a human analyst.', tone: 'slate' as const },
  { name: 'BLOCK', desc: 'Last resort. Never the default.', tone: 'red' as const },
];

export default function DefenseCenterPage() {
  const { events, state } = useArena();

  const violations = events.filter((e) => e.event_type === 'INVARIANT_VIOLATION');
  const containments = events.filter((e) =>
    ['POLICY_DECISION', 'PARTIAL_AUTH', 'QUARANTINE', 'CAPABILITY_REDUCTION'].includes(e.event_type),
  );

  return (
    <>
      <PageHeader
        title="Defense Center"
        description="The invariants FORSETI enforces and the graduated responses available to the cost governor. The design principle is containment without destroying legitimate commerce."
      >
        <Badge tone="blue">{String(state?.active_policy ?? 'STANDARD').replace(/_/g, ' ')}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Invariants enforced" value={INVARIANTS.length} />
        <Stat label="Violations this session" value={violations.length} tone={violations.length ? 'danger' : 'default'} />
        <Stat label="Containment actions" value={containments.length} tone="success" />
        <Stat label="Response levels" value={ACTIONS.length} hint="block is the last resort" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {INVARIANTS.map((inv) => {
          const fired = violations.filter((v) => v.payload?.invariant_code === inv.code).length;
          return (
            <Card key={inv.code} title={inv.title} right={fired > 0 ? <Badge tone="red">{fired} fired</Badge> : null}>
              <p className="font-mono text-[10px] font-bold text-slate-500">{inv.code}</p>
              <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-300">
                {inv.expression}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">{inv.why}</p>
              <p className="mt-2 text-[10px] font-semibold text-slate-500">Catches: {inv.catches}</p>
            </Card>
          );
        })}
      </div>

      <Card title="Graduated response ladder" subtitle="Blocking the whole account is the last resort, not the reflex">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            and isolates only the unauthorised remainder.
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
