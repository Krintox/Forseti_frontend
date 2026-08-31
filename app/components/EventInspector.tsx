'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { ArenaEvent } from '../lib/types';
import { API_BASE, inr } from '../lib/api';
import { Badge } from './ui';

/**
 * Slide-over that explains ONE event: what happened, how, why the actor did it,
 * and why it matters, for both Red and Blue actions.
 *
 * The explanation comes from the AI layer. When no model is reachable the API
 * returns a deterministic template built from the same event fields, and the
 * panel labels which one you are reading. It never shows an empty state and
 * never invents numbers.
 */
export function EventInspector({
  event,
  onClose,
}: {
  event: ArenaEvent | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`${API_BASE}/api/ai/event/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [event]);

  const r = data?.result;
  const team = r?.team ?? 'NEUTRAL';
  const isFallback = data?.status === 'FALLBACK' || r?.source === 'deterministic_template';

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    {event.event_type}
                  </span>
                  <Badge tone={team === 'RED' ? 'red' : team === 'BLUE' ? 'green' : 'slate'}>
                    {team === 'RED' ? 'Red team' : team === 'BLUE' ? 'Blue team' : 'System'}
                  </Badge>
                  {event.step > 0 && <Badge tone="slate">step {event.step}</Badge>}
                </div>
                <h2 className="mt-1.5 text-sm font-bold leading-snug text-slate-900">
                  {r?.headline ?? event.arrow_label}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close explanation"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Explaining this step…
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                  Could not reach the explanation service: {error}
                </p>
              )}

              {r && (
                <div className="space-y-4">
                  <Section
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    title="What happened"
                    body={r.what_happened}
                  />
                  <Section
                    icon={<Bot className="h-3.5 w-3.5" />}
                    title="How it was done"
                    body={r.how_it_was_done}
                  />
                  <Section
                    icon={team === 'RED' ? <Bot className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    title={team === 'RED' ? 'Why the attacker did it' : 'Why the defence did it'}
                    body={r.why_the_actor_did_it}
                  />
                  <Section
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    title="Why it matters"
                    body={r.why_it_matters}
                  />

                  {r.analogy && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        In plain language
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-blue-900">{r.analogy}</p>
                    </div>
                  )}

                  <EventNumbers event={event} />

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold text-slate-600">
                      {isFallback
                        ? 'Deterministic template, no language model was reachable, so this is built from the event fields themselves.'
                        : `Explained by ${data?.llm?.provider ?? 'model'} / ${data?.llm?.model ?? ''}` +
                          (data?.llm?.cached ? ' (cached)' : '')}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Explanations are advisory. The outcome you see was decided by the
                      deterministic engine, not by a language model.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-800">{body}</p>
    </div>
  );
}

/** The raw figures behind the narrative, so the panel is auditable. */
function EventNumbers({ event }: { event: ArenaEvent }) {
  const p = event.payload ?? {};
  const rows: [string, string][] = [];
  const money = (v: any) => (typeof v === 'number' ? inr(v) : null);

  const add = (label: string, value: string | null) => {
    if (value) rows.push([label, value]);
  };

  add('Amount', money(p.amount ?? p.transaction_amount));
  add('Exposure before', money(p.exposure_before ?? p.cumulative_before));
  add('Exposure after', money(p.exposure_after ?? p.total_exposure_after));
  add('Projected', money(p.projected_exposure));
  add('Ceiling', money(p.ceiling ?? p.delegated_ceiling ?? p.global_ceiling));
  add('Headroom after', money(p.headroom_after));
  add('Overshoot', money(p.overshoot));
  if (typeof p.utilization_pct === 'number') add('Utilisation', `${p.utilization_pct}%`);
  if (typeof p.probability === 'number') add('Model probability', p.probability.toFixed(4));
  if (p.invariant_code) add('Invariant', String(p.invariant_code));
  if (p.rail) add('Rail', String(p.rail).replace(/_/g, ' '));
  if (p.backend) add('Backend', String(p.backend));
  if (typeof p.signature_bytes === 'number') add('Signature', `${p.signature_bytes} bytes`);

  // Intent Firewall (drift vector)
  if (typeof p.overall_drift_score === 'number') add('Drift score', p.overall_drift_score.toFixed(3));
  if (Array.isArray(p.violating_dimensions) && p.violating_dimensions.length) {
    add('Drifted dimensions', p.violating_dimensions.join(', '));
  }
  // Deception Lab
  if (Array.isArray(p.detections) && p.detections.length) {
    add('Deception type(s)', p.detections.map((d: any) => d.type).join(', '));
  }
  // Blue escalation ladder
  if (typeof p.violation_count === 'number') add('Repeat count', String(p.violation_count));
  if (typeof p.escalated === 'boolean') add('Escalated', p.escalated ? 'yes' : 'no');
  if (p.active_policy) add('Active policy', String(p.active_policy).replace(/_/g, ' '));

  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-slate-200">
      <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Recorded values
      </p>
      <dl className="divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
            <dt className="text-[11px] text-slate-500">{k}</dt>
            <dd className="font-mono text-[11px] font-bold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-slate-100 px-3 py-1.5 font-mono text-[9px] text-slate-400">
        seq {event.sequence} · +{((event.offset_ms ?? 0) / 1000).toFixed(2)}s · {event.actor}
      </p>
    </div>
  );
}
