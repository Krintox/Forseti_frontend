'use client';

import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, ShieldEllipsis, Wallet } from 'lucide-react';
import { useArena } from '../lib/ArenaProvider';
import { api, inr } from '../lib/api';
import { AnimatedNumber, Badge, Button } from './ui';

const RAIL_OPTIONS = [
  { key: 'CARD_TOKEN', label: 'Card' },
  { key: 'UPI_CIRCLE', label: 'UPI' },
  { key: 'AGENTIC_AP2', label: 'Agentic' },
];

const STRATEGIES = [
  { key: 'CROSS_RAIL_SPLIT', round: 2, label: 'Cross-Rail Split', flagship: true, dimension: 'AMOUNT' },
  { key: 'RAIL_SCOPE_VIOLATION', round: 7, label: 'Unauthorized Rail', dimension: 'RAIL' },
  { key: 'PER_TX_BREACH', round: 8, label: 'Per-Tx Breach', dimension: 'PER_TX' },
  { key: 'INTENT_LAUNDERING', round: 1, label: 'Intent Laundering', dimension: 'PURPOSE' },
  { key: 'SCOPE_CREEP', round: 6, label: 'Scope Creep', dimension: 'MERCHANT' },
  { key: 'LAPSED_MANDATE', round: 9, label: 'Lapsed Mandate', dimension: 'TIME' },
  { key: 'BASELINE_POISONING', round: 3, label: 'Baseline Poisoning', dimension: 'AMOUNT' },
  { key: 'REVOCATION_FLOOD', round: 4, label: 'Revocation Flood', dimension: 'TIME' },
  { key: 'VELOCITY_BURST', round: 5, label: 'Velocity Burst', dimension: 'AMOUNT' },
];

const DIMENSION_TONE: Record<string, string> = {
  AMOUNT: 'text-amber-600',
  RAIL: 'text-purple-600',
  PER_TX: 'text-blue-600',
  PURPOSE: 'text-rose-600',
  MERCHANT: 'text-emerald-600',
  TIME: 'text-slate-600',
};

/**
 * Attack launcher plus the manual delegated-limit control.
 *
 * Changing the limit calls the backend, which recomputes headroom; the exposure
 * meter and every downstream page then reflect the new ceiling immediately.
 */
