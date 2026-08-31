'use client';

import React from 'react';
import { Badge, Card, InfoNote, NotRun, PageHeader, Provenance } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api, num } from '../lib/api';
import { isArtifactMissing } from '../lib/types';

export default function FidelityLabPage() {
  const { data, loading } = useArtifact(() => api.fidelity(), []);
  if (loading) return <p className="text-xs text-slate-400">Loading fidelity report…</p>;

  const meta = data?.metadata;
  const anchors = data?.anchors ?? {};
  const notRun = meta?.overall_status?.includes('NOT RUN');

  return (
    <>
      <PageHeader
        title="Fidelity Lab"
        description="Statistical comparison of the synthetic generator against public real-world transaction datasets. The datasets are licensed and are not redistributed here, so this page shows exactly what did and did not run."
      >
        <Badge tone={notRun ? 'amber' : 'green'}>{meta?.overall_status ?? 'unknown'}</Badge>
      </PageHeader>

      {isArtifactMissing(data) ? (
        <NotRun artifact={data ?? null} label="Fidelity report" />
      ) : (
        <>
          <Card title="Claim status" right={<Provenance artifact={data ?? null} />}>
            <p className="text-xs leading-relaxed text-slate-700">{meta?.claim_statement}</p>
            {meta?.how_to_enable && (
              <code className="mt-3 block overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[10px] text-emerald-300">
                {meta.how_to_enable}
              </code>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {Object.entries(anchors).map(([key, anchor]: any) => {
              const loaded = anchor.dataset_status === 'LOADED';
              return (
                <Card
                  key={key}
                  title={anchor.dataset_name}
                  subtitle={loaded ? 'Anchor loaded, metrics computed' : 'Anchor not present'}
                  right={<Badge tone={loaded ? 'green' : 'amber'}>{loaded ? 'RUN' : 'NOT RUN'}</Badge>}
                >
                  {loaded ? (
                    <div className="space-y-3">
                      <MetricRow
                        label="Kolmogorov–Smirnov (amount)"
                        value={num(anchor.metrics?.kolmogorov_smirnov?.statistic, 4)}
                        detail={`p = ${num(anchor.metrics?.kolmogorov_smirnov?.p_value, 6)}`}
                      />
                      <MetricRow
                        label="Correlation distance"
                        value={num(anchor.metrics?.correlation_distance?.normalized_distance, 4)}
                        detail="normalised Frobenius norm"
                      />
                      <MetricRow
                        label="Discriminator ROC-AUC"
                        value={num(anchor.metrics?.discriminator_auc?.discriminator_auc, 4)}
                        detail="0.50 = indistinguishable"
                      />
                      <MetricRow
                        label="TSTR retention"
                        value={num(anchor.metrics?.tstr_transferability?.tstr_retention_ratio, 4)}
                        detail="synthetic-trained ÷ real-trained PR-AUC"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
                      <p className="text-[11px] font-bold text-amber-900">
                        NOT RUN / DATASET UNAVAILABLE
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                        {anchor.metrics?.reason ?? anchor.dataset_status}
                      </p>
                      <p className="mt-2 text-[10px] text-amber-700">
                        No substitute figure is displayed. Run{' '}
                        <code className="font-mono">python scripts/download_anchors.py</code> for
                        the source and licence, then re-run the harness.
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card
            title="Pipeline self-test"
            subtitle="Synthetic split A vs synthetic split B"
          >
            <p className="text-[11px] leading-relaxed text-slate-600">
              {data?.synthetic_internal_consistency?.what_this_measures}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricRow
                label="Internal KS statistic"
                value={num(data?.synthetic_internal_consistency?.internal_ks_statistic, 4)}
                detail="synthetic vs synthetic"
              />
              <MetricRow
                label="Internal discriminator AUC"
                value={num(data?.synthetic_internal_consistency?.internal_discriminator_auc, 4)}
                detail="synthetic vs synthetic"
              />
            </div>
            <div className="mt-3">
              <InfoNote>
                These two numbers prove the statistical machinery executes end to end. They are{' '}
                <strong>not</strong> evidence of real-world realism, and are labelled that way in
                the artifact itself.
              </InfoNote>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function MetricRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-slate-900">{value}</p>
      {detail && <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>}
    </div>
  );
}
