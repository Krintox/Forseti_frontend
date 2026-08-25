'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { AlertOctagon, Link2, Scale, ShieldAlert, ShieldCheck, Waypoints } from 'lucide-react';
import { AttackFlowCanvas } from '../components/AttackFlowCanvas';
import { ArenaControls } from '../components/ArenaControls';
import { EventLog } from '../components/EventLog';
import { EventInspector } from '../components/EventInspector';
import { NodeInspector } from '../components/NodeInspector';
import { VerdictBanner } from '../components/VerdictBanner';
import { Badge, Card, InfoNote, PageHeader } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

function ArenaView() {
  const { events, winner, lastRound, strategy, currentStep, totalSteps, exposure, ceiling, runRound, isRunning, lastError } =
    useArena();
  const firewallVerdicts = lastRound?.firewall_verdicts ?? [];
  const lastFirewall = firewallVerdicts.length ? firewallVerdicts[firewallVerdicts.length - 1] : null;
  const deceptionVerdicts = lastRound?.deception_verdicts ?? [];
  const deceptionDetections = deceptionVerdicts.filter((v) => v.verdict === 'DECEPTION_DETECTED');
  const killChain = lastRound?.kill_chain ?? null;
  const settlementVerdict = lastRound?.settlement_verdict ?? null;
  const [inspected, setInspected] = useState<any>(null);
  const [inspectedNode, setInspectedNode] = useState<string | null>(null);
  const params = useSearchParams();
  const autoStarted = useRef(false);

  // The Attack Simulator hands a vector over in the URL. Start it once the
  // arena is actually mounted, so the request is never in flight across a
  // route change.
  useEffect(() => {
    const wanted = params.get('strategy');
    if (!wanted || autoStarted.current || isRunning) return;
    autoStarted.current = true;
    runRound(Number(params.get('round')) || 2, true, wanted);
  }, [params, runRound, isRunning]);

  const violation = [...events].reverse().find((e) => e.event_type === 'INVARIANT_VIOLATION');
  const containment = [...events].reverse().find((e) => e.event_type === 'POLICY_DECISION');
  const approvedRails = events.filter((e) => e.event_type === 'RAIL_APPROVED');
  const mlEvents = events.filter((e) => e.event_type === 'ML_SCORE');
  const lastMl = mlEvents.length ? mlEvents[mlEvents.length - 1] : null;

  return (
    <>
      <PageHeader
        title="Live Security Arena"
        description="The Red Team executes a real attack against the payment simulator. Every arrow, amount and log line below is produced by a backend event — nothing here is a scripted animation."
      >
        {strategy && (
          <Badge tone="red">
            {strategy.replace(/_/g, ' ')} · step {currentStep}
            {totalSteps ? `/${totalSteps}` : ''}
          </Badge>
        )}
        {winner && (
          <Badge tone={winner === 'BLUE' ? 'green' : winner === 'NONE' ? 'slate' : 'red'}>
            {winner === 'BLUE'
              ? 'Blue team holds'
              : winner === 'NONE'
                ? 'No violation — within authority'
                : 'Red team wins'}
          </Badge>
        )}
      </PageHeader>

      {lastError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {lastError}
        </div>
      )}

      <VerdictBanner />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <div className="order-2 xl:order-1">
          <ArenaControls />
        </div>

        <div className="order-1 space-y-5 xl:order-2">
          <AttackFlowCanvas onNodeClick={(id) => { setInspected(null); setInspectedNode(id); }} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Why each rail said yes" subtitle="The fragmentation the attack exploits">
              {/* Described from the round that actually ran. This copy used to
                  be hardcoded to the cross-rail split ("three legs of ₹4,000"),
                  so it contradicted the rail list directly beneath it for every
                  other vector. */}
              <p className="text-xs leading-relaxed text-slate-600">
                Each adapter enforces only its own limit.{' '}
                {approvedRails.length > 0 ? (
                  <>
                    {approvedRails.length === 1 ? 'This leg of ' : `${approvedRails.length} legs of `}
                    <strong>
                      {Array.from(new Set(approvedRails.map((e) => Number(e.payload?.amount ?? 0))))
                        .map((a) => inr(a))
                        .join(' + ')}
                    </strong>{' '}
                    {approvedRails.length === 1 ? 'is' : 'are'} individually ordinary — every rail
                    below said yes. Whether that is allowed depends on the grant, which only the DTL
                    holds.
                  </>
                ) : (
                  <>
                    A rail sees one transaction against its own ceiling. It cannot see the other
                    rails, and it never sees the non-monetary terms of the delegation.
                  </>
                )}
              </p>
              <div className="mt-3 space-y-2">
                {approvedRails
                  .slice(-4)
                  .map((e) => (
                    <div
                      key={e.event_id}
                      className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                    >
                      <span className="text-[11px] font-bold text-emerald-800">
                        {String(e.payload?.rail ?? '').replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-700">
                        {inr(Number(e.payload?.amount ?? 0))} · approved
                      </span>
                    </div>
                  ))}
                {approvedRails.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                    No rail authorizations yet.
                  </p>
                )}
              </div>
            </Card>

            <Card title="What the DTL saw" subtitle="Aggregate authority across every rail">
              {violation ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <span className="text-[12px] font-black text-rose-700">
                      {violation.payload?.invariant_code}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {violation.payload?.explanation}
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-300">
                    {violation.payload?.invariant_expression}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <Field label="Before" value={inr(violation.payload?.cumulative_before)} />
                    <Field label="Attempted" value={inr(violation.payload?.attempted_amount)} />
                    <Field label="Ceiling" value={inr(violation.payload?.ceiling)} />
                    <Field
                      label="Overshoot"
                      value={inr(violation.payload?.overshoot)}
                      tone="danger"
                    />
                  </dl>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  No invariant violation recorded in this round yet.
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Detection" subtitle="Trained model, scored per transaction">
              {lastMl ? (
                lastMl.payload?.model_loaded ? (
                  <>
                    <p className="font-mono text-3xl font-black text-slate-900">
                      {((lastMl.payload?.probability ?? 0) * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      calibrated fraud probability · backend {lastMl.payload?.backend} · threshold{' '}
                      {lastMl.payload?.threshold}
                    </p>
                    <InfoNote>
                      A low score here is expected and honest: a single cross-rail leg genuinely
                      looks like ordinary spending. That is the measured reason the deterministic
                      DTL invariant exists.
                    </InfoNote>
                  </>
                ) : (
                  <p className="text-xs font-semibold text-amber-700">
                    MODEL NOT TRAINED — no score is shown rather than a placeholder.
                  </p>
                )
              ) : (
                <p className="text-xs text-slate-400">Awaiting first scored transaction.</p>
              )}
            </Card>

            <Card title="Containment" subtitle="Graceful, not a blanket block">
              {containment ? (
                <>
                  <p className="text-xs font-bold text-emerald-700">
                    {String(containment.payload?.action ?? '').split(':')[0]}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                    {containment.payload?.action}
                  </p>
                  <p className="mt-2 text-[10px] font-mono text-slate-500">
                    policy → {containment.payload?.policy}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">No containment action taken yet.</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
            <Card title="Intent Firewall" subtitle="Drift vector, reshaped from the DTL's own proofs">
              {lastFirewall ? (
                <>
                  <div className="flex items-center gap-2">
                    <Waypoints
                      className={`h-4 w-4 ${
                        lastFirewall.verdict === 'HARD_DRIFT'
                          ? 'text-rose-600'
                          : lastFirewall.verdict === 'PARTIAL_DRIFT'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    />
                    <span
                      className={`text-[12px] font-black ${
                        lastFirewall.verdict === 'HARD_DRIFT'
                          ? 'text-rose-700'
                          : lastFirewall.verdict === 'PARTIAL_DRIFT'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      {lastFirewall.verdict}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      score {lastFirewall.overall_drift_score.toFixed(3)}
                    </span>
                  </div>
                  {lastFirewall.violating_dimensions.length > 0 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                      Drifted on{' '}
                      <strong>{lastFirewall.violating_dimensions.join(', ').replace(/_/g, ' ')}</strong>
                      {' '}— every other dimension stayed inside the grant.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Nothing drifted on any dimension this step.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">No transaction evaluated yet.</p>
              )}
            </Card>

            <Card title="Deception Lab" subtitle="Attacks on the agent's own reasoning">
              {deceptionVerdicts.length > 0 ? (
                deceptionDetections.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-rose-600" />
                      <span className="text-[12px] font-black text-rose-700">
                        {deceptionDetections.length} DETECTION{deceptionDetections.length > 1 ? 'S' : ''}
                      </span>
                    </div>
                    {deceptionDetections.flatMap((v) => v.detections).slice(0, 2).map((d, i) => (
                      <p key={i} className="mt-2 text-[11px] leading-relaxed text-slate-700">
                        <strong>{d.type.replace(/_/g, ' ')}</strong>: {d.explanation}
                      </p>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Clean — the agent was not fed a false premise this round.
                  </div>
                )
              ) : (
                <p className="text-xs text-slate-400">No transaction evaluated yet.</p>
              )}
            </Card>

            <Card title="Kill Chain" subtitle="Where this strategy lands in the attack lifecycle">
              {killChain ? (
                <>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <span className="text-[12px] font-black text-slate-900">
                      {killChain.stage?.label ?? 'Unmapped stage'}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <Field
                      label="Detection latency"
                      value={
                        killChain.time_to_detection_ms != null
                          ? `${killChain.time_to_detection_ms.toFixed(0)}ms`
                          : '—'
                      }
                    />
                    <Field label="Chain score" value={killChain.attack_chain_score.toFixed(2)} />
                    <Field
                      label="Exposure prevented"
                      value={inr(killChain.economic_exposure_prevented_inr)}
                      tone={killChain.economic_exposure_prevented_inr > 0 ? 'success' : 'default'}
                    />
                    <Field label="Blast radius" value={killChain.blast_radius_score.toFixed(2)} />
                  </dl>
                </>
              ) : (
                <p className="text-xs text-slate-400">No round scored yet.</p>
              )}
            </Card>

            <Card title="Settlement & Reconciliation" subtitle="Post-authorization lifecycle, not an authority dimension">
              {settlementVerdict ? (
                settlementVerdict.verdict === 'CONFLICT_DETECTED' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-rose-600" />
                      <span className="text-[12px] font-black text-rose-700">
                        {settlementVerdict.conflict_code}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                      {settlementVerdict.observed_mismatch}
                    </p>
                    <p className="mt-2 text-[10px] font-mono text-slate-500">
                      {settlementVerdict.containment_action}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Consistent — every settlement leg this round agrees with the others.
                  </div>
                )
              ) : (
                <p className="text-xs text-slate-400">No transaction evaluated yet.</p>
              )}
            </Card>
          </div>
        </div>

        <div className="order-3 xl:sticky xl:top-6 xl:h-[calc(100vh-7rem)]">
          <EventLog height="" onSelect={(e) => { setInspectedNode(null); setInspected(e); }} />
        </div>
      </div>

      <EventInspector event={inspected} onClose={() => setInspected(null)} />
      <NodeInspector nodeId={inspectedNode} onClose={() => setInspectedNode(null)} />
    </>
  );
}

function Field({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-mono text-[12px] font-bold ${toneClass}`}>{value}</dd>
    </div>
  );
}

export default function ArenaPage() {
  return (
    <Suspense fallback={<p className="text-xs text-slate-400">Loading arena…</p>}>
      <ArenaView />
    </Suspense>
  );
}
