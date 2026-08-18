'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useArena } from '../lib/ArenaProvider';
import { SeverityDot } from './ui';
import type { ArenaEvent } from '../lib/types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'attack', label: 'Attack', types: ['ATTACK_STARTED', 'ATTACK_STEP', 'RED_ADAPTATION', 'ROUND_STARTED'] },
  { id: 'rail', label: 'Rails', types: ['RAIL_REQUEST', 'RAIL_APPROVED', 'RAIL_DECLINED'] },
  { id: 'dtl', label: 'DTL', types: ['DTL_EVALUATION', 'DTL_EXPOSURE_UPDATED', 'INVARIANT_VIOLATION'] },
  { id: 'ml', label: 'ML', types: ['ML_SCORE', 'SHAP_EXPLANATION'] },
  {
    id: 'defense',
    label: 'Defense',
    types: ['POLICY_DECISION', 'PARTIAL_AUTH', 'QUARANTINE', 'CAPABILITY_REDUCTION', 'BLUE_ADAPTATION'],
  },
  { id: 'audit', label: 'Audit', types: ['PQC_SIGN', 'PQC_VERIFY'] },
];

/** Every backend event, rendered line by line as it arrives. */
export function EventLog({
  height = 'max-h-[560px]',
  onSelect,
}: {
  height?: string;
  onSelect?: (e: ArenaEvent) => void;
}) {
  const { events } = useArena();
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  const shown = useMemo(() => {
    const def = FILTERS.find((f) => f.id === filter);
    if (!def || !def.types) return events;
    return events.filter((e) => def.types!.includes(e.event_type));
  }, [events, filter]);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [shown.length, autoScroll]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">
              Live Backend Event Log
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {events.length} events streamed · click any line to explain it
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3 accent-blue-600"
            />
            Follow
          </label>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-2 ${height}`}>
        {shown.length === 0 ? (
          <p className="px-2 py-8 text-center text-[11px] text-slate-400">
            No events yet. Launch an attack to see the backend stream in real time.
          </p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {shown.map((e, i) => (
                <motion.li
                  key={e.event_id || `idx_${e.sequence ?? ''}_${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect?.(e)}
                    aria-label={`Explain ${e.event_type}`}
                    className="w-full rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                  <div className="flex items-start gap-2">
                    <SeverityDot severity={e.severity} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {e.event_type}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] text-slate-400">
                          {e.offset_ms !== undefined
                            ? `+${(e.offset_ms / 1000).toFixed(2)}s`
                            : new Date(e.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-[11px] font-medium leading-snug text-slate-800">
                        {e.arrow_label || e.payload?.description || e.actor}
                      </p>
                      <EventDetail event={e} />
                    </div>
                  </div>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </ul>
        )}
      </div>
    </div>
  );
}

/** Shows the numbers behind the headline, so a judge can audit each line. */
function EventDetail({ event }: { event: any }) {
  const p = event.payload ?? {};
  const bits: string[] = [];

  switch (event.event_type) {
    case 'DTL_EVALUATION':
      bits.push(`before ₹${p.exposure_before?.toLocaleString('en-IN')}`);
      bits.push(`+₹${p.transaction_amount?.toLocaleString('en-IN')}`);
      bits.push(`projected ₹${p.projected_exposure?.toLocaleString('en-IN')}`);
      break;
    case 'INVARIANT_VIOLATION':
      bits.push(p.invariant_code);
      if (p.overshoot) bits.push(`over by ₹${p.overshoot?.toLocaleString('en-IN')}`);
      break;
    case 'ML_SCORE':
      bits.push(p.model_loaded ? `p=${p.probability}` : 'model not trained');
      if (p.backend) bits.push(p.backend);
      break;
    case 'SHAP_EXPLANATION':
      bits.push(p.is_genuine_shap ? 'genuine SHAP' : String(p.method ?? 'contribution'));
      break;
    case 'RAIL_APPROVED':
      bits.push(`₹${p.amount?.toLocaleString('en-IN')} on ${p.rail}`);
      break;
    case 'DTL_EXPOSURE_UPDATED':
      bits.push(`headroom ₹${p.headroom_after?.toLocaleString('en-IN')}`);
      bits.push(`${p.utilization_pct}% used`);
      break;
    case 'PQC_SIGN':
      if (p.signature_bytes) bits.push(`${p.signature_bytes}-byte signature`);
      if (p.backend) bits.push(p.backend);
      break;
    case 'RED_ADAPTATION':
      if (p.confidence !== undefined) bits.push(`score ${Number(p.confidence).toFixed(3)}`);
      break;
    default:
      break;
  }

  if (!bits.length) return null;
  return (
    <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{bits.filter(Boolean).join('  ·  ')}</p>
  );
}
