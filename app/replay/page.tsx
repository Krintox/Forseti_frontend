'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Badge, Button, Card, InfoNote, PageHeader } from '../components/ui';
import { AttackFlowCanvas } from '../components/AttackFlowCanvas';
import { useArena } from '../lib/ArenaProvider';
import { api } from '../lib/api';
import { useArtifact } from '../lib/useArtifact';
import type { ArenaEvent } from '../lib/types';

/**
 * Replays a recorded round using the original inter-event timing captured in
 * the JSONL log, so the playback is a faithful reconstruction rather than a
 * re-simulation.
 */
export default function ReplayPage() {
  const { loadReplay, clearEvents, runRound, reset, isRunning } = useArena();
  const { data: recordings, reload } = useArtifact(() => api.recordings(), []);

  const [timeline, setTimeline] = useState<ArenaEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (id: string) => {
    stop();
    const res = await api.replay(id);
    setTimeline(res.events ?? []);
    setSelected(id);
    setCursor(0);
    clearEvents();
  };

  const stop = () => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Drive playback from the recorded offsets.
  useEffect(() => {
    if (!playing || cursor >= timeline.length) {
      if (cursor >= timeline.length) setPlaying(false);
      return;
    }
    const current = timeline[cursor];
    const next = timeline[cursor + 1];
    loadReplay(timeline.slice(0, cursor + 1));

    const gap = next
      ? Math.max(60, ((next.offset_ms ?? 0) - (current.offset_ms ?? 0)) / speed)
      : 400;
    timerRef.current = setTimeout(() => setCursor((c) => c + 1), gap);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, cursor, timeline, speed, loadReplay]);

  const stepForward = () => {
    if (cursor >= timeline.length) return;
    loadReplay(timeline.slice(0, cursor + 1));
    setCursor((c) => c + 1);
  };

  const restart = () => {
    stop();
    setCursor(0);
    clearEvents();
  };

  const runDeterministicDemo = async () => {
    await reset(10000);
    await runRound(2, true, 'CROSS_RAIL_SPLIT');
    await reload();
  };

  const progress = timeline.length ? (cursor / timeline.length) * 100 : 0;
  const currentEvent = timeline[Math.max(0, cursor - 1)];

  return (
    <>
      <PageHeader
        title="Replay & Demo"
        description="Every round is recorded to artifacts/events as JSONL with per-event offsets. Replay reconstructs the round from that log, so what you review is exactly what the backend emitted."
      >
        <Button variant="danger" disabled={isRunning} onClick={runDeterministicDemo}>
          <Play className="h-3.5 w-3.5" />
          Run flagship demo
        </Button>
      </PageHeader>

      <AttackFlowCanvas />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Playback controls">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={playing ? 'ghost' : 'success'}
              disabled={!timeline.length}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button variant="ghost" disabled={!timeline.length} onClick={stepForward}>
              <SkipForward className="h-3.5 w-3.5" />
              Step
            </Button>
            <Button variant="ghost" disabled={!timeline.length} onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </Button>
            <div className="ml-auto flex items-center gap-1">
              {[0.5, 1, 2].map((s) => (
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

          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-500">
              <span>
                event {Math.min(cursor, timeline.length)} / {timeline.length}
              </span>
              <span>
                {currentEvent ? `+${((currentEvent.offset_ms ?? 0) / 1000).toFixed(2)}s` : '-'}
              </span>
            </div>
          </div>

          {currentEvent && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-mono text-[10px] font-bold text-slate-600">
                {currentEvent.event_type} · {currentEvent.actor}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-slate-900">{currentEvent.arrow_label}</p>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[9.5px] leading-relaxed text-emerald-300">
                {JSON.stringify(currentEvent.payload, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4">
            <InfoNote>
              Deterministic mode: the flagship demo runs with seed 42 and a fixed ₹10,000 grant,
              so the same sequence reproduces on every machine.
            </InfoNote>
          </div>
        </Card>

        <Card
          title="Recorded rounds"
          subtitle="artifacts/events/*.jsonl"
          right={
            <Button size="sm" variant="ghost" onClick={reload}>
              Refresh
            </Button>
          }
        >
          {(recordings?.recordings ?? []).length === 0 ? (
            <p className="text-xs text-slate-400">
              No recordings yet. Run an attack, then refresh.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(recordings?.recordings ?? []).slice(0, 12).map((r: any) => (
                <li key={r.experiment_id}>
                  <button
                    type="button"
                    onClick={() => load(r.experiment_id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      selected === r.experiment_id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-mono text-[10px] font-bold text-slate-800">{r.experiment_id}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {r.event_count} events · {new Date(r.modified).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
