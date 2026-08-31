'use client';

import React from 'react';
import { Bot, ShieldCheck } from 'lucide-react';
import { Badge, Card, InfoNote, PageHeader } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api, inr, num } from '../lib/api';
import { useArena } from '../lib/ArenaProvider';

export default function AgentsPage() {
  const { data, reload } = useArtifact(() => api.feedback(), []);
  const { state, events } = useArena();

  const history = data?.history ?? [];
  const plan = data?.next_plan;
  const table = plan?.scoring_table ?? [];

  const redEvents = events.filter((e) => e.event_type === 'RED_ADAPTATION');
  const blueEvents = events.filter((e) => e.event_type === 'BLUE_ADAPTATION');

  return (
    <>
      <PageHeader
        title="Agents"
        description="The closed loop. The Red agent scores every strategy from outcomes it has actually observed and picks the argmax; the Blue system hardens policy in response. Selection is deterministic, no LLM, so the demo is reproducible."
      >
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Red agent"
          subtitle="Adaptive adversary"
          right={<Badge tone="red">AGT-7721</Badge>}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900">
                Next strategy: {String(plan?.next_strategy ?? '-').replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{plan?.reasoning}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                score {num(plan?.confidence, 4)} · expects {plan?.expected_defence}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <InfoNote>{plan?.selection_method}</InfoNote>
          </div>
        </Card>

        <Card
          title="Blue system"
          subtitle="Defense posture"
          right={<Badge tone="green">FORSETI DTL</Badge>}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900">
                Active policy: {String(state?.active_policy ?? 'STANDARD').replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Model {state?.detector_status?.model_loaded ? 'loaded' : 'not trained'} ·{' '}
                {state?.detector_status?.backend}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                PQC {state?.pqc_status?.available ? state.pqc_status.backend : 'unavailable'}
              </p>
            </div>
          </div>
          {blueEvents.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {blueEvents.slice(-3).map((e) => (
                <li key={e.event_id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-800">
                  {e.arrow_label}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Strategy scoring table"
        subtitle="How the Red agent ranks its options right now. Derived from observed containment, not hardcoded"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-bold">Strategy</th>
                <th className="pb-2 font-bold">Score</th>
                <th className="pb-2 font-bold">Prior</th>
                <th className="pb-2 font-bold">Attempts</th>
                <th className="pb-2 font-bold">Contained</th>
                <th className="pb-2 font-bold">Mean detect</th>
                <th className="pb-2 font-bold">Feasibility</th>
                <th className="pb-2 font-bold">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.map((row: any, i: number) => (
                <tr key={row.strategy} className={i === 0 ? 'bg-rose-50/60' : ''}>
                  <td className={`py-2 ${i === 0 ? 'font-bold text-rose-800' : 'text-slate-700'}`}>
                    {row.strategy.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2 font-mono font-bold">{num(row.score, 4)}</td>
                  <td className="py-2 font-mono text-slate-500">{num(row.base_prior, 2)}</td>
                  <td className="py-2 font-mono text-slate-500">{row.attempts_observed}</td>
                  <td className="py-2 font-mono text-slate-500">{num(row.containment_rate, 2)}</td>
                  <td className="py-2 font-mono text-slate-500">{num(row.mean_detection_score, 2)}</td>
                  <td className="py-2 font-mono text-slate-500">{num(row.headroom_feasibility, 2)}</td>
                  <td className="py-2 max-w-sm text-[10.5px] leading-snug text-slate-500">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Round history" subtitle="What actually happened each round">
        {history.length === 0 ? (
          <p className="text-xs text-slate-400">No rounds recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((r: any, i: number) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-slate-900">
                    Round {r.round_id}, {String(r.strategy).replace(/_/g, ' ')}
                  </span>
                  <Badge tone={r.is_detected ? 'green' : 'red'}>
                    {r.is_detected ? 'Contained' : 'Not contained'}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
                  <span>attempted {inr(r.attempted_amount)}</span>
                  <span>detector {num(r.detection_score, 3)}</span>
                  {r.violating_invariant && <span>{r.violating_invariant}</span>}
                  <span>rails: {(r.target_rails ?? []).join(', ')}</span>
                </div>
                {r.blue_adaptation && (
                  <p className="mt-1.5 text-[11px] text-emerald-700">Blue: {r.blue_adaptation}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
