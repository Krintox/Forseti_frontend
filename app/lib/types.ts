// Shapes mirrored from backend/app/arena/events.py and the REST surface.
// Anything the backend cannot measure arrives as null / a NOT RUN status and
// must be rendered as such, never as a placeholder number.

export type Severity = 'info' | 'success' | 'warning' | 'critical';

export interface ArenaEvent {
  event_id: string;
  sequence: number;
  event_type: string;
  actor: string;
  arrow_label: string;
  source: string | null;
  target: string | null;
  severity: Severity;
  step: number;
  round_id: number;
  experiment_id: string;
  timestamp: string;
  offset_ms?: number;
  payload: Record<string, any>;
}

export interface AuthorityState {
  authority_id: string;
  principal: string;
  agent_id: string;
  global_budget_ceiling: number;
  cumulative_spent_settled: number;
  cumulative_spent_authorized: number;
  pending_spend_global: number;
  reserved_spend_global: number;
  total_exposure_global: number;
  authority_headroom: number;
  utilization_pct: number;
  active_policy: string;
  permitted_mccs: string[];
  semantic_exclusions: string[];
  permitted_rails: string[];
  per_transaction_cap: number | null;
  validity_window_hours: number;
  economic_purpose: string;
}

/** One dimension of the delegated authority - the ceiling is only one row of this. */
export interface AuthorityDimensionRow {
  dimension: string;
  invariant: string;
  label: string;
  granted?: any;
  used?: number;
  remaining?: number;
  unconstrained?: boolean;
  excluded?: string[];
  granted_hours?: number;
  expires_at?: string;
  hours_remaining?: number;
  expired?: boolean;
}

export type AuthorityVector = Record<'AMOUNT' | 'PER_TX' | 'RAIL' | 'MERCHANT' | 'PURPOSE' | 'TIME', AuthorityDimensionRow>;

export interface InvariantRegistryRow {
  code: string;
  dimension: string;
  question: string;
  expression: string;
  severity: string;
}

export interface DetectorStatus {
  model_loaded: boolean;
  model_path: string;
  backend: string;
  feature_count: number;
  load_error: string | null;
  explainability_method: string | null;
  is_genuine_shap: boolean;
}

export interface PqcStatus {
  algorithm: string;
  standard: string;
  available: boolean;
  backend: string | null;
  backend_version: string | null;
  unavailable_reason: string | null;
  public_key_fingerprint: string | null;
  status_label: string;
  key_loaded: boolean;
  signature_bytes: number;
}

export interface ArenaState {
  authority_state: AuthorityState;
  authority_vector: AuthorityVector;
  invariant_registry: InvariantRegistryRow[];
  detector_status: DetectorStatus;
  pqc_status: PqcStatus;
  active_policy: string;
  experiment_id: string;
  is_running: boolean;
  feedback_history: any[];
  event_count: number;
}

export interface StepResult {
  step: number;
  tx: any;
  local_rail_verdict: string;
  dtl_defense_status: string;
  ml_probability: number | null;
  ml_model_loaded: boolean;
  explanation: any;
  proof: any;
  containment: string;
  exposure_before: number;
  exposure_after: number;
  headroom_after: number;
}

export interface RoundResult {
  round_number: number;
  strategy: string;
  dtl_enabled: boolean;
  experiment_id: string;
  step_results: StepResult[];
  authority_state: AuthorityState;
  pqc_audit: any;
  pqc_tamper_tests: any;
  winner: 'RED' | 'BLUE' | 'NONE';
  outcome?: 'CONTAINED' | 'UNCHECKED_BREACH' | 'WITHIN_AUTHORITY';
  detected: boolean;
  next_red_plan: any;
  adaptation_history: any[];
  events: ArenaEvent[];
}

export interface AttackVector {
  id: number;
  name: string;
  channels: string[];
  channel_labels: string[];
  surfaces: string[];
  surface_labels: string[];
  description: string;
  real_world_basis: string;
  implemented: boolean;
  implementation_module: string | null;
  strategy_key: string | null;
  defeated_by_invariant: string | null;
  severity: string;
  agentic_relevance: string;
  flagship: boolean;
  simulation_status: string;
}

/** An artifact response that may legitimately be "not run yet". */
export interface ArtifactEnvelope {
  status?: string;
  path?: string;
  regenerate_with?: string;
  note?: string;
  _artifact?: { status: string; path: string; generated_at: string };
  [key: string]: any;
}

export function isArtifactMissing(a: ArtifactEnvelope | null | undefined): boolean {
  if (!a) return true;
  if (a._artifact?.status === 'LOADED') return false;
  return typeof a.status === 'string' && a.status.includes('NOT RUN');
}

/** Logical nodes the attack-flow canvas can animate between. */
export const FLOW_NODES = [
  'principal',
  'red_agent',
  'card_token',
  'upi_circle',
  'agentic_ap2',
  'rail_authorizer',
  'dtl',
  'ml_detector',
  'cost_governor',
  'pqc_auditor',
  'exposure_meter',
  'quarantine',
  'outcome',
  'explanation_panel',
  'policy',
  'audit_panel',
  'rails',
] as const;

export type FlowNode = (typeof FLOW_NODES)[number];
