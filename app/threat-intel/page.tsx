'use client';

import React, { useMemo } from 'react';
import { Badge, Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api } from '../lib/api';
import type { AttackVector } from '../lib/types';

export default function ThreatIntelPage() {
  const { data } = useArtifact(() => api.attacks(), []);
  const vectors: AttackVector[] = data?.vectors ?? [];
  const summary = data?.summary;

  const stats = useMemo(() => {
    const bySeverity: Record<string, number> = {};
    const byAgentic: Record<string, number> = {};
    for (const v of vectors) {
      bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;
      byAgentic[v.agentic_relevance] = (byAgentic[v.agentic_relevance] ?? 0) + 1;
    }
    return { bySeverity, byAgentic };
  }, [vectors]);

  // Executable vectors sort first: without this, a fixed slice(0, 12) below
  // silently drops any implemented vector whose taxonomy id happens to land
  // past position 12 - which is exactly what happened when the three
  // authority-dimension vectors (#53-55) shipped at the end of the table and
  // vanished from this list despite being both HIGH relevance and executable.
  const agenticVectors = vectors
    .filter((v) => v.agentic_relevance === 'HIGH')
    .sort((a, b) => Number(b.implemented) - Number(a.implemented) || a.id - b.id);
  const maxChannel = Math.max(1, ...(Object.values(summary?.count_by_channel ?? {}) as number[]));
  const maxSurface = Math.max(1, ...(Object.values(summary?.count_by_surface ?? {}) as number[]));

  return (
    <>
      <PageHeader
        title="Threat Intelligence"
        description={`Coverage map of the researched attack surface. Every vector carries a real-world citation; the ${
          summary?.implemented_count ?? 'nine'
        } executable ones are marked separately so research breadth is never confused with implemented depth.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Researched vectors" value={summary?.total_vectors ?? '—'} />
        <Stat label="Executable" value={summary?.implemented_count ?? '—'} tone="success" />
        <Stat label="High agentic relevance" value={agenticVectors.length} tone="warning" />
        <Stat label="Critical severity" value={stats.bySeverity.CRITICAL ?? 0} tone="danger" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Coverage by channel">
          <ul className="space-y-2">
            {Object.entries(summary?.count_by_channel ?? {}).map(([code, count]: any) => (
              <li key={code} className="flex items-center gap-3">
                <span className="w-52 shrink-0 truncate text-[11px] font-semibold text-slate-700">
                  {code} — {summary?.channels?.[code]}
                </span>
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    style={{ width: `${(count / maxChannel) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] font-bold text-slate-600">{count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Coverage by attack surface">
          <ul className="space-y-2">
            {Object.entries(summary?.count_by_surface ?? {}).map(([code, count]: any) => (
              <li key={code} className="flex items-center gap-3">
                <span className="w-52 shrink-0 truncate text-[11px] font-semibold text-slate-700">
                  {code} — {summary?.surfaces?.[code]}
                </span>
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600"
                    style={{ width: `${(count / maxSurface) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] font-bold text-slate-600">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Agentic-commerce exposure"
        subtitle="Vectors that only exist because an autonomous agent holds delegated authority"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {agenticVectors.slice(0, 12).map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-bold leading-tight text-slate-900">
                  #{v.id} {v.name}
                </p>
                <Badge tone={v.implemented ? 'green' : 'slate'}>
                  {v.implemented ? 'Executable' : 'Research'}
                </Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-600">
                {v.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <InfoNote>{summary?.honesty_note}</InfoNote>
        </div>
      </Card>
    </>
  );
}
