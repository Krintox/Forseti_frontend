import type {
  ArenaState,
  ArtifactEnvelope,
  AttackVector,
  CampaignResult,
  DeceptionVerdict,
  FirewallVerdict,
  KillChainCoverage,
  KillChainScore,
  KillChainStage,
  PaymentToken,
  RoundResult,
  TokenScopeViolation,
} from './types';

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

  setAuthorityScope: (profile: {
    global_budget_ceiling?: number;
    permitted_rails?: string[];
    per_transaction_cap?: number | null;
    permitted_mccs?: string[];
    validity_window_hours?: number;
    economic_purpose?: string;
  }) =>
    req<ArenaState>('/api/arena/authority-scope', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  authorityVector: () => req<any>('/api/arena/authority-vector'),

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

  intentFirewall: () =>
    req<{ verdicts: FirewallVerdict[]; count: number; hard_drift_count: number;
      partial_drift_count: number; allow_count: number }>('/api/arena/intent-firewall'),

  deceptionLab: () =>
    req<{ verdicts: DeceptionVerdict[]; count: number; detected_count: number;
      clean_count: number }>('/api/arena/deception-lab'),

  killChain: () =>
    req<{ stages: KillChainStage[]; last_round: KillChainScore | null;
      session_coverage: KillChainCoverage }>('/api/arena/kill-chain'),

  runCampaign: (opts: { round_numbers?: number[] | null; dtl_enabled?: boolean; speed?: number }) =>
    req<CampaignResult>('/api/arena/campaign', {
      method: 'POST',
      body: JSON.stringify({ dtl_enabled: true, speed: 1.0, round_numbers: null, ...opts }),
    }),

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

  issueToken: (opts: {
    agent_id?: string;
    principal_id?: string;
    scope?: string;
    validity_hours?: number;
    amount_ceiling?: number | null;
    per_transaction_limit?: number | null;
    allowed_rails?: string[] | null;
    merchant_scope?: string[] | null;
    purpose_scope?: string | null;
  }) =>
    req<{ status: string; token: PaymentToken }>('/api/tokens/issue', {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  listTokens: () => req<{ tokens: PaymentToken[] }>('/api/tokens'),
  revokeToken: (token_id: string, reason = 'REVOKED_BY_PRINCIPAL') =>
    req<{ status: string; token: PaymentToken }>(`/api/tokens/${token_id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  useToken: (
    token_id: string,
    opts: { rail: string; amount: number; merchant_id?: string; merchant_name?: string; merchant_mcc?: string; category?: string },
  ) =>
    req<{ status: string; ok: boolean; violation: TokenScopeViolation | null; token: PaymentToken }>(
      `/api/tokens/${token_id}/use`,
      { method: 'POST', body: JSON.stringify(opts) },
    ),
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
