'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Search } from 'lucide-react';
import { Badge, Button, Card, InfoNote, PageHeader } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api } from '../lib/api';
import { useArena } from '../lib/ArenaProvider';
import type { AttackVector } from '../lib/types';

const ROUND_BY_STRATEGY: Record<string, number> = {
  INTENT_LAUNDERING: 1,
  CROSS_RAIL_SPLIT: 2,
  BASELINE_POISONING: 3,
  REVOCATION_FLOOD: 4,
  VELOCITY_BURST: 5,
  SCOPE_CREEP: 6,
};

export default function AttackSimulatorPage() {
  const { data } = useArtifact(() => api.attacks(), []);
  const { isRunning } = useArena();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('ALL');
  const [surface, setSurface] = useState('ALL');
  const [onlyImplemented, setOnlyImplemented] = useState(false);
  const [severity, setSeverity] = useState('ALL');
  const [agentic, setAgentic] = useState('ALL');

  const vectors: AttackVector[] = data?.vectors ?? [];
  const summary = data?.summary;

  const filtered = useMemo(
    () =>
      vectors.filter((v) => {
        if (onlyImplemented && !v.implemented) return false;
        if (channel !== 'ALL' && !v.channels.includes(channel)) return false;
        if (surface !== 'ALL' && !v.surfaces.includes(surface)) return false;
        if (severity !== 'ALL' && v.severity !== severity) return false;
        if (agentic !== 'ALL' && v.agentic_relevance !== agentic) return false;
        if (query) {
          const q = query.toLowerCase();
          if (
            !v.name.toLowerCase().includes(q) &&
            !v.description.toLowerCase().includes(q) &&
            !v.real_world_basis.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [vectors, query, channel, surface, onlyImplemented, severity, agentic],
  );

  const launch = (v: AttackVector) => {
    if (!v.strategy_key) return;
    // Hand the intent over in the URL. Firing the request from a timer here
    // meant it was in flight while the route unmounted, which aborted it into
    // an unhandled rejection.
    router.push(`/arena?strategy=${encodeURIComponent(v.strategy_key)}&round=${ROUND_BY_STRATEGY[v.strategy_key] ?? 2}`);
  };

  return (
    <>
      <PageHeader
        title="Attack Simulator & Explorer"
        description="The identify layer. 55 researched vectors, nine of which are deeply implemented and executable against the simulator. The distinction is explicit on every card."
      >
        {summary && (
          <>
            <Badge tone="blue">{summary.total_vectors} researched</Badge>
            <Badge tone="green">{summary.implemented_count} executable</Badge>
          </>
        )}
      </PageHeader>

      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="name, mechanism, citation…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <Select label="Channel" value={channel} onChange={setChannel} options={['ALL', ...Object.keys(summary?.channels ?? {})]} labels={summary?.channels} />
          <Select label="Surface" value={surface} onChange={setSurface} options={['ALL', ...Object.keys(summary?.surfaces ?? {})]} labels={summary?.surfaces} />
          <Select label="Severity" value={severity} onChange={setSeverity} options={['ALL', 'CRITICAL', 'HIGH', 'MEDIUM']} />
          <Select label="Agentic relevance" value={agentic} onChange={setAgentic} options={['ALL', 'HIGH', 'MEDIUM', 'LOW']} />
        </div>
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={onlyImplemented}
            onChange={(e) => setOnlyImplemented(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Only executable vectors
        </label>
        <p className="mt-2 text-[11px] text-slate-500">
          Showing {filtered.length} of {vectors.length} vectors.
        </p>
      </Card>

      <InfoNote>{summary?.honesty_note}</InfoNote>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <div
            key={v.id}
            className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
              v.implemented ? 'border-blue-200' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-slate-400">#{v.id}</p>
                <h3 className="mt-0.5 text-[13px] font-bold leading-tight text-slate-900">{v.name}</h3>
              </div>
              {v.flagship && <Badge tone="red">Flagship</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone={v.implemented ? 'green' : 'slate'}>
                {v.implemented ? 'Executable' : 'Research only'}
              </Badge>
              <Badge tone={v.severity === 'CRITICAL' ? 'red' : v.severity === 'HIGH' ? 'amber' : 'slate'}>
                {v.severity}
              </Badge>
              <Badge tone={v.agentic_relevance === 'HIGH' ? 'purple' : 'slate'}>
                agentic {v.agentic_relevance}
              </Badge>
            </div>

            <p className="mt-2.5 line-clamp-4 text-[11px] leading-relaxed text-slate-600">
              {v.description}
            </p>

            {v.real_world_basis && (
              <p className="mt-2 border-l-2 border-slate-200 pl-2 text-[10px] italic leading-snug text-slate-500">
                {v.real_world_basis}
              </p>
            )}

            <div className="mt-auto pt-3">
              {v.implemented ? (
                <>
                  <p className="mb-2 font-mono text-[9.5px] text-slate-500">
                    defeated by {v.defeated_by_invariant}
                  </p>
                  <Button size="sm" variant="danger" disabled={isRunning} onClick={() => launch(v)}>
                    <Play className="h-3 w-3" />
                    Execute in arena
                  </Button>
                </>
              ) : (
                <p className="text-[10px] font-semibold text-slate-400">
                  Identify layer only — not executed by this prototype.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none focus:border-blue-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'ALL' ? 'All' : labels?.[o] ? `${o} — ${labels[o]}` : o}
          </option>
        ))}
      </select>
    </div>
  );
}
