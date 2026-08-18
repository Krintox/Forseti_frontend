import type { ArenaState, ArtifactEnvelope, AttackVector, RoundResult } from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws/arena';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => req<any>('/api/health'),
  state: () => req<ArenaState>('/api/arena/state'),

  setLimit: (delegated_limit: number) =>
    req<ArenaState>('/api/arena/limit', {
      method: 'POST',
      body: JSON.stringify({ delegated_limit }),
    }),

  reset: (delegated_limit?: number) =>
    req<any>('/api/arena/reset', {
      method: 'POST',
      body: JSON.stringify({ delegated_limit: delegated_limit ?? null }),
    }),

  runRound: (opts: {
    round_number: number;
    dtl_enabled: boolean;
    speed?: number;
    strategy?: string | null;
  }) =>
    req<RoundResult>('/api/arena/round', {
      method: 'POST',
      body: JSON.stringify({ speed: 1.0, strategy: null, ...opts }),
    }),

  events: () => req<{ experiment_id: string; events: any[] }>('/api/arena/events'),
  recordings: () => req<{ recordings: any[] }>('/api/arena/recordings'),
  replay: (id: string) => req<any>(`/api/arena/replay/${id}`),
  demo: () => req<any>('/api/demo/start', { method: 'POST' }),

  metrics: () => req<ArtifactEnvelope>('/api/metrics'),
  evaluation: () =>
    req<{ metrics: ArtifactEnvelope; baselines: ArtifactEnvelope; ablation: ArtifactEnvelope }>(
      '/api/evaluation',
    ),
  fidelity: () => req<ArtifactEnvelope>('/api/fidelity'),
  latency: () => req<ArtifactEnvelope>('/api/benchmark/latency'),
  finalReport: () => req<ArtifactEnvelope>('/api/report/final'),
  explainability: () => req<any>('/api/explainability'),

  attacks: () => req<{ summary: any; vectors: AttackVector[] }>('/api/attacks'),

  pqcStatus: () => req<any>('/api/pqc/status'),
  pqcVerify: (snapshot_payload: any, signature_hex: string | null) =>
    req<any>('/api/pqc/verify', {
      method: 'POST',
      body: JSON.stringify({ snapshot_payload, signature_hex }),
    }),

  feedback: () => req<any>('/api/feedback/history'),

  aiStatus: () => req<any>('/api/ai/status'),
};

/** Indian-format currency, used everywhere amounts are shown. */
export function inr(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function pct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function num(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(decimals);
}
