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

export type AuthorityVector = Record<
  'AMOUNT' | 'PER_TX' | 'RAIL' | 'MERCHANT' | 'PURPOSE' | 'TIME' | 'BENEFICIARY',
  AuthorityDimensionRow
>;

/** A sub-delegation link: who granted a narrowed slice of authority to whom. */
export interface DelegationLinkRow {
  link_id: string;
  grantor: string;
  grantee: string;
  parent_link_id: string | null;
  reserved_pool: number;
  pool_remaining: number;
  permitted_rails: string[];
  permitted_mccs: string[] | null;
  per_transaction_cap: number | null;
  revoked: boolean;
  /** False = forged. Detection is structural, not a self-declared flag. */
  attestation_valid: boolean;
}

export interface ChainViolation {
  tx_id?: string;
  code: string;
  link_id?: string;
  reason?: string;
}

/** What the ACTIVE POLICY changes about the enforced grant (Blue's ladder, made load-bearing). */
export interface PolicyOverlay {
  active_policy: string;
  suspends_all_spend: boolean;
  granted_ceiling: number;
  effective_ceiling: number;
  ceiling_withheld: number;
  granted_per_transaction_cap: number | null;
  effective_per_transaction_cap: number | null;
  requires_sku_attestation: boolean;
}

export interface InvariantRegistryRow {
  code: string;
  /** "authority_dimension" | "policy_state" - INV_08 is a policy state, not an 8th dimension. */
  kind?: string;
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

/** One rung of Blue's escalation ladder, generated from the backend DefensePolicy enum. */
export interface PolicyRung {
  code: string;
  rung: number;
  description: string;
  enforced_effect: string;
}

export interface ArenaState {
  authority_state: AuthorityState;
  authority_vector: AuthorityVector;
  invariant_registry: InvariantRegistryRow[];
  /** Source of truth for the policy ladder - the UI must not hardcode its own copy. */
  policy_ladder: PolicyRung[];
  policy_overlay: PolicyOverlay;
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

/** Agent Intent Firewall: reshapes the DTL's own proofs into a per-dimension drift vector. */
export interface FirewallVerdict {
  tx_id: string;
  overall_drift_score: number;
  drift_breakdown: Record<string, number>;
  violating_dimensions: string[];
  invariant_codes: string[];
  verdict: 'ALLOW' | 'PARTIAL_DRIFT' | 'HARD_DRIFT';
}

/** Deception Lab: attacks on the agent's own reasoning, orthogonal to authority enforcement. */
export interface DeceptionDetection {
  type: string;
  severity: string;
  deceptive_input: string;
  ground_truth_check: string;
  explanation: string;
  proof_id: string;
}

export interface DeceptionVerdict {
  tx_id: string;
  verdict: 'CLEAN' | 'DECEPTION_DETECTED';
  detections: DeceptionDetection[];
  count: number;
}

/** Agentic Payment Kill Chain: which lifecycle stage a strategy lands on, and its score. */
export interface KillChainStage {
  index: number;
  code: string;
  label: string;
  description: string;
}

export interface KillChainScore {
  strategy: string;
  stage: KillChainStage | null;
  detected: boolean;
  contained: boolean;
  /**
   * Wall-clock gap between two PACED events. This measures the presentation
   * timeline, not the engine - the orchestrator deliberately sleeps between
   * steps so a human can follow causality. It is shown for the event log and
   * is NOT a term in attack_chain_score. Real inline latency is in
   * artifacts/benchmark/latency.json (p99 ~0.9 ms).
   */
  wall_clock_to_detection_ms_presentation_paced: number | null;
  /** WHICH step detection landed on - a property of the attack's structure. */
  detected_at_step: number | null;
  steps_attempted: number;
  /** Share of the attempted objective that was stopped. */
  exposure_prevented_share: number;
  earliness_share: number;
  economic_exposure_prevented_inr: number;
  blast_radius_score: number;
  attack_chain_score: number;
  rails_touched: string[];
}

export interface KillChainCoverage {
  total_stages: number;
  stages_reached: number;
  stages_contained: number;
  coverage_pct: number;
  containment_pct_of_reached: number;
  by_stage: { code: string; label: string; attempts: number; contained: number }[];
  unmapped_rounds: number;
}

/** Unified Risk Engine: a composite synthesis of signals other modules already computed, not a new detector. */
export interface UnifiedRisk {
  overall_risk_score: number;
  confidence: number;
  risk_components: {
    /**
     * Five MUTUALLY INDEPENDENT components. An earlier revision averaged five
     * terms of which three were near-deterministic functions of one `detected`
     * boolean; `test_components_are_mutually_independent` now pins that setting
     * one input moves exactly one component.
     */
    authority_breach_severity: number;
    intent_drift_severity: number;
    deception_lab_risk: number;
    ml_anomaly_risk: number;
    structural_integrity_risk: number;
  };
  deterministic_override: boolean;
  weighting: string;
  note: string;
}

/** Settlement Reconciliation Engine: post-authorization lifecycle checks, distinct from DTL invariants and Deception Lab. */
export interface SettlementVerdict {
  verdict: 'CONSISTENT' | 'CONFLICT_DETECTED';
  conflict_code: string | null;
  kill_chain_stage?: string;
  obligation_id?: string;
  leg_tx_ids?: string[];
  leg_summary?: string;
  canonical_expectation?: string;
  observed_mismatch?: string;
  economic_exposure_at_risk?: number;
  explanation?: string;
  containment_action?: string;
  proof_id?: string;
}

export interface RoundResult {
  round_number: number;
  strategy: string;
  dtl_enabled: boolean;
  experiment_id: string;
  step_results: StepResult[];
  firewall_verdicts?: FirewallVerdict[];
  deception_verdicts?: DeceptionVerdict[];
  settlement_verdict?: SettlementVerdict;
  kill_chain?: KillChainScore;
  risk?: UnifiedRisk;
  authority_state: AuthorityState;
  pqc_audit: any;
  pqc_tamper_tests: any;
  winner: 'RED' | 'BLUE' | 'NONE';
  outcome?: 'CONTAINED' | 'UNCHECKED_BREACH' | 'WITHIN_AUTHORITY';
  detected: boolean;
  next_red_plan: any;
  adaptation_history: any[];
  chain_violations?: ChainViolation[];
  delegation_chain?: DelegationLinkRow[];
  events: ArenaEvent[];
}

/** Synthetic tokenized-payment credential (app/tokenization/) - a scoped view onto a DTL delegation, not a second source of authority. */
export interface PaymentToken {
  token_id: string;
  issuer: string;
  agent_id: string;
  principal_id: string;
  authority_id: string;
  scope: string;
  allowed_rails: string[];
  merchant_scope: string[];
  purpose_scope: string;
  amount_ceiling: number;
  per_transaction_limit: number | null;
  issued_at: string;
  expires_at: string;
  status: 'ISSUED' | 'ACTIVE' | 'SCOPED' | 'USED' | 'REVOKED' | 'EXPIRED';
  revocation_state: string | null;
  cumulative_used: number;
  use_count: number;
}

export interface TokenScopeViolation {
  proof_id: string;
  token_id: string;
  tx_id: string | null;
  violation_code: string;
  explanation: string;
}

export interface CampaignResult {
  round_numbers: number[];
  /** What Red ACTUALLY executed. In adaptive mode the planner chooses these. */
  strategies_executed?: string[];
  adaptive?: boolean;
  policy_overlay?: PolicyOverlay;
  rounds: RoundResult[];
  kill_chain_coverage: KillChainCoverage;
  final_active_policy: string;
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
