'use client';

import React from 'react';
import { Badge, Card, InfoNote, PageHeader } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import { useArtifact } from '../lib/useArtifact';
import { api, inr } from '../lib/api';

const POLICIES = [
  { id: 'STANDARD', desc: 'Baseline. Per-rail checks only, no global aggregation.' },
  { id: 'STRICT_INVARIANT', desc: 'Global cross-rail authority checking is enforced on every transaction.' },
  { id: 'ADAPTIVE_CONTAINMENT', desc: 'Partial authorisation and shadow execution are active.' },
  { id: 'CAPABILITY_QUARANTINED', desc: 'Agent spending capability has been downgraded after a violation.' },
  { id: 'TIGHTENED_HEADROOM_V2', desc: 'Headroom buffer reduced after a budget-ceiling breach.' },
  { id: 'STRICT_CATALOG_ATTESTATION', desc: 'Item-level attestation required after semantic drift.' },
  { id: 'STEP_UP_VERIFICATION', desc: 'Secondary verification required before authorisation.' },
];

export default function PolicyCenterPage() {
  const { state, ceiling, headroom } = useArena();
  const { data: feedback } = useArtifact(() => api.feedback(), []);
  const active = String(state?.active_policy ?? 'STANDARD');
  const auth = state?.authority_state;

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
        <Card title="Active delegation policy" subtitle="Applied to every transaction on every rail">
          <ul className="space-y-2">
            {POLICIES.map((p) => {
              const isActive = p.id === active;
              return (
                <li
                  key={p.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    isActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        isActive ? 'text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      {p.id}
                    </span>
                    {isActive && <Badge tone="blue">Active</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">{p.desc}</p>
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
              <Row label="Authority ID" value={auth?.authority_id} />
              <Row label="Principal" value={auth?.principal} />
              <Row label="Agent" value={auth?.agent_id} />
              <Row label="Permitted MCCs" value={(auth?.permitted_mccs ?? []).join(', ')} />
              <Row label="Semantic exclusions" value={(auth?.semantic_exclusions ?? []).join(', ')} />
            </dl>
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
      <dd className="text-right font-mono font-semibold text-slate-800">{value || '—'}</dd>
    </div>
  );
}
