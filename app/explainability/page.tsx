'use client';

import React from 'react';
import { Badge, Card, InfoNote, NotRun, PageHeader, Provenance } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api, num } from '../lib/api';
import { isArtifactMissing } from '../lib/types';
import { useArena } from '../lib/ArenaProvider';

export default function ExplainabilityPage() {
  const { data: explain, loading } = useArtifact(() => api.explainability(), []);
  const { data: metrics } = useArtifact(() => api.metrics(), []);
  const { events } = useArena();

  const shapEvents = events.filter((e) => e.event_type === 'SHAP_EXPLANATION');
  const latestShap = shapEvents.length ? shapEvents[shapEvents.length - 1] : null;
  const ranked: any[] = explain?.shap_global?.ranked ?? [];
  const maxVal = ranked.length ? Math.max(...ranked.map((r) => r.mean_abs_shap)) : 1;

  if (loading) return <p className="text-xs text-slate-400">Loading explanations…</p>;

  return (
    <>
      <PageHeader
        title="Explainability"
        description="Attributions come from shap.TreeExplainer running against the trained model. If genuine SHAP were unavailable the page would say so and label the fallback differently — it would never be called SHAP."
      >
        <Badge tone={explain?.is_genuine_shap ? 'green' : 'amber'}>
          {explain?.is_genuine_shap ? 'Genuine SHAP' : String(explain?.method ?? 'unavailable')}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Method" subtitle="How these numbers are produced">
          <dl className="space-y-1.5 text-xs">
            <Row label="Method" value={explain?.method} />
            <Row label="Genuine SHAP" value={explain?.is_genuine_shap ? 'yes' : 'no'} />
            <Row label="Model backend" value={explain?.detector?.backend} />
            <Row label="Features" value={explain?.detector?.feature_count} />
            <Row label="Rows explained" value={explain?.shap_global?.rows_explained} />
            <Row label="Source experiment" value={explain?.source_experiment} />
          </dl>
          <div className="mt-3">
            <InfoNote>
              SHAP is deliberately kept out of the inline scoring path. The latency benchmark
              measures scoring without it, because a real authorizer computes explanations
              out-of-band rather than on the authorization hot path.
            </InfoNote>
          </div>
        </Card>

        <Card
          title="Global feature importance"
          subtitle="Mean |SHAP value| across the test slice"
          className="lg:col-span-2"
          right={<Provenance artifact={metrics ?? null} />}
        >
          {isArtifactMissing(metrics) || !ranked.length ? (
            <NotRun artifact={metrics ?? null} label="SHAP global importance" />
          ) : (
            <ul className="space-y-1.5">
              {ranked.slice(0, 14).map((row) => (
                <li key={row.feature} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-24 shrink-0 truncate font-mono text-[10px] text-slate-700 sm:w-40 sm:text-[11px] lg:w-56">
                    {row.feature}
                  </span>
                  <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${Math.max(1, (row.mean_abs_shap / maxVal) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-[10px] font-bold text-slate-600 sm:w-20">
                    {num(row.mean_abs_shap, 4)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Latest live transaction explanation"
        subtitle="Per-transaction attribution captured from the arena stream"
      >
        {latestShap ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={latestShap.payload?.is_genuine_shap ? 'green' : 'amber'}>
                {latestShap.payload?.method}
              </Badge>
              {latestShap.payload?.base_value !== undefined && (
                <span className="font-mono text-[10px] text-slate-500">
                  base value {num(latestShap.payload.base_value, 4)}
                </span>
              )}
              <span className="font-mono text-[10px] text-slate-500">
                tx {latestShap.payload?.tx_id}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {(latestShap.payload?.top_features ?? []).map(([feature, value]: [string, number]) => {
                const positive = value >= 0;
                const magnitude = Math.min(
                  100,
                  Math.abs(value) /
                    Math.max(
                      1e-6,
                      Math.max(
                        ...(latestShap.payload?.top_features ?? [['x', 1]]).map((f: any) =>
                          Math.abs(f[1]),
                        ),
                      ),
                    ) *
                    100,
                );
                return (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate font-mono text-[10px] text-slate-700 sm:w-40 sm:text-[11px] lg:w-56">
                      {feature}
                    </span>
                    <div className="flex h-3.5 flex-1 items-center">
                      <div className="flex h-full w-1/2 justify-end">
                        {!positive && (
                          <div
                            className="h-full rounded-l-full bg-emerald-500"
                            style={{ width: `${magnitude}%` }}
                          />
                        )}
                      </div>
                      <div className="h-full w-px bg-slate-300" />
                      <div className="flex h-full w-1/2">
                        {positive && (
                          <div
                            className="h-full rounded-r-full bg-rose-500"
                            style={{ width: `${magnitude}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span
                      className={`w-20 shrink-0 text-right font-mono text-[10px] font-bold ${
                        positive ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {value >= 0 ? '+' : ''}
                      {num(value, 4)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[10px] text-slate-500">
              Red pushes the score toward fraud, green pushes it toward legitimate.
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-400">
            No live explanation yet — run an attack in the Live Arena and it will appear here.
          </p>
        )}
      </Card>
    </>
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
