'use client';

import React from 'react';
import { Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { ArenaControls } from '../components/ArenaControls';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

export default function DelegationLedgerPage() {
  const { state, events, exposure, ceiling, headroom, utilization } = useArena();
  const auth = state?.authority_state;

  const exposureEvents = events.filter((e) => e.event_type === 'DTL_EXPOSURE_UPDATED');
  const breached = ceiling > 0 && exposure > ceiling;

  return (
    <>
      <PageHeader
        title="Delegation Ledger"
        description="The canonical record of granted authority and how much of it has been consumed. Exposure is tracked in two phases so an in-flight transaction cannot be double-spent against the same headroom."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Delegated ceiling" value={inr(ceiling)} hint="user-granted authority" />
        <Stat
          label="Total exposure"
          value={inr(exposure)}
          hint="settled + authorized + pending + reserved"
          tone={breached ? 'danger' : 'default'}
        />
        <Stat label="Headroom" value={inr(headroom)} tone={headroom <= 0 ? 'danger' : 'success'} />
        <Stat
          label="Utilisation"
          value={`${utilization.toFixed(1)}%`}
          tone={utilization >= 100 ? 'danger' : utilization >= 80 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ArenaControls />

        <div className="space-y-5">
          <Card title="Two-phase exposure breakdown" subtitle="Why in-flight spend still counts">
            <div className="space-y-2">
              <Phase label="Settled" value={auth?.cumulative_spent_settled ?? 0} ceiling={ceiling} color="bg-slate-500" />
              <Phase label="Authorized (awaiting capture)" value={auth?.cumulative_spent_authorized ?? 0} ceiling={ceiling} color="bg-blue-500" />
              <Phase label="Pending (in validation)" value={auth?.pending_spend_global ?? 0} ceiling={ceiling} color="bg-amber-500" />
              <Phase label="Reserved (sub-delegation pools)" value={auth?.reserved_spend_global ?? 0} ceiling={ceiling} color="bg-purple-500" />
            </div>
            <div className="mt-4">
              <InfoNote>
                A rail that only checks settled balances can be raced: three transactions can each
                pass while all three are still in flight. Counting authorized, pending and reserved
                spend against the same ceiling is what closes that window.
              </InfoNote>
            </div>
          </Card>

          <Card title="Delegation scope" subtitle="What this authority permits">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Permitted merchant categories
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(auth?.permitted_mccs ?? []).map((mcc) => (
                    <span key={mcc} className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                      MCC {mcc}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Semantic exclusions
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(auth?.semantic_exclusions ?? []).map((ex) => (
                    <span key={ex} className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-700">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-1.5 text-xs">
              <Row label="Authority ID" value={auth?.authority_id} />
              <Row label="Principal" value={auth?.principal} />
              <Row label="Agent" value={auth?.agent_id} />
              <Row label="Active policy" value={auth?.active_policy} />
            </dl>
          </Card>

          <Card title="Exposure timeline" subtitle="Every change to the global balance this session">
            {exposureEvents.length === 0 ? (
              <p className="text-xs text-slate-400">No exposure changes recorded yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {exposureEvents.slice(-14).map((e) => (
                  <li
                    key={e.event_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"
                  >
                    <span className="font-mono text-[10px] text-slate-500">
                      +{((e.offset_ms ?? 0) / 1000).toFixed(2)}s
                    </span>
                    <span className="flex-1 truncate text-[11px] text-slate-700">
                      {e.payload?.after_containment ? 'after containment' : 'transaction applied'}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        e.payload?.breached ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {inr(e.payload?.exposure_after)} / {inr(e.payload?.ceiling)}
                    </span>
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

function Phase({ label, value, ceiling, color }: { label: string; value: number; ceiling: number; color: string }) {
  const pctVal = ceiling > 0 ? Math.min(100, (value / ceiling) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="font-mono text-[11px] font-bold text-slate-900">{inr(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pctVal}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono font-semibold text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}
