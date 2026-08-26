'use client';

import React from 'react';
import { Badge, Card, InfoNote, PageHeader } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import { useArtifact } from '../lib/useArtifact';
import { api, inr } from '../lib/api';

/**
 * The ladder is served by the backend (`state.policy_ladder`, generated from the
 * DefensePolicy enum). This local list is only a last-resort fallback for a
 * cold/offline state — it is NOT the source of truth. A hand-written copy of the
 * ladder is exactly what previously dropped AGENT_SUSPENDED, the top rung, so the
 * most severe policy in the system rendered as "no active policy".
 */
const FALLBACK_LADDER: PolicyRung[] = [
  { code: 'STANDARD', rung: 0, description: 'Baseline. Per-rail checks only, no global aggregation.', enforced_effect: '' },
];

interface PolicyRung {
  code: string;
  rung: number;
  description: string;
  enforced_effect: string;
}

export default function PolicyCenterPage() {
  const { state, ceiling, headroom } = useArena();
  const { data: feedback } = useArtifact(() => api.feedback(), []);
  const active = String(state?.active_policy ?? 'STANDARD');
  const auth = state?.authority_state;
  const ladder: PolicyRung[] = (state as any)?.policy_ladder?.length
    ? (state as any).policy_ladder
    : FALLBACK_LADDER;
  const overlay = (state as any)?.policy_overlay ?? null;
  // If this ever goes true the backend grew a policy the ladder does not cover.
  const unknownPolicy = !ladder.some((r) => r.code === active);

  const adaptations = (feedback?.history ?? []).filter((h: any) => h.blue_adaptation);

  return (
    <>
      <PageHeader
        title="Policy Center"
        description="The delegation policy currently in force, and how the Blue system has hardened it in response to observed attacks."
      >
        <Badge tone="blue">{active.replace(/_/g, ' ')}</Badge>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Escalation ladder"
          subtitle="Every policy Blue can climb to, in order of severity — served from the backend enum"
        >
          {unknownPolicy && (
            <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
              Active policy <span className="font-mono">{active}</span> is not in the ladder the
              backend published. This is a wiring bug, not a policy state.
            </p>
          )}
          <ul className="space-y-2">
            {ladder.map((p) => {
              const isActive = p.code === active;
              const climbed = p.rung < (ladder.find((r) => r.code === active)?.rung ?? 0);
              return (
                <li
                  key={p.code}
                  className={`rounded-xl border px-3 py-2.5 ${
                    isActive
                      ? 'border-blue-400 bg-blue-50'
                      : climbed
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : climbed
                              ? 'bg-slate-300 text-white'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.rung}
                      </span>
                      <span
                        className={`break-all font-mono text-[11px] font-bold ${
                          isActive ? 'text-blue-800' : 'text-slate-700'
                        }`}
                      >
                        {p.code}
                      </span>
                    </span>
                    {isActive && <Badge tone="blue">Active</Badge>}
                    {!isActive && climbed && <Badge tone="slate">Passed</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">{p.description}</p>
                  {p.enforced_effect && (
                    <p className="mt-1 font-mono text-[10px] leading-snug text-slate-400">
                      {p.enforced_effect}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="Authority parameters" subtitle="The grant being enforced">
            <dl className="space-y-1.5 text-xs">
              <Row label="Delegated ceiling" value={inr(ceiling)} />
              <Row label="Remaining headroom" value={inr(headroom)} />
              <Row label="Per-transaction cap" value={auth?.per_transaction_cap != null ? inr(auth.per_transaction_cap) : 'unconstrained'} />
              <Row label="Permitted rails" value={(auth?.permitted_rails ?? []).join(', ')} />
              <Row label="Validity window" value={auth?.validity_window_hours != null ? `${auth.validity_window_hours}h` : undefined} />
              <Row label="Authority ID" value={auth?.authority_id} />
              <Row label="Principal" value={auth?.principal} />
              <Row label="Agent" value={auth?.agent_id} />
              <Row label="Permitted MCCs" value={(auth?.permitted_mccs ?? []).join(', ')} />
              <Row label="Semantic exclusions" value={(auth?.semantic_exclusions ?? []).join(', ')} />
            </dl>
            {overlay && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">
                  What the active policy is enforcing right now
                </p>
                <dl className="mt-1.5 space-y-1 text-[11px]">
                  <Row
                    label="Ceiling withheld by policy"
                    value={overlay.ceiling_withheld > 0 ? inr(overlay.ceiling_withheld) : 'nothing'}
                  />
                  <Row
                    label="Effective ceiling"
                    value={inr(overlay.effective_ceiling)}
                  />
                  <Row
                    label="Effective per-transaction cap"
                    value={
                      overlay.effective_per_transaction_cap != null
                        ? inr(overlay.effective_per_transaction_cap)
                        : 'unconstrained'
                    }
                  />
                  <Row
                    label="All spend suspended"
                    value={overlay.suspends_all_spend ? 'YES — mandate paused' : 'no'}
                  />
                  <Row
                    label="SKU attestation required"
                    value={overlay.requires_sku_attestation ? 'yes' : 'no'}
                  />
                </dl>
              </div>
            )}

            <div className="mt-3">
              <InfoNote>
                The ceiling is editable from the Live Arena and the Delegation Ledger. Changing it
                immediately changes what counts as a violation — the invariant is arithmetic, not a
                tuned threshold.
              </InfoNote>
            </div>
          </Card>

          <Card title="Blue adaptations" subtitle="Policy changes triggered by real violations">
            {adaptations.length === 0 ? (
              <p className="text-xs text-slate-400">No policy adaptations yet this session.</p>
            ) : (
              <ol className="space-y-2">
                {adaptations.map((a: any, i: number) => (
                  <li key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="font-mono text-[10px] font-bold text-emerald-800">
                      round {a.round_id} · {a.violating_invariant}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-700">{a.blue_adaptation}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-all text-right font-mono font-semibold text-slate-800">{value || '—'}</dd>
    </div>
  );
}
