export type PaymentRailType = 'CARD_TOKEN' | 'UPI_CIRCLE' | 'AGENTIC_AP2';

export interface CartItem {
  sku: string;
  name: string;
  category: string;
  unit_price: number;
  quantity: number;
  is_stored_value?: boolean;
}

export interface SyntheticTransaction {
  tx_id: string;
  authority_id: string;
  agent_id: string;
  rail: PaymentRailType;
  amount: number;
  currency: string;
  merchant_id: string;
  merchant_name: string;
  merchant_mcc: string;
  items: CartItem[];
  state: string;
  local_rail_status: string;
  local_rail_message: string;
  is_anomalous_red_attack: boolean;
  attack_primitive_type?: string;
  containment_action?: string;
}

export interface SemanticDriftProof {
  proof_id: string;
  authority_id: string;
  tx_id: string;
  timestamp: string;
  invariant_code: string;
  severity: string;
  authorized_intent_summary: string;
  actual_cart_summary: string;
  drift_score: number;
  violated_skus: string[];
  local_rail_statuses: Record<string, string>;
  cumulative_spend_before: number;
  attempted_amount: number;
  global_ceiling: number;
  total_exposure_after: number;
  invariant_expression: string;
  explanation: string;
  pqc_signature_suite: string;
  pqc_signature_bytes_hex: string;
  pqc_verified: boolean;
}

export interface RoundStepResult {
  tx: SyntheticTransaction;
  local_rail_verdict: string;
  dtl_defense_status: string;
  ml_anomaly_prob: number;
  shap_contributions: Record<string, number>;
  proof?: SemanticDriftProof | null;
  containment: string;
  pqc_audit?: any;
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
  total_exposure_global?: number;
  authority_headroom?: number;
  permitted_merchant_scopes: string[];
  permitted_mccs: string[];
  semantic_exclusions: string[];
  active_policy: string;
}

export interface AblationModelVariant {
  model_variant: string;
  pr_auc: number;
  roc_auc: number;
  recall_at_05_fpr: number;
  precision_at_100: number;
  net_inr_saved: string;
  latency_p99_ms: number;
}

export interface SummaryMetrics {
  fraud_loss_prevented_inr: number;
  legitimate_commerce_preserved_inr: number;
  false_positive_rate_pct: number;
  detection_accuracy_pct: number;
  p99_latency_ms: number;
  ablation_matrix: AblationModelVariant[];
}

export interface ArenaStateResponse {
  round_number?: number;
  dtl_enabled?: boolean;
  transactions_processed?: number;
  step_results?: RoundStepResult[];
  authority_state: AuthorityState;
  summary_metrics: SummaryMetrics;
}
