'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge, Card, InfoNote, PageHeader } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { API_BASE, api, num } from '../lib/api';
import { useArena } from '../lib/ArenaProvider';

const PIPELINES = [
  { key: 'metrics', label: 'Training & evaluation', cmd: 'python -m app.detector.train --seed 42' },
  { key: 'baselines', label: 'Baseline benchmark', cmd: 'python -m app.detector.baselines --seed 42' },
  { key: 'ablation', label: 'Feature ablation', cmd: 'python -m app.detector.ablation --seed 42' },
  { key: 'fidelity', label: 'Statistical fidelity', cmd: 'python -m app.fidelity.report' },
  { key: 'latency', label: 'Latency benchmark', cmd: 'python -m app.benchmark.latency --iterations 10000' },
];

export default function SettingsPage() {
  const { data: health, reload } = useArtifact(() => api.health(), []);
  const { data: metrics } = useArtifact(() => api.metrics(), []);
  const { data: latency } = useArtifact(() => api.latency(), []);
  const { connected, state } = useArena();

  const env = metrics?.environment;

  return (
    <>
      <PageHeader
        title="System Settings"
        description="Runtime configuration, dependency status and the exact command that regenerates each artifact. Anything not generated is reported as missing rather than filled in."
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
        <Card title="Runtime" subtitle="What this instance is connected to">
          <dl className="space-y-1.5 text-xs">
            <Row label="API base" value={API_BASE} />
            <Row label="Event stream" value={connected ? 'connected' : 'reconnecting'} />
            <Row label="Experiment ID" value={state?.experiment_id} />
            <Row label="Model loaded" value={health?.model_loaded ? 'yes' : 'no'} />
            <Row label="Model backend" value={health?.model_backend} />
            <Row label="Genuine SHAP" value={health?.genuine_shap ? 'yes' : 'no'} />
            <Row label="PQC backend" value={health?.pqc_backend ?? 'unavailable'} />
          </dl>
        </Card>

        <Card title="Environment captured at training time" subtitle="For reproducibility">
          {env ? (
            <dl className="space-y-1.5 text-xs">
              <Row label="Seed" value={env.seed} />
              <Row label="Python" value={env.python_version} />
              <Row label="Platform" value={env.platform} />
              <Row label="Feature schema" value={env.feature_schema_version} />
            </dl>
          ) : (
            <p className="text-xs text-slate-400">No training metadata, run the training pipeline.</p>
          )}
          {env?.package_versions && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(env.package_versions).map(([pkg, ver]: any) => (
                <div key={pkg} className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-mono text-[10px] text-slate-600">{pkg}</span>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      ver === 'NOT INSTALLED' ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    {ver}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Experiment artifacts" subtitle="Presence is checked on disk, not assumed">
        <ul className="space-y-2">
          {PIPELINES.map((p) => {
            const present = Boolean(health?.artifacts_present?.[p.key]);
            return (
              <li
                key={p.key}
                className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                  present ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-300 bg-amber-50/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {present ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="text-[12px] font-bold text-slate-800">{p.label}</p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      {present ? 'artifact present' : 'NOT RUN'}
                    </p>
                  </div>
                </div>
                <code className="overflow-x-auto rounded-md bg-slate-900 px-2.5 py-1.5 font-mono text-[10px] text-emerald-300">
                  {p.cmd}
                </code>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <InfoNote>
            Run everything at once with <code className="font-mono">python -m app.experiment_runner --seed 42</code>{' '}
            from the backend directory. Changing the seed changes the generated data while keeping
            the pipeline reproducible.
          </InfoNote>
        </div>
      </Card>

      <Card title="Measured latency budget" subtitle="From the benchmark artifact, not a claim">
        {latency?.breakdown ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(latency.breakdown).map(([stage, s]: any) => (
              <div key={stage} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {stage.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 font-mono text-lg font-black text-slate-900">
                  {num(s.p99_ms, 3)} <span className="text-[10px] font-normal text-slate-500">ms p99</span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                  p50 {num(s.p50_ms, 3)} · p95 {num(s.p95_ms, 3)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-700">Latency benchmark NOT RUN.</p>
        )}
        {latency?.metadata && (
          <p className="mt-3 text-[11px] font-semibold text-slate-600">
            {latency.metadata.sla_verdict}{' '}
            <span className="font-normal text-slate-500">({latency.metadata.sla_note})</span>
          </p>
        )}
      </Card>

      <Card title="Data safety" subtitle="Non-negotiable constraints">
        <ul className="grid gap-2 text-[11px] text-slate-700 sm:grid-cols-2">
          {[
            'No real PAN, CVV, bank account or UPI credential exists anywhere in this system.',
            'All identities, merchants and carts are synthetic.',
            'No production payment API is ever contacted.',
            'No real money moves; every transaction is sandboxed.',
            'Private keys are development-only and git-ignored.',
            'Licensed anchor datasets are never redistributed in this repository.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="truncate text-right font-mono font-semibold text-slate-800">{value ?? '-'}</dd>
    </div>
  );
}