export function ArenaControls() {
  const { runRound, reset, setLimit, isRunning, ceiling, exposure, headroom, utilization, speed, setSpeed, state, refreshState } =
    useArena();
  const [dtlEnabled, setDtlEnabled] = useState(true);
  // A campaign: any subset of vectors, run back to back against one grant.
  // Selecting several is how you show the Red agent adapting between rounds.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([STRATEGIES[0].key]);
  const [campaignAt, setCampaignAt] = useState<number>(0);
  const [limitInput, setLimitInput] = useState<string>('10000');
  const [applying, setApplying] = useState(false);
  const [selectedRails, setSelectedRails] = useState<string[]>(RAIL_OPTIONS.map((r) => r.key));
  const [applyingScope, setApplyingScope] = useState(false);

  useEffect(() => {
    if (ceiling) setLimitInput(String(Math.round(ceiling)));
  }, [ceiling]);

  useEffect(() => {
    const permitted = state?.authority_state?.permitted_rails;
    if (permitted && permitted.length) setSelectedRails(permitted);
  }, [state?.authority_state?.permitted_rails]);

  const toggleRail = (key: string) =>
    setSelectedRails((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const applyRailScope = async () => {
    if (selectedRails.length === 0) return;
    setApplyingScope(true);
    try {
      await api.setAuthorityScope({ permitted_rails: selectedRails });
      await refreshState();
    } finally {
      setApplyingScope(false);
    }
  };

  const toggle = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const allSelected = selectedKeys.length === STRATEGIES.length;
  const selectAll = () =>
    setSelectedKeys(allSelected ? [STRATEGIES[0].key] : STRATEGIES.map((s) => s.key));

  const runCampaign = async () => {
    const queue = STRATEGIES.filter((s) => selectedKeys.includes(s.key));
    for (let i = 0; i < queue.length; i++) {
      setCampaignAt(i + 1);
      await runRound(queue[i].round, dtlEnabled, queue[i].key);
    }
    setCampaignAt(0);
  };

  const applyLimit = async () => {
    const parsed = Number(limitInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setApplying(true);
    try {
      await setLimit(parsed);
    } finally {
      setApplying(false);
    }
  };

  const breached = ceiling > 0 && exposure > ceiling;

  return (
    <div className="space-y-4">
      {/* delegated authority control */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-blue-600" />
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">
            Delegated Authority
          </h3>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Set the ceiling the user grants the agent. Every rail may individually allow more than
          this; the DTL enforces the total.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Delegated limit (₹)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyLimit()}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-bold tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Button onClick={applyLimit} disabled={applying || isRunning}>
            {applying ? 'Applying' : 'Apply'}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {[5000, 10000, 12000, 20000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setLimitInput(String(v))}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              {inr(v)}
            </button>
          ))}
        </div>

        {/* live deduction readout */}
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Row label="Ceiling" value={inr(ceiling)} />
          <Row
            label="Exposure"
            value={<AnimatedNumber value={exposure} format={(n) => inr(n)} />}
            tone={breached ? 'danger' : 'default'}
          />
          <Row
            label="Headroom"
            value={<AnimatedNumber value={headroom} format={(n) => inr(n)} />}
            tone={headroom <= 0 ? 'danger' : 'success'}
          />
          <div className="pt-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  utilization >= 100 ? 'bg-rose-500' : utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
            <p className="mt-1 text-right font-mono text-[10px] font-bold text-slate-500">
              {utilization.toFixed(1)}% of delegated authority used
            </p>
          </div>
        </div>

        {/* rail scope: the dimension a ceiling alone cannot express */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5">
            <ShieldEllipsis className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
              Permitted rails ("₹{Math.round(ceiling).toLocaleString('en-IN')}, UPI only" model)
            </span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {RAIL_OPTIONS.map((r) => {
              const on = selectedRails.includes(r.key);
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleRail(r.key)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                    on
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full"
            disabled={applyingScope || selectedRails.length === 0}
            onClick={applyRailScope}
          >
            {applyingScope ? 'Applying' : 'Apply rail scope'}
          </Button>
          <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-400">
            The ceiling stays the same; only WHICH rails may spend it changes. A rail outside this
            list is refused before a rupee of headroom is touched.
          </p>
        </div>
      </div>

      {/* attack launcher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">
          Launch Attack
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Runs the real Red Team vector against the live simulator and streams every backend step.
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Vectors ({selectedKeys.length} selected)
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            {allSelected ? 'Clear' : 'Select all'}
          </button>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {STRATEGIES.map((s) => {
            const on = selectedKeys.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[10px] font-bold uppercase leading-tight tracking-wide transition-colors ${
                  on
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border text-[8px] ${
                    on ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span>
                  {s.label}
                  <span className={`mt-1 block text-[8px] font-bold ${DIMENSION_TONE[s.dimension] ?? 'text-slate-500'}`}>
                    {s.flagship ? 'FLAGSHIP · ' : ''}{s.dimension} DIM
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-400">
          Each vector targets one dimension of the delegated authority — amount is only one of six.
        </p>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <p className="text-[11px] font-bold text-slate-700">DTL defense</p>
            <p className="text-[9.5px] text-slate-500">
              {dtlEnabled ? 'Global authority check active' : 'Legacy mode — rails act alone'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDtlEnabled((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              dtlEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                dtlEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase text-slate-500">Speed</label>
          <div className="flex gap-1">
            {[0.25, 0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  speed === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            disabled={isRunning || selectedKeys.length === 0}
            onClick={runCampaign}
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning
              ? campaignAt
                ? `Running ${campaignAt}/${selectedKeys.length}`
                : 'Running'
              : selectedKeys.length > 1
                ? `Execute ${selectedKeys.length} Attacks`
                : 'Execute Attack'}
          </Button>
          <Button variant="ghost" disabled={isRunning} onClick={() => reset(Number(limitInput) || undefined)}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {state?.detector_status && !state.detector_status.model_loaded && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">
            No trained model loaded — ML scores will report NOT TRAINED. Run{' '}
            <code className="font-mono">python -m app.detector.train</code>.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneClass = {
    default: 'text-slate-900',
    danger: 'text-rose-600',
    success: 'text-emerald-600',
  }[tone];
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-mono text-sm font-bold ${toneClass}`}>{value}</span>
    </div>
  );
}
