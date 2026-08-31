'use client';

import React from 'react';
import { Card, InfoNote, NotRun, PageHeader, Provenance, Stat } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api, inr, num, pct } from '../lib/api';
import { isArtifactMissing } from '../lib/types';
import { API_BASE } from '../lib/api';

const BASELINE_LABELS: Record<string, string> = {
  rules_only: 'Rules only',
  per_rail_ml: 'Per-rail ML (siloed)',
  ml_without_dtl: 'Global ML, no DTL',
  hybrid_dtl_ml: 'FORSETI hybrid (DTL + ML)',
  dtl_invariant_only: 'DTL invariant (deterministic)',
};

export default function DetectionLabPage() {
  const { data, loading } = useArtifact(() => api.evaluation(), []);
  const metrics = data?.metrics;
  const baselines = data?.baselines;
  const ablation = data?.ablation;

  if (loading) return <p className="text-xs text-slate-400">Loading evaluation artifacts…</p>;

  const m = metrics?.test_metrics;
  const holdout = metrics?.attack_family_holdout;

  return (
    <>
      <PageHeader
        title="Detection Lab"
        description="Every figure on this page is read from artifacts/evaluation/. Models are trained on a chronological split with two attack families withheld from training, then scored on the later, unseen slice."
      />

      {isArtifactMissing(metrics) ? (
        <NotRun artifact={metrics ?? null} label="Training metrics" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="PR-AUC" value={num(m?.pr_auc, 4)} hint="precision-recall AUC" />
            <Stat label="ROC-AUC" value={num(m?.roc_auc, 4)} hint="ranking quality" />
            <Stat label="F1" value={num(m?.f1_score, 4)} hint={`threshold ${m?.threshold}`} />
            <Stat
              label="Recall @0.5% FPR"
              value={num(m?.['recall_at_0.5pct_fpr'], 4)}
              hint="operating point for low-friction review"
            />
            <Stat
              label="Net value saved"
              value={inr(m?.financial_impact?.net_value_saved_inr)}
              hint="fraud caught minus legitimate value blocked"
              tone={m?.financial_impact?.net_value_saved_inr > 0 ? 'success' : 'danger'}
            />
          </div>

          <Card
            title="Model & split provenance"
            subtitle="Exactly what produced the numbers above"
            right={<Provenance artifact={metrics ?? null} />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <dl className="space-y-1.5 text-xs">
                <Row label="Architecture" value={metrics?.model?.architecture} />
                <Row label="Backend" value={`${metrics?.model?.backend} ${metrics?.model?.backend_version}`} />
                <Row label="Features" value={metrics?.dataset?.feature_count} />
                <Row label="Dataset size" value={metrics?.dataset?.n_total?.toLocaleString()} />
                <Row label="Fraud prevalence" value={pct((metrics?.dataset?.fraud_prevalence ?? 0) * 100, 2)} />
                <Row label="Calibration" value={metrics?.calibration?.method} />
                <Row
                  label="ECE before → after"
                  value={`${metrics?.calibration?.ece_before_calibration} → ${metrics?.calibration?.ece_after_calibration}`}
                />
              </dl>
              <div className="space-y-2">
                {metrics?.split_periods &&
                  Object.entries(metrics.split_periods).map(([name, p]: any) => (
                    <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        {name} · n={p.n?.toLocaleString()} · prevalence {pct(p.prevalence * 100, 2)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        {String(p.start).slice(0, 19)} → {String(p.end).slice(0, 19)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {holdout && (
            <Card
              title="Attack-family holdout"
              subtitle="These families were removed from training entirely"
            >
              <p className="text-xs leading-relaxed text-slate-600">{holdout.note}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(holdout.per_family ?? {}).map(([fam, res]: any) => (
                  <div key={fam} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[11px] font-black text-slate-800">{fam.replace(/_/g, ' ')}</p>
                    {res.status ? (
                      <p className="mt-1 text-[11px] text-amber-700">{res.status}</p>
                    ) : (
                      <dl className="mt-2 space-y-1 text-[11px]">
                        <Row label="PR-AUC" value={num(res.pr_auc, 4)} />
                        <Row label="Recall @0.5" value={num(res['recall_at_threshold_0.5'], 4)} />
                        <Row label="Mean score" value={num(res.mean_score, 4)} />
                        <Row label="Attack rows" value={res.n_attack_rows} />
                      </dl>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <InfoNote>
                  A near-zero score on <strong>CROSS_RAIL_SPLIT</strong> is the expected and
                  scientifically important result: a single leg of a split is indistinguishable from
                  ordinary spending when scored alone. This is the measured justification for the
                  deterministic DTL invariant rather than a weakness we hide.
                </InfoNote>
              </div>
            </Card>
          )}
        </>
      )}

      {isArtifactMissing(baselines) ? (
        <NotRun artifact={baselines ?? null} label="Baseline benchmark" />
      ) : (
        <Card
          title="Four-architecture baseline comparison"
          subtitle="Same temporal split, same test slice, all retrained"
          right={<Provenance artifact={baselines ?? null} />}
        >
          <BaselineTable
            title="Condition A. Cross-rail split & revocation flood held out of training"
            block={baselines?.condition_attack_family_holdout?.baselines ?? baselines?.baselines}
          />
          <div className="mt-6">
            <BaselineTable
              title="Condition B, every attack family seen in training"
              block={baselines?.condition_all_families_seen?.baselines}
            />
          </div>
          <CrossRailIntervals headline={baselines?.headline_finding} />

          {baselines?.measured_dtl_lift && (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">
                Baseline-harness DTL lift
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-blue-900">
                {baselines.measured_dtl_lift.pr_auc_lift >= 0 ? '+' : ''}
                {num(baselines.measured_dtl_lift.pr_auc_lift, 4)} PR-AUC
              </p>
              <p className="mt-1 text-[11px] text-blue-800">
                {baselines.measured_dtl_lift.definition}
              </p>
              {/* Two DIFFERENT experiments both used to be called "the DTL feature
                  lift", which is how one quantity ended up in the repo with four
                  values. Naming which one this is costs a line and closes it. */}
              <p className="mt-1.5 text-[10px] leading-relaxed text-blue-700">
                This is the <span className="font-bold">baseline-harness</span> lift: two
                separately trained architectures, family-seen condition. It is a different
                measurement from the <span className="font-bold">feature-group</span> lift in the
                ablation below, which removes the DTL feature groups from a single model and
                retrains. Both are real; they are not interchangeable.
              </p>
            </div>
          )}
        </Card>
      )}

      {isArtifactMissing(ablation) ? (
        <NotRun artifact={ablation ?? null} label="Ablation study" />
      ) : (
        <Card
          title="Feature-group ablation"
          subtitle="Each variant retrained from scratch on the identical split"
          right={<Provenance artifact={ablation ?? null} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-bold">Variant</th>
                  <th className="pb-2 font-bold">Features</th>
                  <th className="pb-2 font-bold">PR-AUC</th>
                  <th className="pb-2 font-bold">ROC-AUC</th>
                  <th className="pb-2 font-bold">Recall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(ablation?.variants ?? {}).map(([key, v]: any) => (
                  <tr key={key} className={key === 'A_all_features' ? 'bg-blue-50/60' : ''}>
                    <td className="py-2 font-semibold text-slate-800">{v.variant_name}</td>
                    <td className="py-2 font-mono text-slate-600">{v.feature_count}</td>
                    <td className="py-2 font-mono font-bold text-slate-900">{num(v.pr_auc, 4)}</td>
                    <td className="py-2 font-mono text-slate-600">{num(v.roc_auc, 4)}</td>
                    <td className="py-2 font-mono text-slate-600">{num(v.recall, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(ablation?.measured_dtl_feature_lift || ablation?.measured_graph_feature_lift) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ablation?.measured_dtl_feature_lift && (
                <LiftCallout
                  label="Measured DTL feature lift"
                  lift={ablation.measured_dtl_feature_lift}
                />
              )}
              {ablation?.measured_graph_feature_lift && (
                <LiftCallout
                  label="Measured graph feature lift"
                  lift={ablation.measured_graph_feature_lift}
                />
              )}
            </div>
          )}

          <div className="mt-4">
            <img
              src={`${API_BASE.replace(/\/$/, '')}/../artifacts/evaluation/ablation_pr_auc.png`}
              alt=""
              className="hidden"
            />
            <InfoNote>
              Removing the semantic group can <em>raise</em> PR-AUC under the holdout condition.
              That is a real result, not a bug: semantic-drift features fit the laundering family
              strongly and generalise less well to families the model never saw. We report it rather
              than tuning it away.
            </InfoNote>
          </div>
        </Card>
      )}
    </>
  );
}

function LiftCallout({ label, lift }: { label: string; lift: any }) {
  const positive = (lift.lift ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-lg font-black tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : ''}{num(lift.lift, 4)} PR-AUC
        <span className="ml-2 text-xs font-semibold text-slate-500">
          ({positive ? '+' : ''}{num(lift.relative_lift_pct, 2)}%)
        </span>
      </p>
      <p className="mt-1 text-[10px] text-slate-500">{lift.definition}</p>
    </div>
  );
}

function BaselineTable({ title, block }: { title: string; block: any }) {
  if (!block) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-bold">Architecture</th>
              <th className="pb-2 font-bold">PR-AUC</th>
              <th className="pb-2 font-bold">Recall</th>
              <th className="pb-2 font-bold">FPR</th>
              <th className="pb-2 font-bold">Cross-rail recall</th>
              <th className="pb-2 font-bold">p99 latency</th>
              <th className="pb-2 font-bold">Net value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(block).map(([key, v]: any) => {
              const highlight = key === 'hybrid_dtl_ml' || key === 'dtl_invariant_only';
              return (
                <tr key={key} className={highlight ? 'bg-blue-50/60' : ''}>
                  <td className={`py-2 ${highlight ? 'font-bold text-blue-900' : 'text-slate-700'}`}>
                    {BASELINE_LABELS[key] ?? key}
                  </td>
                  <td className="py-2 font-mono font-bold">{num(v.pr_auc, 4)}</td>
                  <td className="py-2 font-mono">{num(v.recall, 4)}</td>
                  <td className="py-2 font-mono">{num(v.false_positive_rate, 4)}</td>
                  <td className="py-2 font-mono">
                    {v.per_family_recall?.CROSS_RAIL_SPLIT?.recall !== undefined
                      ? num(v.per_family_recall.CROSS_RAIL_SPLIT.recall, 3)
                      : '-'}
                  </td>
                  <td className="py-2 font-mono">{v.latency ? `${num(v.latency.p99_ms, 3)} ms` : '-'}</td>
                  <td className="py-2 font-mono">{inr(v.financial_impact?.net_value_saved_inr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono font-semibold text-slate-800">{value ?? '-'}</dd>
    </div>
  );
}


/**
 * The cross-rail slice is 64 transactions. Showing five recalls to four decimal
 * places on a sample that size invites the reader to resolve differences the
 * data cannot support - which is exactly what happened: a 0.016 gap was read as
 * proven generalisation in the README headline for a while.
 *
 * So the intervals are on screen next to the numbers, and each comparison is
 * labelled with whether it survives them.
 */
function CrossRailIntervals({ headline }: { headline: any }) {
  const ci = headline?.cross_rail_split_recall_ci95;
  if (!ci?.held_out) return null;

  const LABELS: Record<string, string> = {
    rules_only: 'Rules only',
    per_rail_ml: 'Per-rail ML (siloed)',
    ml_without_dtl: 'Global ML, no DTL features',
    hybrid_dtl_ml: 'Hybrid ML + DTL features',
    dtl_invariant_only: 'Deterministic DTL invariant',
  };

  const overlaps = (a: any, b: any) =>
    !a || !b ? true : a.ci95[0] <= b.ci95[1] && b.ci95[0] <= a.ci95[1];

  const withDtl = ci.held_out.hybrid_dtl_ml;
  const withoutDtl = ci.held_out.ml_without_dtl;
  const seenHybrid = ci.seen?.hybrid_dtl_ml;

  const separationReal = withDtl && withoutDtl && !overlaps(withDtl, withoutDtl);
  const generalisationResolvable = withDtl && seenHybrid && !overlaps(withDtl, seenHybrid);
  const n = withDtl?.n;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
        Cross-rail recall with 95% confidence intervals
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
        {ci.method}
        {n ? ` · n=${n} held-out cross-rail transactions` : ''}. {ci.why}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-bold">Architecture</th>
              <th className="pb-2 font-bold">Recall (held out)</th>
              <th className="pb-2 font-bold">95% CI</th>
              <th className="pb-2 font-bold">Caught</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(ci.held_out).map(([key, band]: any) => (
              <tr key={key} className={key === 'dtl_invariant_only' ? 'bg-blue-50/60' : ''}>
                <td className="py-2 font-semibold text-slate-800">{LABELS[key] ?? key}</td>
                <td className="py-2 font-mono font-bold text-slate-900">{band.recall.toFixed(4)}</td>
                <td className="py-2 font-mono text-slate-600">
                  [{band.ci95[0].toFixed(3)}, {band.ci95[1].toFixed(3)}]
                </td>
                <td className="py-2 font-mono text-slate-500">
                  {band.caught}/{band.n}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-2">
        <Verdict
          holds={Boolean(separationReal)}
          yes="Aggregate feature vs no aggregate feature: intervals do not overlap, this separation is real."
          no="Aggregate feature vs no aggregate feature: intervals overlap. This run does not establish the separation."
        />
        <Verdict
          holds={!generalisationResolvable}
          yes={`Hybrid ML held-out vs seen: intervals overlap at n=${n}, so this table does NOT prove the classifier generalises to an unseen family. We do not claim it does.`}
          no={`Hybrid ML held-out vs seen: now separable at n=${n}, the classifier measurably lost ground on the unseen family.`}
          neutralWhenTrue
        />
        <p className="text-[11px] leading-relaxed text-slate-600">
          <span className="font-bold">The invariant&apos;s two columns are equal by construction</span>{' '}
         , an identity, not a measurement that happened to come out even. That is the property no
          sample size can take away, and it is the claim.
        </p>
      </div>
    </div>
  );
}

function Verdict({
  holds,
  yes,
  no,
  neutralWhenTrue = false,
}: {
  holds: boolean;
  yes: string;
  no: string;
  neutralWhenTrue?: boolean;
}) {
  const tone = holds
    ? neutralWhenTrue
      ? 'border-slate-300 bg-white text-slate-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <p className={`rounded-lg border px-3 py-2 text-[11px] font-semibold leading-relaxed ${tone}`}>
      {holds ? yes : no}
    </p>
  );
}
