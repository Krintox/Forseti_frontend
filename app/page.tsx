'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Cpu,
  Gauge,
  Lock,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import { Badge, Card, InfoNote, PageHeader, Stat } from './components/ui';
import { useArena } from './lib/ArenaProvider';
import { useArtifact } from './lib/useArtifact';
import { api, inr, num, pct } from './lib/api';
import { isArtifactMissing } from './lib/types';

export default function OverviewPage() {
  const { state, exposure, ceiling, utilization, connected } = useArena();
  const { data: evaluation } = useArtifact(() => api.evaluation(), []);
  const { data: latency } = useArtifact(() => api.latency(), []);
  const { data: health } = useArtifact(() => api.health(), []);

  const metrics = evaluation?.metrics;
  const baselines = evaluation?.baselines;
  const metricsOk = !isArtifactMissing(metrics);
  const latencyOk = !isArtifactMissing(latency);

  const prAuc = metricsOk ? metrics?.test_metrics?.pr_auc : null;
  const p99 = latencyOk ? latency?.breakdown?.full_end_to_end_pipeline?.p99_ms : null;
  const headline = baselines?.headline_finding;

  return (
    <>
      <PageHeader
        title="Executive Overview"
        description="FORSETI protects delegated authority, not a spend ceiling: a delegated agent may act only within the authority it was granted, across all six dimensions of the grant — amount, per-transaction size, rail, merchant, purpose and time."
      >
        <Link href="/arena">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-blue-700">
            <Swords className="h-3.5 w-3.5" />
            Open Live Arena
          </span>
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700">The thesis</p>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Traditional controls ask
            </p>
            <p className="mt-1.5 text-sm font-semibold text-slate-800">
              “Is this transaction valid on this rail?”
            </p>
          </div>
          <div className="rounded-xl border border-blue-300 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">FORSETI asks</p>
            <p className="mt-1.5 text-sm font-bold text-slate-900">
              “Is this agent still acting within the authority it was given — amount, rail, merchant,
              purpose and time, all at once?”
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          label="Global exposure"
          value={inr(exposure)}
          hint={`of ${inr(ceiling)} delegated · ${utilization.toFixed(1)}% used`}
          tone={exposure > ceiling ? 'danger' : 'default'}
          icon={<Gauge className="h-3.5 w-3.5 text-slate-400" />}
        />
        <Stat
          label="Detector"
          value={state?.detector_status?.model_loaded ? 'LOADED' : 'NOT TRAINED'}
          hint={state?.detector_status?.backend ?? '—'}
          tone={state?.detector_status?.model_loaded ? 'success' : 'warning'}
          icon={<Cpu className="h-3.5 w-3.5 text-slate-400" />}
        />
        <Stat
          label="Test PR-AUC"
          value={prAuc !== null && prAuc !== undefined ? num(prAuc, 4) : 'NOT RUN'}
          hint={metricsOk ? 'temporal test slice, attack family held out' : 'run the training pipeline'}
          tone={metricsOk ? 'default' : 'warning'}
          icon={<BarChart3 className="h-3.5 w-3.5 text-slate-400" />}
        />
        <Stat
          label="Pipeline p99"
          value={p99 !== null && p99 !== undefined ? `${num(p99, 2)} ms` : 'NOT RUN'}
          hint={latencyOk ? `${latency?.metadata?.iterations_measured?.toLocaleString()} tx measured` : 'run the benchmark'}
          tone={latencyOk ? 'success' : 'warning'}
          icon={<Activity className="h-3.5 w-3.5 text-slate-400" />}
        />
        <Stat
          label="PQC audit"
          value={state?.pqc_status?.available ? 'ML-DSA-44' : 'UNAVAILABLE'}
          hint={state?.pqc_status?.backend ?? state?.pqc_status?.unavailable_reason ?? '—'}
          tone={state?.pqc_status?.available ? 'success' : 'warning'}
          icon={<Lock className="h-3.5 w-3.5 text-slate-400" />}
        />
      </div>

      <AuthorityDimensions />

      {headline && (
        <Card
          title="Headline measured finding"
          subtitle="Recall on cross-rail splitting, by architecture"
          right={<Badge tone="blue">from baselines.json</Badge>}
        >
          <p className="text-xs leading-relaxed text-slate-700">{headline.claim}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-bold">Architecture</th>
                  <th className="pb-2 font-bold">Recall — family held out</th>
                  <th className="pb-2 font-bold">Recall — family seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['rules_only', 'Rules only'],
                  ['per_rail_ml', 'Per-rail ML (siloed)'],
                  ['ml_without_dtl', 'Global ML, no DTL'],
                  ['hybrid_dtl_ml', 'Hybrid ML + DTL'],
                  ['dtl_invariant_only', 'DTL invariant (deterministic)'],
                ].map(([key, label]) => {
                  const held = headline.cross_rail_split_recall_when_family_held_out?.[key];
                  const seen = headline.cross_rail_split_recall_when_family_seen?.[key];
                  const isInvariant = key === 'dtl_invariant_only';
                  return (
                    <tr key={key} className={isInvariant ? 'bg-blue-50/60' : ''}>
                      <td className={`py-2 ${isInvariant ? 'font-bold text-blue-800' : 'text-slate-700'}`}>
                        {label}
                      </td>
                      <td className="py-2 font-mono font-bold">
                        {held === null || held === undefined ? '—' : pct(held * 100, 1)}
                      </td>
                      <td className="py-2 font-mono font-bold">
                        {seen === null || seen === undefined ? '—' : pct(seen * 100, 1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <InfoNote>
              Every learned model scores a transaction in isolation, so one leg of a split looks
              ordinary. The deterministic invariant compares <em>aggregate</em> exposure against the
              ceiling, so it does not need to have seen the attack family before.
            </InfoNote>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="System health" subtitle="What is actually running right now">
          <ul className="space-y-2 text-xs">
            <HealthRow label="Live event stream" ok={connected} detail={connected ? 'WebSocket connected' : 'reconnecting'} />
            <HealthRow
              label="Trained model"
              ok={Boolean(health?.model_loaded)}
              detail={health?.model_backend ?? '—'}
            />
            <HealthRow
              label="Genuine SHAP"
              ok={Boolean(health?.genuine_shap)}
              detail={health?.genuine_shap ? 'shap.TreeExplainer' : 'fallback contribution'}
            />
            <HealthRow
              label="Post-quantum signing"
              ok={Boolean(health?.pqc_available)}
              detail={health?.pqc_backend ?? '—'}
            />
          </ul>
          {health?.artifacts_missing?.length > 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
              Artifacts not yet generated: {health.artifacts_missing.join(', ')}
            </p>
          )}
        </Card>

        <Card title="Where to look" subtitle="Guided tour" className="lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: '/arena', title: 'Live Arena', desc: 'Watch the attack and defense stream in real time.', icon: Swords },
              { href: '/detection', title: 'Detection Lab', desc: 'Baselines, ablation and the measured DTL lift.', icon: BarChart3 },
              { href: '/explainability', title: 'Explainability', desc: 'Real SHAP attributions from the trained model.', icon: Activity },
              { href: '/audit', title: 'Quantum Audit', desc: 'ML-DSA-44 signing with live tamper tests.', icon: Lock },
              { href: '/fidelity', title: 'Fidelity Lab', desc: 'Statistical realism checks against public anchors.', icon: ShieldCheck },
              { href: '/replay', title: 'Replay & Demo', desc: 'Deterministic one-click walkthrough.', icon: Activity },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.desc}</p>
                  </div>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <span className="flex items-center gap-2 text-slate-700">
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {label}
      </span>
      <span className="font-mono text-[10px] text-slate-500">{detail}</span>
    </li>
  );
}

/**
 * The six dimensions of a delegation, rendered from the backend's own
 * invariant registry (app/dtl/invariant_engine.py) and the live grant.
 *
 * This sits on the landing page because it is the whole concept: an agent that
 * never touches the money limit can still act outside what a human authorised,
 * and each dimension has its own machine-checkable invariant. Reading the
 * registry rather than hardcoding six cards means this can never disagree with
 * what the engine actually enforces.
 */
function AuthorityDimensions() {
  const { state } = useArena();
  const vector = state?.authority_vector;
  const registry = state?.invariant_registry ?? [];
  if (!vector || registry.length === 0) return null;

  const ORDER = ['AMOUNT', 'PER_TX', 'RAIL', 'MERCHANT', 'PURPOSE', 'TIME'] as const;
  const LABEL: Record<string, string> = {
    AMOUNT: 'Amount',
    PER_TX: 'Per-transaction',
    RAIL: 'Rail',
    MERCHANT: 'Merchant',
    PURPOSE: 'Purpose',
    TIME: 'Time',
  };

  const describe = (key: string): string => {
    const row: any = (vector as any)[key];
    if (!row) return '—';
    if (key === 'AMOUNT') return inr(row.granted);
    if (key === 'PER_TX') return row.granted == null ? 'unconstrained' : inr(row.granted);
    if (key === 'RAIL') {
      const rails: string[] = row.granted ?? [];
      return rails.length >= 3 ? 'any rail' : rails.map((r) => r.split('_')[0]).join(' · ') || 'none';
    }
    if (key === 'MERCHANT') return `MCC ${(row.granted ?? []).join(', ')}`;
    if (key === 'PURPOSE') return String(row.granted ?? '—');
    if (key === 'TIME') return row.expired ? 'EXPIRED' : `${row.granted_hours}h window`;
    return '—';
  };

  return (
    <Card
      title="What the user actually delegated"
      subtitle="Authority is multidimensional — the money limit is one row of six, and each has its own invariant"
      right={<Badge tone="blue">live grant</Badge>}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((key) => {
          const row: any = (vector as any)[key];
          const inv = registry.find((r) => r.dimension === key);
          const expired = key === 'TIME' && row?.expired;
          return (
            <div
              key={key}
              className={`rounded-xl border px-3 py-2.5 ${
                expired ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  {LABEL[key]}
                </p>
                <p className="font-mono text-[9px] text-slate-400">{inv?.code.split('_')[0]}_{inv?.code.split('_')[1]}</p>
              </div>
              <p className={`mt-0.5 truncate font-mono text-[12px] font-bold ${expired ? 'text-rose-600' : 'text-slate-900'}`}>
                {describe(key)}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">{inv?.question}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <InfoNote>
          An agent can stay inside the amount and still break the grant — wrong rail, wrong
          merchant, wrong basket, or after the mandate lapsed. Each row is enforced
          deterministically, so none of them depends on having seen the attack before.
        </InfoNote>
      </div>
    </Card>
  );
}
